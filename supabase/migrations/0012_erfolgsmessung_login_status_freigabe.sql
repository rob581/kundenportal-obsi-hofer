-- PROJ-11 (Nachtrag 2026-10-07): Login-Quote nach PROJ-13
-- Seit PROJ-13 hat nur Zugang, wer aktiv UND fürs Kundenportal freigegeben
-- ist (dv_kontakte.ist_portal_freigegeben, Migration 0011). Basis der Quote
-- und "hat sich eingeloggt" zählen deshalb nur noch diese Kontakte — sonst
-- wären alle Firmen mit aktiven Kontakten in der Basis (Quote künstlich
-- tief) und alte Logins heute nicht freigegebener Kontakte würden zählen.
-- Gleiche Ergebnisform wie Migration 0009, Report-Code bleibt unverändert.
-- Voraussetzung: Migration 0011 ist ausgeführt.

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
  join dv_relationen r on r.firma_id = f.id
  join dv_kontakte k on k.id = r.kontakt_id and k.ist_aktiv = true and k.ist_portal_freigegeben = true
  left join auth.users u on lower(u.email) = lower(k.email)
  group by f.id, f.name;
$$;

-- `create or replace` behält bestehende Rechte, zur Sicherheit erneut gesetzt
-- (identisch zu Migration 0009): nur die service_role darf ausführen.
revoke all on function erfolgsmessung_login_status() from public, anon, authenticated;
grant execute on function erfolgsmessung_login_status() to service_role;
