-- PROJ-15: Portal-Zugang pro Standort
-- Spiegel der Dataverse-Tabelle bmvcc_portalzugang (gepflegt im Admin-Tool
-- obsi-hofer-admin, PROJ-11). Ein Datensatz = dieser Kontakt hat Zugang zu
-- diesem Standort; Entzug = Datensatz gelöscht. Befüllt und bereinigt nur
-- durch den Firma-Sync (PROJ-12), gelesen nur serverseitig.
-- kontakt_id darf leer sein (verwaiste Datensätze nach Löschungen in
-- Dataverse) — solche Zeilen geben nie Zugang (siehe access.ts).
-- Lose Verweise ohne Foreign Keys, wie alle Spiegeltabellen seit 0002.

create table if not exists dv_portalzugaenge (
  id text primary key,
  kontakt_id text,
  standort_id text not null,
  synced_at timestamptz not null default now()
);

create index if not exists idx_dv_portalzugaenge_kontakt_id on dv_portalzugaenge (kontakt_id);
create index if not exists idx_dv_portalzugaenge_standort_id on dv_portalzugaenge (standort_id);

-- Deny-all für anon/authenticated (keine Policies), wie alle dv_*-Tabellen
-- (Migration 0001): nur die Service-Role (Server-Code) liest und schreibt.
alter table dv_portalzugaenge enable row level security;

-- PROJ-11-Login-Quote: Basis = Firmen, für deren Standorte mindestens ein
-- aktiver Kontakt einen Zugang hat; "eingeloggt" nur über diese Kontakte.
-- Ersetzt die Fassung aus 0012 (Relationen + Häkchen). Gleiche Ergebnisform,
-- Report-Code bleibt unverändert.
create or replace function erfolgsmessung_login_status()
returns table (firma_id text, firma_name text, hat_login boolean)
language sql
security definer
set search_path = public, auth
as $$
  select
    f.id as firma_id,
    f.name as firma_name,
    bool_or(u.last_sign_in_at is not null) as hat_login
  from dv_firmen f
  join dv_standorte s on s.firma_id = f.id
  join dv_portalzugaenge pz on pz.standort_id = s.id
  join dv_kontakte k on k.id = pz.kontakt_id and k.ist_aktiv = true
  left join auth.users u on lower(u.email) = lower(k.email)
  group by f.id, f.name;
$$;

revoke all on function erfolgsmessung_login_status() from public, anon, authenticated;
grant execute on function erfolgsmessung_login_status() to service_role;
