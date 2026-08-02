#!/usr/bin/env sh
set -eu

# 1. Validazione delle variabili obbligatorie per Supabase/Kong
required_variables="
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
ANON_KEY_ASYMMETRIC
SERVICE_ROLE_KEY_ASYMMETRIC
"

for variable in $required_variables; do
  eval "value=\${$variable:-}"

  if [ -z "$value" ]; then
    echo "Missing required Kong variable: $variable" >&2
    exit 1
  fi
done

# 2. Esportazione dell'espressione LUA per la trasformazione dei token/API Key
export LUA_AUTH_EXPR="\$((headers.authorization ~= nil and headers.authorization:sub(1, 10) ~= 'Bearer sb_' and headers.authorization) or (headers.apikey == '$SUPABASE_SECRET_KEY' and 'Bearer $SERVICE_ROLE_KEY_ASYMMETRIC') or (headers.apikey == '$SUPABASE_PUBLISHABLE_KEY' and 'Bearer $ANON_KEY_ASYMMETRIC') or headers.apikey)"

# 3. Gestione del CORS dinamico (opzionale): se definita, sovrascrive la variabile da .env
export KONG_PLUGINS_CORS_CONFIG_ORIGINS="${KONG_PLUGINS_CORS_CONFIG_ORIGINS:-}"

# 4. Sostituzione delle variabili nel template YAML tramite AWK
awk '{
  result = ""
  rest = $0

  while (match(rest, /\$[A-Za-z_][A-Za-z_0-9]*/)) {
    variable = substr(rest, RSTART + 1, RLENGTH - 1)

    if (variable in ENVIRON) {
      result = result substr(rest, 1, RSTART - 1) ENVIRON[variable]
    } else {
      result = result substr(rest, 1, RSTART + RLENGTH - 1)
    }

    rest = substr(rest, RSTART + RLENGTH)
  }

  print result rest
}' /home/kong/kong.template.yml > "${KONG_DECLARATIVE_CONFIG:-/tmp/kong.yml}"

echo "Kong declarative configuration generated successfully."

# 5. Avvio del processo originale di Kong
exec /docker-entrypoint.sh "$@"