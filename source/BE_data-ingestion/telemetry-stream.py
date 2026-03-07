import asyncio
import websockets
import json
import uuid
import os
import aio_pika
from datetime import datetime, timezone

SIMULATOR_WS_URL = os.getenv("SIMULATOR_WS_URL", "ws://localhost:8080/api/telemetry/ws")
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")

TELEMETRY_TOPICS = [
    "mars/telemetry/solar_array", "mars/telemetry/radiation",
    "mars/telemetry/life_support", "mars/telemetry/thermal_loop",
    "mars/telemetry/power_bus", "mars/telemetry/power_consumption",
    "mars/telemetry/airlock"
]

def normalize_event(topic, raw_data):
    return {
        "event_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source_type": "TELEMETRY",
        "source_name": topic,
        "measurements": raw_data,
        "status": "ok"
    }

async def get_rabbitmq_exchange():
    """Connessione asincrona a RabbitMQ."""
    while True:
        try:
            connection = await aio_pika.connect_robust(f"amqp://guest:guest@{RABBITMQ_HOST}/")
            channel = await connection.channel()
            exchange = await channel.declare_exchange('mars_events', aio_pika.ExchangeType.FANOUT)
            print("Connesso a RabbitMQ con successo!")
            return exchange
        except Exception as e:
            print(f"RabbitMQ non pronto. Riprovo in 3 secondi... Errore: {e}")
            await asyncio.sleep(3)

async def listen_to_topic(topic, exchange):
    url = f"{SIMULATOR_WS_URL}?topic={topic}"
    
    while True:
        try:
            async with websockets.connect(url) as websocket:
                print(f"[WS] Connesso al topic: {topic}")
                async for message in websocket:
                    raw_data = json.loads(message)
                    event = normalize_event(topic, raw_data)
                    
                    # Pubblica il messaggio asincronamente
                    await exchange.publish(
                        aio_pika.Message(body=json.dumps(event).encode()),
                        routing_key=""
                    )
                    
        except websockets.exceptions.ConnectionClosed:
            print(f"Connessione persa per {topic}. Riconnessione...")
            await asyncio.sleep(5)
        except Exception as e:
            print(f"Errore su {topic}: {e}")
            await asyncio.sleep(5)

async def main():
    print(f"Avvio Telemetry Streamer. Connessione a RabbitMQ su {RABBITMQ_HOST}...")
    exchange = await get_rabbitmq_exchange()
    
    tasks = [listen_to_topic(topic, exchange) for topic in TELEMETRY_TOPICS]
    await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(main())