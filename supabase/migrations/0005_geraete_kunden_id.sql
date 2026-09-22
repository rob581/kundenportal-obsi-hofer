-- PROJ-7: Kundenspezifische Spalten in der Geräte-Übersicht
-- Adds the customer's own device designation (Dataverse: bmvcc_KundenID),
-- previously deliberately left out of the sync (see PROJ-1 Decision Log) —
-- it is a pure per-device info field, unrelated to Firma assignment (that
-- remains solely via the Standort relation). Purely additive.

alter table dv_geraete add column if not exists kunden_id text;
