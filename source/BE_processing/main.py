import asyncio
import json
import os
import uuid
from datetime import datetime, timezone

import httpx
import aio_pika
import psycopg2
from psycopg2.extras import RealDictCursor

# Configurazioni
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
DB_CONFIG = {
    "dbname": "mars_iot_db",
    "user": "mars_user",
    "password": "mars_password",
    "host": "db"
}

APP_STATE = {
    "cached_rules": []
}

SIMULATOR_URL = os.getenv("SIMULATOR_URL", "http://simulator:8080")
rule_activation_state = {}

def get_db_connection():
    """Crea una connessione al database delle regole."""
    return psycopg2.connect(**DB_CONFIG)

def fetch_rules():
    """Recupera solo le regole attive per attuatori dal DB in ordine stabile."""
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT *
                FROM automation_rules
                WHERE is_active = TRUE AND action_type = 'ACTUATOR_COMMAND'
                ORDER BY created_at ASC, id ASC;
                """
            )
            return cur.fetchall()
    except Exception as e:
        print(f"[PROCESSOR] Errore DB: {e}")
        return []
    finally:
        if 'conn' in locals(): conn.close()

async def publish_rule_history(exchange, rule, observed_value):
    """Pubblica sul broker un evento di trigger per la history volatile."""
    payload = {
        "event_type": "RULE_TRIGGER",
        "id": str(uuid.uuid4()),
        "rule_id": rule["rule_id"],
        "source_name": rule["source_name"],
        "metric_key": rule["metric_key"],
        "observed_value": str(observed_value),
        "action_type": rule["action_type"],
        "target": rule["target"],
        "payload": rule["payload"],
        "event_timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await exchange.publish(
        aio_pika.Message(body=json.dumps(payload).encode()),
        routing_key=""
    )

async def trigger_actuator(actuator, state):
    """Invia comando REST al simulatore per aggiornare un attuatore."""
    url = f"{SIMULATOR_URL}/api/actuators/{actuator}"
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, json={"state": state})
            print(f"[ACTION] {actuator} -> {state} (Status: {resp.status_code})")
        except Exception as e:
            print(f"[ACTION] Errore trigger: {e}")

def evaluate_condition(value, operator, threshold):
    """Valuta la condizione di una regola su valori numerici o testuali."""
    try:
        val = float(value)
        thr = float(threshold)
        if operator == '>': return val > thr
        if operator == '>=': return val >= thr
        if operator == '<': return val < thr
        if operator == '<=': return val <= thr
        if operator == '=': return val == thr
    except (ValueError, TypeError):
        if operator == '=': return str(value) == str(threshold)
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


def should_emit_trigger(rule_id, condition_met):
    """Emette un trigger solo sul fronte di attivazione della regola."""
    was_active = rule_activation_state.get(rule_id, False)
    rule_activation_state[rule_id] = condition_met
    return condition_met and not was_active


async def process_message(message: aio_pika.IncomingMessage, exchange):
    """Processa un evento dal broker e valuta le regole compatibili."""
    async with message.process():
        event = json.loads(message.body.decode())
        event_type = event.get("event_type")
        
        # 1. Ignora la history dei trigger
        if event_type == "RULE_TRIGGER":
            return
            
        # 2. Intercetta la notifica dalla Presentation e aggiorna la cache!
        if event_type == "RULE_UPDATED":
            print("[PROCESSOR] 🔄 Ricevuto RULE_UPDATED: Aggiorno la cache delle regole dal DB...")
            APP_STATE["cached_rules"] = fetch_rules()
            return

        # 3. Logica standard per la telemetria (USANDO LA CACHE)
        source = event.get("source_name")
        measurements = event.get("measurements", {})
        
        # Iteriamo sulla lista dentro APP_STATE
        for rule in APP_STATE["cached_rules"]:
            if rule['source_name'] == source:
                current_value = extract_metric_value(measurements, rule['metric_key'])
                
                if current_value is not None:
                    condition_met = evaluate_condition(current_value, rule['operator'], rule['threshold'])
                    if should_emit_trigger(rule['rule_id'], condition_met):
                        await trigger_actuator(rule['target'], rule['payload'])
                        print(f"[RULE TRIGGERED] {rule['rule_id']}: {rule['target']} -> {rule['payload']}")
                        await publish_rule_history(exchange, rule, current_value)

async def main():
    print(f"[PROCESSOR] Connessione a RabbitMQ: {RABBITMQ_HOST}")
    APP_STATE["cached_rules"] = fetch_rules()
    
    while True:
        try:
            connection = await aio_pika.connect_robust(f"amqp://guest:guest@{RABBITMQ_HOST}/")
            async with connection:
                channel = await connection.channel()
                exchange = await channel.declare_exchange('mars_events', aio_pika.ExchangeType.FANOUT)
                queue = await channel.declare_queue('', exclusive=True)
                await queue.bind(exchange)

                print("[PROCESSOR] Sistema pronto. In ascolto...")
                async with queue.iterator() as queue_iter:
                    async for message in queue_iter:
                        await process_message(message, exchange)
        except Exception as e:
            print(f"[PROCESSOR] Riconnessione tra 5s... ({e})")
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(main())