-- PROJ-11 (Nachtrag): Login-Zählung pro Firma
-- Ergänzt die bestehende Login-Quote (basiert auf auth.users.last_sign_in_at,
-- liefert nur ja/nein) um einen echten Zähler "wie oft hat sich Firma X
-- eingeloggt" — Supabase speichert selbst nur den letzten Zeitpunkt, keinen
-- Zähler. Zählt bewusst erst ab Einführung dieses Features, kein Backfill
-- (Nutzerwunsch: "benötige keine vergangenen Daten"). Gleiches Muster wie
-- export_log (Migration 0008): RLS aktiviert ohne Policies, geschrieben wird
-- ausschliesslich über den Service-Role-Client.

create table if not exists login_log (
  id bigint generated always as identity primary key,
  firma_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_login_log_created_at on login_log(created_at);
create index if not exists idx_login_log_firma_id on login_log(firma_id);

alter table login_log enable row level security;
