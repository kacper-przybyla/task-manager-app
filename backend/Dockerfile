FROM python:3.11-slim

LABEL org.opencontainers.image.title="task-app backend" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.description="Backend for Task App"

RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN groupadd -r appuser && \
    useradd -r -g appuser -u 1001 appuser

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

ENV PYTHONUNBUFFERED=1

COPY . .

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]