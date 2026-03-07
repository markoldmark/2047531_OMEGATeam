import asyncio
import json
import os
from urllib import error, request

import aio_pika
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
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
SIMULATOR_URL = os.getenv("SIMULATOR_URL", "http://simulator:8080")
MAX_RULE_HISTORY = 50
DB_CONFIG = {
    "dbname": "mars_iot_db",
    "user": "mars_user",
    "password": "mars_password",
    "host": "db"
}

latest_state_cache = {}
active_connections = set()
rule_history_cache = []


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
    is_active: bool = True


class RuleStatusUpdate(BaseModel):
    is_active: bool


class ActuatorCommand(BaseModel):
    state: str


def get_db_connection():
    """Crea una connessione al database delle regole."""
    return psycopg2.connect(**DB_CONFIG)


def send_actuator_command(actuator_name: str, state: str):
    """Invia un comando manuale al simulatore per aggiornare un attuatore."""
    payload = json.dumps({"state": state}).encode("utf-8")
    actuator_request = request.Request(
        f"{SIMULATOR_URL}/api/actuators/{actuator_name}",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with request.urlopen(actuator_request, timeout=5) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {"status": "success"}
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8") or "Actuator command failed"
        raise HTTPException(status_code=exc.code, detail=detail) from exc
    except error.URLError as exc:
        raise HTTPException(status_code=502, detail="Simulator unreachable") from exc

async def consume_rabbitmq():
    """Consuma eventi dal broker, aggiornando stato live e history volatile."""
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
                            if payload.get("event_type") == "RULE_TRIGGER":
                                rule_history_cache.insert(0, payload)
                                del rule_history_cache[MAX_RULE_HISTORY:]
                                continue

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

@app.get("/api/rules")
async def get_rules():
    """Restituisce tutte le regole persistite ordinate per creazione."""
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM automation_rules ORDER BY created_at ASC, id ASC")
        rules = cur.fetchall()
        cur.close()
        return rules
    finally:
        conn.close()

@app.post("/api/rules")
async def create_rule(rule: RuleSchema):
    """Crea una nuova regola persistente nel database."""
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            INSERT INTO automation_rules (
                rule_id, description, is_active, source_name, metric_key,
                operator, threshold, action_type, target, payload
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                rule.rule_id,
                rule.description,
                rule.is_active,
                rule.source_name,
                rule.metric_key,
                rule.operator,
                rule.threshold,
                rule.action_type,
                rule.target,
                rule.payload,
            ),
        )
        created_rule = cur.fetchone()
        conn.commit()
        cur.close()
        return created_rule
    finally:
        conn.close()


@app.patch("/api/rules/{rule_id}")
async def update_rule(rule_id: str, update: RuleStatusUpdate):
    """Attiva o disattiva una regola esistente."""
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            UPDATE automation_rules
            SET is_active = %s, updated_at = CURRENT_TIMESTAMP
            WHERE rule_id = %s
            RETURNING *
            """,
            (update.is_active, rule_id),
        )
        updated_rule = cur.fetchone()
        conn.commit()
        cur.close()
    finally:
        conn.close()

    if not updated_rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    return updated_rule


@app.get("/api/history")
async def get_history(limit: int = Query(default=50, ge=1, le=500)):
    """Restituisce la history dei trigger mantenuta solo in memoria."""
    return rule_history_cache[:limit]


@app.post("/api/actuators/{actuator_name}")
async def manual_override_actuator(actuator_name: str, command: ActuatorCommand):
    """Esegue un manual override su un attuatore tramite il simulatore REST."""
    normalized_state = command.state.upper()
    if normalized_state not in {"ON", "OFF"}:
        raise HTTPException(status_code=400, detail="State must be ON or OFF")

    simulator_response = send_actuator_command(actuator_name, normalized_state)
    return {
        "status": "success",
        "actuator_name": actuator_name,
        "state": normalized_state,
        "simulator_response": simulator_response,
    }

# --- WEBSOCKET ---
@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    active_connections.add(websocket) # Usa il set dichiarato globalmente

    try:
        await websocket.send_json({"type": "INIT_STATE", "data": latest_state_cache})
        while True:
            # Mantieni la connessione aperta ascoltando i messaggi dal frontend
            await websocket.receive_text()
            
    except WebSocketDisconnect:
        # Gestisci la disconnessione pulita rimuovendo il socket dal set
        active_connections.remove(websocket)
    except Exception as e:
        print(f"Errore imprevisto WebSocket: {e}")
        # Rimuovi la connessione in caso di altri errori
        if websocket in active_connections:
            active_connections.remove(websocket)