FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt

RUN pip install --upgrade pip
RUN pip install -r /app/backend/requirements.txt

COPY backend /app/backend
COPY data /app/data
COPY scripts /app/scripts

WORKDIR /app/backend

ENV CSV_PATH=/app/data/processed/market_prices_clean.csv
ENV MODEL_PATH=/app/backend/ml/models/price_models.pkl

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]