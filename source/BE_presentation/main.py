import asyncio
import json
import os
import aio_pika
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List

app = FastAPI(title="Mars IoT Presentation API")

# Abilitiamo i CORS per permettere al Frontend locale di fare richieste a questo backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")

# --- 1. IN-MEMORY STATE CACHE ---
# Qui salveremo l'ultimo stato noto di ogni sensore, come richiesto dal PDF
latest_state_cache = {}

# --- 2. WEBSOCKET CONNECTION MANAGER ---
# Gestisce tutti i client (il frontend) collegati per gli aggiornamenti in tempo reale
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"Nuovo client WebSocket connesso! Totale: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print("Client WebSocket disconnesso.")

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Errore invio a client WS: {e}")

manager = ConnectionManager()

# --- 3. RABBITMQ CONSUMER ---
async def consume_rabbitmq():
    """Ascolta RabbitMQ in background e aggiorna la cache e i client WebSocket."""
    while True:
        try:
            connection = await aio_pika.connect_robust(f"amqp://guest:guest@{RABBITMQ_HOST}/")
            channel = await connection.channel()
            
            # Ci colleghiamo all'exchange fanout creato dall'ingestion
            exchange = await channel.declare_exchange('mars_events', aio_pika.ExchangeType.FANOUT)
            
            # Creiamo una coda temporanea esclusiva per questo servizio
            queue = await channel.declare_queue('', exclusive=True)
            await queue.bind(exchange)
            
            print("BE_presentation in ascolto su RabbitMQ...")
            
            async with queue.iterator() as queue_iter:
                async for message in queue_iter:
                    async with message.process():
                        event = json.loads(message.body.decode())
                        source = event.get("source_name")
                        
                        # Aggiorniamo la cache in memoria con l'ultimo dato
                        if source:
                            latest_state_cache[source] = event
                        
                        # Inviamo l'evento a tutti i frontend connessi
                        await manager.broadcast(event)
                        
        except Exception as e:
            print(f"Errore connessione RabbitMQ nel presentation: {e}. Riprovo in 5s...")
            await asyncio.sleep(5)

# --- 4. API ENDPOINTS ---
@app.on_event("startup")
async def startup_event():
    # Facciamo partire il consumer di RabbitMQ in background quando avviamo FastAPI
    asyncio.create_task(consume_rabbitmq())

@app.get("/api/state")
async def get_current_state():
    """API REST per permettere al frontend di scaricare tutto lo stato iniziale al caricamento della pagina."""
    return latest_state_cache

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    """Endpoint a cui si collegherà il frontend per ricevere il flusso in tempo reale."""
    await manager.connect(websocket)
    # Appena un client si connette, gli inviamo lo stato attuale completo per sincronizzarlo subito
    await websocket.send_json({"type": "INIT_STATE", "data": latest_state_cache})
    try:
        while True:
            # Manteniamo la connessione aperta
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)