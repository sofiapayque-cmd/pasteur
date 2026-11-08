"""Genera la versión "para el proyecto real" de un archivo de pruebas local.

El resultado es UNA sola consulta (para el conector de Supabase o el SQL
Editor): Postgres la corre como una transacción, y la última sentencia lanza
un error a propósito con el resultado adentro. El error deshace todo: no
queda guardado nada de las pruebas.

Uso, desde la raíz del repo:
  python3 supabase/pruebas/a-real.py 3-pruebas-equipo-fichas.sql 4-pruebas-equipo-fichas-real.sql
  python3 supabase/pruebas/a-real.py 5-pruebas-biblioteca.sql 6-pruebas-biblioteca-real.sql

Qué cambia respecto del archivo local:
  · las variables de psql (\\set) quedan escritas en el texto;
  · lo que se guardaba con \\gset va a la tabla <esquema>.v;
  · SET ROLE pasa a SET LOCAL ROLE;
  · el listado final de psql se reemplaza por el error que deshace todo.
"""
import os
import re
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
src, dst = (os.path.join(AQUI, a) for a in sys.argv[1:3])
s = open(src, encoding='utf-8').read()
esquema = re.search(r"^create schema (t\d+);", s, flags=re.M).group(1)
vars_ = dict(re.findall(r"^\\set (\w+)\s+'''([^']+)'''\s*$", s, flags=re.M))
nombres = "|".join(sorted(vars_, key=len, reverse=True))


def guardado(nombre):
    # En el archivo 3 los ids de versiones y fichas se usan sin cast: van como uuid.
    # En los demás, el archivo local ya escribe el cast (:'p1'::uuid).
    if esquema == 't3' and nombre[0] in 'vf':
        return f"(select val::uuid from {esquema}.v where k = '{nombre}')"
    return f"(select val from {esquema}.v where k = '{nombre}')"


out = []
for line in s.splitlines():
    if re.match(r"^\\(set|o|pset)\b", line):
        continue
    m = re.match(r"^select (.+) as (\w+)( from .+?)? \\gset$", line)
    if m:
        line = f"insert into {esquema}.v (k, val) select '{m.group(2)}', ({m.group(1)})::text{m.group(3) or ''};"
    line = re.sub(r"^set role ", "set local role ", line)
    if nombres:
        line = re.sub(r"(?<!:):(" + nombres + r")\b", lambda m: "'" + vars_[m.group(1)] + "'", line)
    line = re.sub(r":'(\w+)'", lambda m: guardado(m.group(1)), line)
    out.append(line)
body = "\n".join(out)

if esquema == 't3':
    # Dentro de una transacción now() no avanza: primero se lleva estado_desde
    # una hora atrás y después se comprueba que la suspensión la renueva.
    viejo = ("select t3.ok('suspendida: guarda la fecha', (select estado_desde > creado_en from equipo where id = '"
             + vars_['VAL2'] + "'));")
    assert viejo in body
    body = body.replace(viejo, "select t3.ok('suspendida: guarda la fecha', (select estado_desde > now() - interval '1 minute' from equipo where id = '"
                        + vars_['VAL2'] + "'));")
    antes = ("set local role authenticated; select set_config('request.jwt.claim.sub', '" + vars_['ADM']
             + "', false);\nupdate equipo set estado = 'suspendida'")
    assert antes in body
    body = body.replace(antes, "update equipo set estado_desde = now() - interval '1 hour' where id = '" + vars_['VAL2'] + "';\n" + antes)
    body = body.replace("create table t3.resultado (n serial, prueba text, ok boolean);",
                        "create table t3.resultado (n serial, prueba text, ok boolean);\ncreate table t3.v (k text primary key, val text);")
    body = body.replace("grant all on t3.resultado, t3.resultado_n_seq to anon, authenticated, service_role;",
                        "grant all on t3.resultado, t3.resultado_n_seq, t3.v to anon, authenticated, service_role;")
    cab_extra = """
-- Maestra y alumno de prueba (en la versión local los crean las pruebas de aulas)
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@escuela.uy', '{"nombre":"Maestra A"}');
insert into auth.users (id, email, raw_app_meta_data) values
  ('cccccccc-0000-0000-0000-000000000001', 'k7rm-01@alumnos.invalid', '{"rol":"alumno"}');
"""
else:
    cab_extra = ""

# Cortar el final de psql (imprimir resultados) y poner el error que deshace todo
corte = body.index(f"select case when ok then 'OK   '")
body = body[:corte].rstrip() + f"""

-- ---------- Resultado: se informa con un error, que deshace TODO ----------
do $$
declare
  total text; detalle text;
begin
  select count(*) filter (where ok) || ' OK · ' || count(*) filter (where not ok) || ' FALLAS'
    into total from {esquema}.resultado;
  select string_agg(case when ok then 'OK    ' else 'FALLA ' end || prueba, E'\\n' order by n)
    into detalle from {esquema}.resultado;
  raise exception E'RESULTADO (todo se deshizo): %\\n%', total, detalle;
end $$;
"""
cab = f"""-- =====================================================================
-- GENERADO con a-real.py desde {os.path.basename(src)}: no editar a mano.
--
-- Para correr en un proyecto REAL de Supabase (solo el de desarrollo), sin
-- dejar rastro. Se manda como UNA sola consulta: Postgres la ejecuta como una
-- transacción, y la última sentencia lanza un error A PROPÓSITO con el
-- resultado adentro. El error deshace todo: usuarios de prueba, equipo,
-- fichas, publicaciones, el esquema "{esquema}"… nada queda guardado.
-- =====================================================================
"""
open(dst, 'w', encoding='utf-8').write(cab + cab_extra + body + "\n")
print(f"{os.path.basename(dst)}: {len(cab + cab_extra + body)} caracteres")
