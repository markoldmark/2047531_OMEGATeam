import asyncio
import json
import os
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
SIMULATOR_URL = os.getenv("SIMULATOR_URL", "http://simulator:8080")

def fetch_rules():
    """Recupera le regole aggiornate dal DB [cite: 81, 102]"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM automation_rules WHERE is_active = TRUE;")
            return cur.fetchall()
    except Exception as e:
        print(f"[PROCESSOR] Errore DB: {e}")
        return []
    finally:
        if 'conn' in locals(): conn.close()

async def trigger_actuator(actuator, state):
    """Invia comando al simulatore [cite: 57, 103]"""
    url = f"{SIMULATOR_URL}/api/actuators/{actuator}"
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, json={"state": state})
            print(f"[ACTION] {actuator} -> {state} (Status: {resp.status_code})")
        except Exception as e:
            print(f"[ACTION] Errore trigger: {e}")

def evaluate_condition(value, operator, threshold):
    """Valuta la logica della regola [cite: 97]"""
    try:
        val = float(value)
        thr = float(threshold)
        if operator == '>': return val > thr
        if operator == '>=': return val >= thr
        if operator == '<': return val < thr
        if operator == '<=': return val <= thr
        if operator == '==': return val == thr
    except (ValueError, TypeError):
        if operator == '==' or operator == '=': return str(value) == str(threshold)
    return False

async def process_message(message: aio_pika.IncomingMessage):
    """Logica di processing degli eventi"""
    async with message.process():
        event = json.loads(message.body.decode())
        source = event.get("source_name")
        measurements = event.get("measurements", {})

        print(f"[DEBUG] Analisi evento da: {source}")
        
        rules = fetch_rules()
        for rule in rules:
            # CORREZIONE: source_name invece di sensor_name
            if rule['source_name'] == source:
                # Estrazione tramite metric_key dinamica
                current_value = measurements.get(rule['metric_key'])
                
                if current_value is not None:
                    # CORREZIONE: threshold invece di threshold_value
                    if evaluate_condition(current_value, rule['operator'], rule['threshold']):
                        
                        # Gestione azioni
                        if rule['action_type'] == 'ACTUATOR_COMMAND':
                            # CORREZIONE: target e payload
                            await trigger_actuator(rule['target'], rule['payload'])
                            print(f"[RULE TRIGGERED] {rule['rule_id']}: {rule['target']} -> {rule['payload']}")
                        elif rule['action_type'] == 'UI_ALERT':
                            print(f"[UI ALERT] {rule['payload']}")

async def main():
    print(f"[PROCESSOR] Connessione a RabbitMQ: {RABBITMQ_HOST}")
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
                        await process_message(message)
        except Exception as e:
            print(f"[PROCESSOR] Riconnessione tra 5s... ({e})")
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(main())