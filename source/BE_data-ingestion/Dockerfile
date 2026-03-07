# Usiamo un'immagine Python ufficiale e leggera
FROM python:3.11-slim

# Impostiamo la cartella di lavoro dentro il container
WORKDIR /app

# Disabilitiamo il buffer di Python per vedere i print() nei log di Docker in tempo reale
ENV PYTHONUNBUFFERED=1

# Installiamo le librerie necessarie (potresti anche usare un requirements.txt, 
# ma per 4 librerie in un hackathon va benissimo farlo direttamente qui)
RUN pip install --no-cache-dir requests websockets pika aio-pika

# Copiamo i nostri due script nella cartella di lavoro del container
COPY . .

# Il comando magico: avviamo il poller in background (con la &)
# e la telemetria in foreground. In questo modo girano insieme!
CMD ["sh", "-c", "python rest-polling.py & python telemetry-stream.py"]