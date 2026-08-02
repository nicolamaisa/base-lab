#!/usr/bin/env sh
set -eu

SCRIPT="scripts/add-auth-keys.mjs"

if command -v node >/dev/null 2>&1; then
  exec node "$SCRIPT" "$@"
fi

echo "Node.js 24 is required to generate asymmetric Auth keys." >&2
exit 1
