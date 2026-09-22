-- PROJ-7: Kundenspezifische Spalten in der Geräte-Übersicht
-- Kein Schema-Change (die Tabelle selbst kommt aus 0006) — dies ist eine
-- Referenz/Vorlage, wie eine Firma Zusatzspalten aktiviert bekommt.
-- portal_firma_einstellungen wird bewusst manuell gepflegt (siehe PROJ-7
-- Tech Design), nicht automatisiert — vor dem Ausführen den echten
-- Firmennamen unten eintragen.

-- Firmennamen unten anpassen und Zusatzspalten wählen (kein manuelles
-- Nachschlagen/Copy-Paste der id nötig — die Subquery löst sie direkt auf).
-- Gültige Keys (siehe ZUSATZSPALTEN_POOL in src/lib/geraete/zusatzspalten.ts):
-- seriennummer, barcode, kundenId, zubehoer, bemerkungen, artikelTyp, artikelDimension
--
-- dv_firmen hat zwei Namensfelder (name, name2, siehe PROJ-1-Schema) — der
-- gesuchte Firmenname steht nicht immer in name, deshalb beide durchsuchen.
--
-- Vorsicht bei mehrdeutigen Namen: liefert der Filter mehr als eine Firma,
-- schlägt der insert mit "more than one row returned by a subquery" fehl
-- (kein stiller Fehltreffer). Liefert er gar keine Zeile, wird auch nichts
-- eingefügt — aber ohne jede Fehlermeldung. Bei Unsicherheit vorher separat
-- prüfen: select id, name, name2 from dv_firmen where name ilike '%...%' or name2 ilike '%...%';
insert into portal_firma_einstellungen (firma_id, zusatzspalten)
select id, array['seriennummer', 'kundenId']
from dv_firmen
where name ilike '%Firmenname hier%' or name2 ilike '%Firmenname hier%'
on conflict (firma_id) do update set
  zusatzspalten = excluded.zusatzspalten,
  updated_at = now();
