#!/usr/bin/env bash
# Dos altas simultáneas del mismo DOI desde dos conexiones: tiene que quedar UNA
# publicación (lo asegura el bloqueo por identificador de guardar_registro).
# Uso (Linux con PostgreSQL 16 y pgvector, como root): bash supabase/pruebas/carrera.sh
# No toca ningún proyecto de Supabase.
set -euo pipefail
AQUI="$(cd "$(dirname "$0")" && pwd)"
MIG="${1:-$AQUI/../migrations}"
PRUEBAS="$AQUI"
BIN=/usr/lib/postgresql/16/bin
D=$(mktemp -d /var/tmp/pg-carrera-XXXX); chown postgres "$D"
su postgres -s /bin/bash -c "cd / && $BIN/initdb -D $D/data -A trust -U postgres >/dev/null && $BIN/pg_ctl -D $D/data -o '-p 5498 -k $D -c listen_addresses=' -l $D/log.txt start >/dev/null"
trap 'su postgres -s /bin/bash -c "cd / && $BIN/pg_ctl -D $D/data stop -m fast >/dev/null"' EXIT
P="psql -h $D -p 5498 -U postgres -q -X -v ON_ERROR_STOP=1"
sleep 1
$P -f "$PRUEBAS/0-imitacion-supabase.sql" >/dev/null 2>&1
for m in "$MIG"/*.sql; do $P -f "$m" >/dev/null 2>&1; done
A=$(cat <<'SQL'
set role service_role;
begin;
select guardar_registro('{"proveedor":"openalex","id_externo":"W777","identificadores":{"openalex":"W777","doi":"10.5555/carrera"},"titulo":"Race condition paper","crudo":{"a":1}}'::jsonb);
select pg_sleep(2);
commit;
SQL
)
B=$(cat <<'SQL'
set role service_role;
select guardar_registro('{"proveedor":"europepmc","id_externo":"MED:777","identificadores":{"pmid":"777","europepmc":"MED:777","doi":"10.5555/carrera"},"titulo":"Race condition paper.","crudo":{"b":1}}'::jsonb);
SQL
)
( echo "$A" | $P >/dev/null ) &
sleep 0.5
echo "$B" | $P >/dev/null
wait
$P -A -t -c "select 'publicaciones con ese título: ' || count(*) from publicaciones where titulo_normalizado = 'race condition paper'"
$P -A -t -c "select 'identificadores: ' || count(*) || ' en ' || count(distinct publicacion_id) || ' publicación(es)' from publicacion_identificadores where valor in ('W777','10.5555/carrera','777','MED:777')"
