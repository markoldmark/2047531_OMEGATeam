import asyncio
import json
import os
import httpx
import aio_pika
import psycopg2
from psycopg2.extras import RealDictCursor

# Configurazioni da ambiente
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
DB_CONFIG = {
    "dbname": "mars_iot_db",
    "user": "mars_user",
    "password": "mars_password",
    "host": "db"
}
SIMULATOR_URL = os.getenv("SIMULATOR_URL", "http://simulator:8080")

def fetch_rules():
    """Recupera le regole dal database Postgres [cite: 81, 102]"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM automation_rules;")
            return cur.fetchall()
    except Exception as e:
        print(f"[PROCESSOR] Errore DB: {e}")
        return []
    finally:
        if 'conn' in locals(): conn.close()

async def trigger_actuator(actuator, state):
    """Invia il comando POST al simulatore [cite: 57, 103]"""
    url = f"{SIMULATOR_URL}/api/actuators/{actuator}"
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, json={"state": state})
            print(f"[ACTION] {actuator} -> {state} (Status: {resp.status_code})")
        except Exception as e:
            print(f"[ACTION] Errore trigger: {e}")

def evaluate_condition(value, operator, threshold):
    """Valuta la logica IF [cite: 97]"""
    try:
        val = float(value)
        thr = float(threshold)
        if operator == '>': return val > thr
        if operator == '>=': return val >= thr
        if operator == '<': return val < thr
        if operator == '<=': return val <= thr
        if operator == '=': return val == thr
    except (ValueError, TypeError):
        # Gestione per stringhe (es. stato airlock)
        if operator == '=': return str(value) == str(threshold)
    return False

async def process_message(message: aio_pika.IncomingMessage):
    async with message.process():
        payload = json.loads(message.body.decode())
        source = payload.get("source_name")
        measurements = payload.get("measurements", {})
        
        # Carica le regole correnti 
        rules = fetch_rules()
        
        for rule in rules:
            # Verifica se la regola è per questo sensore
            if rule['sensor_name'] == source:
                # Estrai il valore (gestisce scalar e oggetti complessi)
                # Nota: per sensori chemistry/particulate serve logica extra per la chiave metrica
                metric_val = measurements.get('value') or measurements.get('pm25_ug_m3') or measurements.get('level_pct')
                
                if metric_val is not None:
                    if evaluate_condition(metric_val, rule['operator'], rule['threshold_value']):
                        await trigger_actuator(rule['actuator_name'], rule['actuator_state'])

async def main():
    # Connessione RabbitMQ [cite: 112]
    connection = await aio_pika.connect_robust(f"amqp://guest:guest@{RABBITMQ_HOST}/")
    channel = await connection.channel()
    exchange = await channel.declare_exchange('mars_events', aio_pika.ExchangeType.FANOUT)
    queue = await channel.declare_queue('', exclusive=True)
    await queue.bind(exchange)

    print("[PROCESSOR] In ascolto per eventi...")
    await queue.consume(process_message)
    await asyncio.Future() # Mantieni in esecuzione

if __name__ == "__main__":
    asyncio.run(main())