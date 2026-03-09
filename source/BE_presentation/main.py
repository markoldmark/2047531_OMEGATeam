import asyncio
import json
import os
from datetime import datetime, timezone
from urllib import error, request

import aio_pika
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic_models import RuleSchema, RuleStatusUpdate, ActuatorCommand, SystemMode

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
MAX_RULE_HISTORY = 20
DB_CONFIG = {
    "dbname": "mars_iot_db",
    "user": "mars_user",
    "password": "mars_password",
    "host": "db"
}

system_mode = "AUTO"
paused_by_manual = set()
latest_state_cache = {}
active_connections = set()
rule_history_cache = []

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

def append_rule_history(event_payload: dict):
    rule_history_cache.insert(0, event_payload)
    del rule_history_cache[MAX_RULE_HISTORY:]

def send_actuator_command(actuator_name: str, state: str):
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

def get_actuator_states():
    try:
        with request.urlopen(f"{SIMULATOR_URL}/api/actuators", timeout=5) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {"actuators": {}}
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8") or "Actuator state fetch failed"
        raise HTTPException(status_code=exc.code, detail=detail) from exc
    except error.URLError as exc:
        raise HTTPException(status_code=502, detail="Simulator unreachable") from exc

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
                            if payload.get("event_type") == "RULE_TRIGGER":
                                append_rule_history(payload)
                                continue
                            else:
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

async def notify_rule_change():
    try:
        connection = await aio_pika.connect_robust(f"amqp://guest:guest@{RABBITMQ_HOST}/")
        async with connection:
            channel = await connection.channel()
            exchange = await channel.declare_exchange('mars_events', aio_pika.ExchangeType.FANOUT)
            
            payload = {
                "event_type": "RULE_UPDATED",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            await exchange.publish(
                aio_pika.Message(body=json.dumps(payload).encode()),
                routing_key=""
            )
            print("[PRESENTATION] Notifica RULE_UPDATED inviata al broker.")
    except Exception as e:
        print(f"[PRESENTATION] Errore nell'invio della notifica: {e}")

@app.on_event("startup")
async def startup():
    asyncio.create_task(consume_rabbitmq())

@app.get("/api/rules")
async def get_rules():
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
    if system_mode == "MANUAL" and rule.is_active:
        rule.is_active = False
        paused_by_manual.add(rule.rule_id)

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
                rule.rule_id, rule.description, rule.is_active, rule.source_name,
                rule.metric_key, rule.operator, rule.threshold, rule.action_type,
                rule.target, rule.payload
            )
        )
        created_rule = cur.fetchone()
        conn.commit()
        cur.close()

        await notify_rule_change()
        return created_rule
    finally:
        conn.close()

@app.patch("/api/rules/{rule_id}")
async def update_rule(rule_id: str, update: RuleStatusUpdate):
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
            (update.is_active, rule_id)
        )
        updated_rule = cur.fetchone()
        conn.commit()
        cur.close()
    finally:
        conn.close()

    if not updated_rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    await notify_rule_change()
    return updated_rule

@app.delete("/api/rules/{rule_id}")
async def delete_rule(rule_id: str):
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM automation_rules WHERE rule_id = %s", (rule_id,))
        deleted = cur.rowcount
        conn.commit()
        cur.close()
        
        if deleted == 0:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        await notify_rule_change()
        return {"status": "success", "deleted_id": rule_id}
    finally:
        conn.close()

@app.get("/api/history")
async def get_history(limit: int = Query(default=50, ge=1, le=500)):
    return rule_history_cache[:limit]

@app.get("/api/actuators")
async def get_actuators():
    return get_actuator_states()

@app.post("/api/actuators/{actuator_name}")
async def manual_override_actuator(actuator_name: str, command: ActuatorCommand):
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

@app.get("/api/system/mode")
async def get_system_mode():
    return {"mode": system_mode}

@app.post("/api/system/mode")
async def set_system_mode(payload: SystemMode):
    global system_mode, paused_by_manual
    new_mode = payload.mode.upper()
    
    if new_mode not in ["AUTO", "MANUAL"]:
        raise HTTPException(status_code=400, detail="Mode must be AUTO or MANUAL")
        
    if new_mode == system_mode:
        return {"mode": system_mode}
        
    system_mode = new_mode
    
    if system_mode == "MANUAL":
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT rule_id FROM automation_rules WHERE is_active = TRUE")
        active_db_rules = [r["rule_id"] for r in cur.fetchall()]
        
        if active_db_rules:
            cur.execute("UPDATE automation_rules SET is_active = FALSE WHERE rule_id = ANY(%s)", (active_db_rules,))
            conn.commit()
        cur.close()
        conn.close()

        paused_by_manual = set(active_db_rules)
        await notify_rule_change()
        
    else:
        if paused_by_manual:
            paused_list = list(paused_by_manual)

            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("UPDATE automation_rules SET is_active = TRUE WHERE rule_id = ANY(%s)", (paused_list,))
            conn.commit()
            cur.close()
            conn.close()

            paused_by_manual.clear()
            await notify_rule_change()
            
    return {"mode": system_mode}

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)

    try:
        await websocket.send_json({"type": "INIT_STATE", "data": latest_state_cache})
        while True:
            await websocket.receive_text()
            
    except WebSocketDisconnect:
        active_connections.remove(websocket)
    except Exception as e:
        print(f"Errore imprevisto WebSocket: {e}")
        if websocket in active_connections:
            active_connections.remove(websocket)