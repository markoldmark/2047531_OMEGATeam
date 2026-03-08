import time
import uuid
import requests
import json
import pika
import os
from datetime import datetime, timezone

SIMULATOR_BASE_URL = os.getenv("SIMULATOR_URL", "http://localhost:8080")
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
POLLING_INTERVAL = 1

REST_SENSORS = [
    "greenhouse_temperature", "entrance_humidity", "co2_hall",
    "hydroponic_ph", "water_tank_level", "corridor_pressure",
    "air_quality_pm25", "air_quality_voc"
]

def get_rabbitmq_channel():
    """Crea la connessione a RabbitMQ e dichiara l'exchange."""
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
    channel = connection.channel()
    channel.exchange_declare(exchange='mars_events', exchange_type='fanout')
    return connection, channel

def fetch_sensor_data(sensor_id):
    url = f"{SIMULATOR_BASE_URL}/api/sensors/{sensor_id}"
    try:
        response = requests.get(url, timeout=3)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"[REST] Errore polling {sensor_id}: {e}")
        return None

def normalize_event(sensor_id, raw_data):
    return {
        "event_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source_type": "REST",
        "source_name": sensor_id,
        "measurements": raw_data,
        "status": "ok"
    }

def start_polling():
    print(f"Avvio REST Poller. Connessione a RabbitMQ su {RABBITMQ_HOST}...")

    while True:
        try:
            connection, channel = get_rabbitmq_channel()
            print("Connesso a RabbitMQ con successo!")
            break
        except pika.exceptions.AMQPConnectionError:
            print("RabbitMQ non ancora pronto. Riprovo in 3 secondi...")
            time.sleep(3)

    while True:
        for sensor in REST_SENSORS:
            raw_data = fetch_sensor_data(sensor)
            if raw_data:
                event = normalize_event(sensor, raw_data)
                channel.basic_publish(
                    exchange='mars_events',
                    routing_key='',
                    body=json.dumps(event)
                )
        
        time.sleep(POLLING_INTERVAL)

if __name__ == "__main__":
    start_polling()