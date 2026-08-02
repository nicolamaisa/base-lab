#!/usr/bin/env bash
set -euo pipefail

DB_URL="${DATABASE_URL:?DATABASE_URL is required}"
MIGRATIONS_DIR="${1:-./infra/db/migrations}"

psql "$DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

shopt -s nullglob

files=("$MIGRATIONS_DIR"/*.sql)

if [ ${#files[@]} -eq 0 ]; then
  echo "No migrations found in $MIGRATIONS_DIR"
  exit 0
fi

for file in "${files[@]}"; do
  version="$(basename "$file")"

  already_applied="$(
    psql "$DB_URL" -tAc \
      "SELECT 1 FROM public.schema_migrations WHERE version = '$version' LIMIT 1"
  )"

  if [ "$already_applied" = "1" ]; then
    echo "Skipping $version"
    continue
  fi

  echo "Applying $version"

  psql "$DB_URL" -v ON_ERROR_STOP=1 <<SQL
BEGIN;
\i $file
INSERT INTO public.schema_migrations(version) VALUES ('$version');
COMMIT;
SQL
done