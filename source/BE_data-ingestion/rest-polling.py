import time
import uuid
import requests
from datetime import datetime, timezone

# Configurazione di base del simulatore
SIMULATOR_BASE_URL = "http://localhost:8080"
POLLING_INTERVAL = 5 # Secondi tra una lettura e l'altra

# Lista dei sensori REST da interrogare, presi dalla documentazione
REST_SENSORS = [
    "greenhouse_temperature",
    "entrance_humidity",
    "co2_hall",
    "hydroponic_ph",
    "water_tank_level",
    "corridor_pressure",
    "air_quality_pm25",
    "air_quality_voc"
]

def fetch_sensor_data(sensor_id):
    """Esegue il polling del sensore REST."""
    url = f"{SIMULATOR_BASE_URL}/api/sensors/{sensor_id}"
    try:
        response = requests.get(url, timeout=3)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Errore durante il polling di {sensor_id}: {e}")
        return None

def normalize_event(sensor_id, raw_data):
    """
    Converte il payload grezzo nel tuo Standard Event Schema.
    """
    # Creiamo il timestamp in formato ISO 8601
    current_time = datetime.now(timezone.utc).isoformat()
    
    # Costruiamo l'evento rispettando rigorosamente il tuo schema
    event = {
        "event_id": str(uuid.uuid4()),
        "timestamp": current_time,
        "source_type": "REST",
        "source_name": sensor_id,
        "measurements": raw_data, # Passiamo l'oggetto JSON restituito dal sensore
        "status": "ok" # Default, eventualmente aggiornabile in base a logiche specifiche
    }
    return event

def publish_to_broker(event):
    """
    Funzione mock per l'invio al message broker.
    Qui inserirai la logica di Kafka (confluent-kafka) o ActiveMQ/RabbitMQ (pika).
    """
    # TODO: Implementare la connessione e la pubblicazione sul broker
    print(f"-> Pubblicato evento sul broker: {event['source_name']}")
    # print(json.dumps(event, indent=2))

def start_polling():
    """Loop principale di ingestion REST."""
    print("Inizio polling dei sensori REST...")
    while True:
        for sensor in REST_SENSORS:
            raw_data = fetch_sensor_data(sensor)
            if raw_data:
                normalized_event = normalize_event(sensor, raw_data)
                publish_to_broker(normalized_event)
        
        # Pausa prima del prossimo ciclo di polling
        time.sleep(POLLING_INTERVAL)

if __name__ == "__main__":
    start_polling()