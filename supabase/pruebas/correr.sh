#!/usr/bin/env bash
# Prueba las migraciones en un Postgres 16 local, desde cero cada vez.
# Uso (Linux con PostgreSQL 16 instalado, como root): bash supabase/pruebas/correr.sh
# No toca ningún proyecto de Supabase.
set -euo pipefail
AQUI="$(cd "$(dirname "$0")" && pwd)"
BIN=/usr/lib/postgresql/16/bin
D=$(mktemp -d /var/tmp/pg-csl-XXXX); chown postgres "$D"
su postgres -s /bin/bash -c "cd / && $BIN/initdb -D $D/data -A trust -U postgres >/dev/null && $BIN/pg_ctl -D $D/data -o '-p 5499 -k $D -c listen_addresses=' -l $D/log.txt start >/dev/null"
trap 'su postgres -s /bin/bash -c "cd / && $BIN/pg_ctl -D $D/data stop -m fast >/dev/null"; rm -rf "$D"' EXIT
P="psql -h $D -p 5499 -U postgres -q -X -v ON_ERROR_STOP=1"
sleep 1
$P -f "$AQUI/0-imitacion-supabase.sql" 2>&1 | grep -v "wal_level\|HINT" || true
for m in "$AQUI"/../migrations/*.sql; do
  echo "· aplicando $(basename "$m")"
  $P -f "$m" 2>&1 | grep -v "wal_level\|HINT" || true
done
$P -f "$AQUI/1-pruebas-seguridad.sql"
$P -f "$AQUI/3-pruebas-equipo-fichas.sql"
