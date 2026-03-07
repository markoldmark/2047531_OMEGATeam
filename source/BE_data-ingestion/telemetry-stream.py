import asyncio
import websockets
import json
import uuid
from datetime import datetime, timezone

# Configurazione del simulatore per i WebSocket
SIMULATOR_WS_URL = "ws://localhost:8080/api/telemetry/ws"

# Lista dei topic di telemetria presi dal briefing
TELEMETRY_TOPICS = [
    "mars/telemetry/solar_array",
    "mars/telemetry/radiation",
    "mars/telemetry/life_support",
    "mars/telemetry/thermal_loop",
    "mars/telemetry/power_bus",
    "mars/telemetry/power_consumption",
    "mars/telemetry/airlock"
] #

def normalize_event(topic, raw_data):
    """
    Converte il payload della telemetria nel tuo Standard Event Schema.
    """
    current_time = datetime.now(timezone.utc).isoformat()
    
    event = {
        "event_id": str(uuid.uuid4()),
        "timestamp": current_time,
        "source_type": "TELEMETRY", # Identifica che arriva da un flusso pub/sub
        "source_name": topic,       # Usiamo il nome del topic come source_name
        "measurements": raw_data,   # I dati grezzi diventano le nostre misurazioni
        "status": "ok"
    }
    return event

def publish_to_broker(event):
    """
    Funzione mock per l'invio al message broker (Kafka/RabbitMQ).
    """
    # TODO: Implementare il client del message broker
    print(f"[TELEMETRY] -> Pubblicato evento sul broker da: {event['source_name']}")
    # print(json.dumps(event, indent=2))

async def listen_to_topic(topic):
    """
    Si connette a un singolo topic tramite WebSocket e ascolta all'infinito.
    """
    url = f"{SIMULATOR_WS_URL}?topic={topic}"
    
    while True:
        try:
            async with websockets.connect(url) as websocket:
                print(f"Connesso al topic: {topic}")
                async for message in websocket:
                    raw_data = json.loads(message)
                    normalized_event = normalize_event(topic, raw_data)
                    publish_to_broker(normalized_event)
                    
        except websockets.exceptions.ConnectionClosed:
            print(f"Connessione persa per {topic}. Riconnessione in corso...")
            await asyncio.sleep(5)
        except Exception as e:
            print(f"Errore sul topic {topic}: {e}")
            await asyncio.sleep(5)

async def main():
    """
    Avvia contemporaneamente l'ascolto su tutti i topic di telemetria.
    """
    print("Inizio ascolto flussi di telemetria...")
    # Crea un task asincrono per ogni topic
    tasks = [listen_to_topic(topic) for topic in TELEMETRY_TOPICS]
    
    # Esegue tutti i task in parallelo
    await asyncio.gather(*tasks)

if __name__ == "__main__":
    # Avvia l'event loop di asyncio
    asyncio.run(main())