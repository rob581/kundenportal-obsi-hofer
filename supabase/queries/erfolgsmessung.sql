-- PROJ-11: Erfolgsmessung Kundenportal
-- Nur zur manuellen Ausführung im Supabase SQL Editor durch den
-- Projektinhaber. Bewusst keine Views/Functions in der Datenbank angelegt
-- (siehe PROJ-11 Tech Design) — ein neues Objekt im public-Schema könnte
-- sonst versehentlich über die PostgREST-API erreichbar werden, u.a. weil
-- die Login-Quote-Abfrage auf auth.users zugreift. Einfach den jeweiligen
-- Block kopieren und ausführen.

-- ============================================================
-- 1) Login-Quote: welcher Anteil der Kunden (= Firmen, für deren Standorte
--    mindestens ein aktiver Kontakt einen Portalzugang hat, PROJ-15) hat
--    sich mindestens einmal eingeloggt? Gleiche Regel wie die Funktion
--    erfolgsmessung_login_status() (Migration 0013).
-- ============================================================

-- 1a) Pro Firma (zum Nachschauen, wer noch fehlt):
select
  f.id as firma_id,
  f.name as firma_name,
  bool_or(u.last_sign_in_at is not null) as hat_login
from dv_firmen f
join dv_standorte s on s.firma_id = f.id
join dv_portalzugaenge pz on pz.standort_id = s.id
join dv_kontakte k on k.id = pz.kontakt_id and k.ist_aktiv = true
left join auth.users u on lower(u.email) = lower(k.email)
group by f.id, f.name
order by hat_login, f.name;

-- 1b) Gesamt-Quote (die eigentliche Kennzahl aus der PRD):
with pro_firma as (
  select
    f.id as firma_id,
    bool_or(u.last_sign_in_at is not null) as hat_login
  from dv_firmen f
  join dv_standorte s on s.firma_id = f.id
  join dv_portalzugaenge pz on pz.standort_id = s.id
  join dv_kontakte k on k.id = pz.kontakt_id and k.ist_aktiv = true
  left join auth.users u on lower(u.email) = lower(k.email)
  group by f.id
)
select
  count(*) filter (where hat_login) as firmen_mit_login,
  count(*) as firmen_gesamt,
  round(100.0 * count(*) filter (where hat_login) / nullif(count(*), 0), 1) as quote_prozent
from pro_firma;

-- ============================================================
-- 2) Anzahl CSV-Exports pro Monat, aufgeschlüsselt nach Export-Art
--    (Geräte-Übersicht vs. Prüfberichte-Übersicht)
-- ============================================================

select
  to_char(date_trunc('month', created_at), 'YYYY-MM') as monat,
  entity,
  count(*) as anzahl
from export_log
group by 1, 2
order by 1 desc, 2;
