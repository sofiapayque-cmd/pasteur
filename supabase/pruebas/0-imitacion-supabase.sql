-- Imitación mínima de lo que un proyecto de Supabase ya trae, para probar las
-- migraciones en un Postgres local (sin Docker). NO se aplica en Supabase.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_app_meta_data jsonb not null default '{}'::jsonb,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  is_anonymous boolean not null default false
);
create table auth.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade
);
create table auth.refresh_tokens (
  id bigserial primary key,
  session_id uuid references auth.sessions (id) on delete cascade
);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
grant execute on function auth.jwt() to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
create publication supabase_realtime;
-- Peor caso: proyecto con "Automatically expose new tables" PRENDIDO (como
-- ciencia-sin-limites-dev, creado desde la API). Cada tabla y función nueva
-- nace con todos los permisos para los tres roles; las migraciones tienen
-- que quitarlos.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
