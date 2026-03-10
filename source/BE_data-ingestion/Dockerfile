FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1

RUN pip install --no-cache-dir requests websockets pika aio-pika

COPY . .

CMD ["sh", "-c", "python rest-polling.py & python telemetry-stream.py"]