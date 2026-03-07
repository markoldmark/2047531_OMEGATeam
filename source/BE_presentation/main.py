import asyncio
import json
import os
import aio_pika
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"],
)

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
DB_CONFIG = {
    "dbname": "mars_iot_db",
    "user": "mars_user",
    "password": "mars_password",
    "host": "db"
}

latest_state_cache = {}
active_connections = set()

# Modello per la validazione delle regole in ingresso
class RuleSchema(BaseModel):
    rule_id: str
    description: str
    source_name: str
    metric_key: str
    operator: str
    threshold: str
    action_type: str
    target: str
    payload: str

async def consume_rabbitmq():
    while True:
        try:
            connection = await aio_pika.connect_robust(f"amqp://guest:guest@{RABBITMQ_HOST}/")
            async with connection:
                channel = await connection.channel()
                exchange = await channel.declare_exchange('mars_events', aio_pika.ExchangeType.FANOUT)
                queue = await channel.declare_queue('', exclusive=True)
                await queue.bind(exchange)

                async with queue.iterator() as queue_iter:
                    async for message in queue_iter:
                        async with message.process():
                            payload = json.loads(message.body.decode())
                            source = payload.get("source_name")
                            if source:
                                latest_state_cache[source] = payload
                            
                            if active_connections:
                                await asyncio.gather(*[
                                    ws.send_json(payload) for ws in active_connections
                                ], return_exceptions=True)
        except Exception as e:
            print(f"Errore Broker Presentation: {e}")
            await asyncio.sleep(5)

@app.on_event("startup")
async def startup():
    asyncio.create_task(consume_rabbitmq())

# --- ENDPOINT STATO ---
@app.get("/api/state")
async def get_state():
    return latest_state_cache

# --- ENDPOINT REGOLE (Necessari per il Processing) ---
@app.get("/api/rules")
async def get_rules():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM automation_rules")
    rules = cur.fetchall()
    cur.close()
    conn.close()
    return rules

@app.post("/api/rules")
async def create_rule(rule: RuleSchema):
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO automation_rules (rule_id, description, source_name, metric_key, operator, threshold, action_type, target, payload)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (rule.rule_id, rule.description, rule.source_name, rule.metric_key, rule.operator, rule.threshold, rule.action_type, rule.target, rule.payload))
    conn.commit()
    cur.close()
    conn.close()
    return {"status": "success"}

# --- WEBSOCKET ---
@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket) # Usa il set dichiarato globalmente
    try:
        await websocket.send_json({"type": "INIT_STATE", "data": latest_state_cache})
        while True:
            await websocket.receive_text()
    except Exception:
        if websocket in active_connections:
            active_connections.remove(websocket)