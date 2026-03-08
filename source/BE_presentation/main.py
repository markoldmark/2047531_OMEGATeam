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


def build_default_alert_rules():
    """Inizializza le regole alert non persistenti gestite dal presentation."""
    timestamp = datetime.now(timezone.utc).isoformat()
    return [
        {
            "id": None,
            "rule_id": "ALLARME PH SERRA",
            "is_active": True,
            "source_name": "hydroponic_ph",
            "metric_key": "ph",
            "operator": ">",
            "threshold": "9",
            "action_type": "UI_ALERT",
            "target": "greenhouse_ph_warning",
            "payload": "ON",
            "created_at": timestamp,
            "updated_at": timestamp,
        },
        {
            "id": None,
            "rule_id": "ALLARME CICLI AIRLOCK",
            "is_active": True,
            "source_name": "mars/telemetry/airlock",
            "metric_key": "cycles_per_hour",
            "operator": ">",
            "threshold": "10",
            "action_type": "UI_ALERT",
            "target": "airlock_cycles_warning",
            "payload": "ON",
            "created_at": timestamp,
            "updated_at": timestamp,
        }
    ]


latest_state_cache = {}
active_connections = set()
rule_history_cache = []
alert_rules_cache = build_default_alert_rules()
alert_rule_activation_state = {}


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


def append_rule_history(event_payload: dict):
    """Aggiunge un trigger alla history volatile mantenendo il limite massimo."""
    rule_history_cache.insert(0, event_payload)
    del rule_history_cache[MAX_RULE_HISTORY:]


def find_alert_rule(rule_id: str):
    """Recupera una regola alert volatile tramite il suo identificativo."""
    for rule in alert_rules_cache:
        if rule["rule_id"] == rule_id:
            return rule
    return None


def evaluate_condition(value, operator, threshold):
    """Valuta la condizione di una regola su valori numerici o testuali."""
    try:
        val = float(value)
        thr = float(threshold)
        if operator == ">":
            return val > thr
        if operator == ">=":
            return val >= thr
        if operator == "<":
            return val < thr
        if operator == "<=":
            return val <= thr
        if operator in {"=", "=="}:
            return val == thr
        if operator == "!=":
            return val != thr
    except (ValueError, TypeError):
        if operator in {"=", "=="}:
            return str(value) == str(threshold)
        if operator == "!=":
            return str(value) != str(threshold)
    return False


def extract_metric_value(measurements, metric_key):
    """Estrae dinamicamente il valore della metrica dal payload normalizzato."""
    if metric_key in measurements:
        return measurements.get(metric_key)

    nested_measurements = measurements.get("measurements")
    if isinstance(nested_measurements, list):
        for item in nested_measurements:
            metric_name = str(item.get("metric", "")).lower()
            if metric_key.lower() in metric_name:
                return item.get("value")

    return None


def should_emit_alert(rule_id, condition_met):
    """Emette un alert solo sul fronte di attivazione della regola."""
    was_active = alert_rule_activation_state.get(rule_id, False)
    alert_rule_activation_state[rule_id] = condition_met
    return condition_met and not was_active


def build_alert_trigger(rule: dict, observed_value):
    """Costruisce un evento di history per una regola alert volatile."""
    return {
        "event_type": "RULE_TRIGGER",
        "id": f"alert-{datetime.now(timezone.utc).timestamp()}",
        "rule_id": rule["rule_id"],
        "source_name": rule["source_name"],
        "metric_key": rule["metric_key"],
        "observed_value": str(observed_value),
        "action_type": rule["action_type"],
        "target": rule["target"],
        "payload": rule["payload"],
        "event_timestamp": datetime.now(timezone.utc).isoformat(),
    }


def process_alert_rules(event_payload: dict):
    """Valuta le regole alert in memoria a partire dagli eventi in ingresso."""
    source = event_payload.get("source_name")
    measurements = event_payload.get("measurements", {})

    if not source:
        return

    for rule in alert_rules_cache:
        if not rule.get("is_active", True):
            continue
        if rule["source_name"] != source:
            continue

        current_value = extract_metric_value(measurements, rule["metric_key"])
        if current_value is None:
            continue

        condition_met = evaluate_condition(current_value, rule["operator"], rule["threshold"])
        if should_emit_alert(rule["rule_id"], condition_met):
            append_rule_history(build_alert_trigger(rule, current_value))


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


def get_actuator_states():
    """Recupera lo stato corrente degli attuatori dal simulatore."""
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
                                append_rule_history(payload)
                                continue

                            source = payload.get("source_name")
                            if source:
                                latest_state_cache[source] = payload
                                process_alert_rules(payload)
                            
                            if active_connections:
                                await asyncio.gather(*[
                                    ws.send_json(payload) for ws in active_connections
                                ], return_exceptions=True)
        except Exception as e:
            print(f"Errore Broker Presentation: {e}")
            await asyncio.sleep(5)

async def notify_rule_change():
    """Invia un messaggio broadcast per notificare al processing di aggiornare le regole."""
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

# --- ENDPOINT STATO ---
@app.get("/api/state")
async def get_state():
    return latest_state_cache

@app.get("/api/rules")
async def get_rules():
    """Restituisce le regole persistite e gli alert gestiti in memoria."""
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM automation_rules ORDER BY created_at ASC, id ASC")
        rules = cur.fetchall()
        cur.close()
        return rules + alert_rules_cache
    finally:
        conn.close()

@app.post("/api/rules")
async def create_rule(rule: RuleSchema):
    """Crea una regola persistente o un alert volatile in base al tipo azione."""
    if rule.action_type == "UI_ALERT":
        timestamp = datetime.now(timezone.utc).isoformat()
        created_rule = {
            "id": None,
            "rule_id": rule.rule_id,
            "description": rule.description,
            "is_active": rule.is_active,
            "source_name": rule.source_name,
            "metric_key": rule.metric_key,
            "operator": rule.operator,
            "threshold": rule.threshold,
            "action_type": rule.action_type,
            "target": rule.target,
            "payload": rule.payload,
            "created_at": timestamp,
            "updated_at": timestamp,
        }
        alert_rules_cache.append(created_rule)
        alert_rule_activation_state[rule.rule_id] = False

        await notify_rule_change()

        return created_rule

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

        await notify_rule_change()

        return created_rule
    finally:
        conn.close()


@app.patch("/api/rules/{rule_id}")
async def update_rule(rule_id: str, update: RuleStatusUpdate):
    """Attiva o disattiva una regola persistita o un alert volatile."""
    alert_rule = find_alert_rule(rule_id)
    if alert_rule:
        alert_rule["is_active"] = update.is_active
        alert_rule["updated_at"] = datetime.now(timezone.utc).isoformat()
        if not update.is_active:
            alert_rule_activation_state[rule_id] = False

        await notify_rule_change()

        return alert_rule

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
    """Restituisce la history dei trigger mantenuta solo in memoria."""
    return rule_history_cache[:limit]


@app.get("/api/actuators")
async def get_actuators():
    """Restituisce lo stato corrente degli attuatori dal simulatore."""
    return get_actuator_states()


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