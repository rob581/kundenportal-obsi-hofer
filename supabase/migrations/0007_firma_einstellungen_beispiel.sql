-- PROJ-7: Kundenspezifische Spalten in der Geräte-Übersicht
-- Kein Schema-Change (die Tabelle selbst kommt aus 0006) — dies ist eine
-- Referenz/Vorlage, wie eine Firma Zusatzspalten aktiviert bekommt.
-- portal_firma_einstellungen wird bewusst manuell gepflegt (siehe PROJ-7
-- Tech Design), nicht automatisiert — vor dem Ausführen den echten
-- Firmennamen unten eintragen und die passende id nachschlagen.

-- 1. Firma-ID zum Firmennamen nachschlagen (dv_firmen.id, NICHT .name):
-- select id, name from dv_firmen where name ilike '%Firmenname hier%';

-- 2. Gefundene id unten einsetzen und Zusatzspalten wählen. Gültige Keys
-- (siehe ZUSATZSPALTEN_POOL in src/lib/geraete/zusatzspalten.ts):
-- seriennummer, barcode, kundenId, zubehoer, bemerkungen, artikelTyp, artikelDimension
insert into portal_firma_einstellungen (firma_id, zusatzspalten)
values ('<firma-id-aus-dv_firmen.id>', array['seriennummer', 'kundenId'])
on conflict (firma_id) do update set
  zusatzspalten = excluded.zusatzspalten,
  updated_at = now();
