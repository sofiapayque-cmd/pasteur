#!/usr/bin/env bash
# Ingreso de alumnos: 30 intentos A LA VEZ (30 conexiones), como una clase
# entera tocando "Entrar" al mismo tiempo.
#   · 30 intentos contra el MISMO usuario → tienen que pasar exactamente 5.
#   · 30 alumnos distintos → tienen que pasar los 30.
# Uso (Linux con PostgreSQL 16 y pgvector, como root): bash supabase/pruebas/carrera-ingreso.sh
# No toca ningún proyecto de Supabase.
set -euo pipefail
AQUI="$(cd "$(dirname "$0")" && pwd)"
MIG="${1:-$AQUI/../migrations}"
BIN=/usr/lib/postgresql/16/bin
D=$(mktemp -d /var/tmp/pg-carrera-XXXX); chown postgres "$D"
su postgres -s /bin/bash -c "cd / && $BIN/initdb -D $D/data -A trust -U postgres >/dev/null && $BIN/pg_ctl -D $D/data -o '-p 5497 -k $D -c listen_addresses= -c max_connections=100' -l $D/log.txt start >/dev/null"
trap 'su postgres -s /bin/bash -c "cd / && $BIN/pg_ctl -D $D/data stop -m fast >/dev/null"; rm -rf "$D"' EXIT
P="psql -h $D -p 5497 -U postgres -q -X -v ON_ERROR_STOP=1"
sleep 1
$P -f "$AQUI/0-imitacion-supabase.sql" >/dev/null 2>&1
for m in "$MIG"/*.sql; do $P -f "$m" >/dev/null 2>&1; done
SALIDA=$(mktemp -d)

intento() { # $1 usuario, $2 archivo de salida
  $P -A -t -c "set role service_role; select public.reservar_intento_ingreso('$1');" > "$2"
}

# 1) El mismo usuario, 30 veces a la vez
for i in $(seq 1 30); do intento "CRRA-07" "$SALIDA/mismo-$i" & done
wait
pasaron=$(cat "$SALIDA"/mismo-* | grep -c '^t$' || true)
echo "Mismo usuario, 30 intentos a la vez: pasaron $pasaron (tienen que ser 5)"

# 2) Treinta alumnos distintos, a la vez
for i in $(seq -w 1 30); do intento "CRRB-$i" "$SALIDA/clase-$i" & done
wait
pasaron2=$(cat "$SALIDA"/clase-* | grep -c '^t$' || true)
echo "Clase de 30, cada uno con su usuario: pasaron $pasaron2 (tienen que ser 30)"

bloqueado=$($P -A -t -c "select bloqueado_hasta is not null from intentos_ingreso where usuario = 'CRRA-07'")
echo "El usuario atacado quedó bloqueado: $bloqueado (tiene que ser t)"
rm -rf "$SALIDA"
[ "$pasaron" = 5 ] && [ "$pasaron2" = 30 ] && echo "RESULTADO: OK" || { echo "RESULTADO: FALLA"; exit 1; }
