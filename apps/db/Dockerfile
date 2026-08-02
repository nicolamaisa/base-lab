# Dockerfile for the Database app
FROM postgres:18.3-bookworm

# Installazione pg_cron
RUN apt-get update && \
    apt-get install -y --no-install-recommends postgresql-18-cron && \
    rm -rf /var/lib/apt/lists/*

# Forziamo i permessi sulla root di postgres interna
RUN mkdir -p /var/lib/postgresql && chown -R postgres:postgres /var/lib/postgresql
