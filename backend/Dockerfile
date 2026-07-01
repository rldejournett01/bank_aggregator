FROM python:3.12-alpine

# Non-root runtime user.
RUN addgroup -g 10001 app && adduser -u 10001 -G app -D app

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# Patch OS packages, then add runtime libs: libpq for psycopg2, curl for healthcheck.
RUN apk upgrade --no-cache \
    && apk add --no-cache libpq curl

COPY requirements.txt .
# Build deps are installed only for the pip step, then removed, so any package
# without a musllinux wheel still compiles but the runtime image stays slim.
RUN apk add --no-cache --virtual .build-deps build-base postgresql-dev libffi-dev python3-dev \
    && pip install --no-cache-dir -r requirements.txt \
    && apk del .build-deps

COPY . .
RUN chown -R app:app /app

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=5 \
    CMD curl -fsS http://127.0.0.1:8000/health || exit 1

# Schema is created on startup via SQLAlchemy create_all (see app/main.py).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
