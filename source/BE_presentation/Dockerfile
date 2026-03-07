FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1

# Installiamo FastAPI, Uvicorn (il server) e il client RabbitMQ
RUN pip install --no-cache-dir fastapi uvicorn aio-pika

COPY . .

# Avviamo Uvicorn sulla porta 8000, accessibile dall'esterno
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]