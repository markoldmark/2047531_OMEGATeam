FROM python:3.11-slim

WORKDIR /app

# Installazione dipendenze per Postgres
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir aio-pika httpx psycopg2-binary pydantic

COPY . .

CMD ["python", "main.py"]