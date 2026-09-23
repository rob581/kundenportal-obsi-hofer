-- PROJ-11 (Nachtrag): wöchentlicher E-Mail-Report
-- Der App-seitige Supabase-Client spricht nur mit PostgREST, das auth.users
-- nicht direkt erreicht. Diese Funktion kapselt den Zugriff serverseitig und
-- gibt nur das berechnete Ergebnis zurück (Firma + Login-Status), keine
-- rohen auth.users-Zeilen. `security definer` lässt sie mit den Rechten des
-- Funktions-Eigentümers laufen (kann auth.users lesen); execute wird explizit
-- von public/anon/authenticated entzogen und nur der service_role gewährt —
-- gleiches Durchsetzungsprinzip wie RLS bei Tabellen (siehe export_log,
-- Migration 0008): selbst falls PostgREST die Funktion als RPC-Endpoint
-- listet, lehnt Postgres den Aufruf ohne Execute-Recht ab.

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
  join dv_kontakte k on k.id = r.kontakt_id and k.ist_aktiv = true
  left join auth.users u on lower(u.email) = lower(k.email)
  group by f.id, f.name;
$$;

revoke all on function erfolgsmessung_login_status() from public, anon, authenticated;
grant execute on function erfolgsmessung_login_status() to service_role;
