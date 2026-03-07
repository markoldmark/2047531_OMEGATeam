import asyncio
import json
import os
import aio_pika
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Permetti tutto per evitare blocchi del browser durante i test [cite: 104, 105]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"],
)

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
latest_state_cache = {}
active_connections = set() # Usiamo un set per gestire meglio le connessioni

async def consume_rabbitmq():
    """Loop di ascolto RabbitMQ [cite: 92, 131]"""
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
                            source = payload.get("source_name")
                            if source:
                                latest_state_cache[source] = payload
                            
                            # Invio immediato ai WebSocket attivi
                            if active_connections:
                                # Creiamo una lista di task per non bloccare il loop
                                await asyncio.gather(*[
                                    ws.send_json(payload) for ws in active_connections
                                ], return_exceptions=True)
        except Exception as e:
            print(f"Errore Broker: {e}")
            await asyncio.sleep(5)

@app.on_event("startup")
async def startup():
    asyncio.create_task(consume_rabbitmq())

@app.get("/api/state")
async def get_state():
    return latest_state_cache

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()  # <--- QUESTO DEVE ESSERCI
    manager.active_connections.append(websocket)
    try:
        # Invia lo stato iniziale
        await websocket.send_json({"type": "INIT_STATE", "data": latest_state_cache})
        while True:
            # Mantieni la connessione aperta ascoltando (anche se non invii nulla dal FE)
            await websocket.receive_text()
    except Exception:
        manager.disconnect(websocket)