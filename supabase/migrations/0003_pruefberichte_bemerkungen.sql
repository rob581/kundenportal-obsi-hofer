-- PROJ-4: Prüfberichte-Liste
-- Adds the Bemerkungen field (Dataverse: bmvcc_remark), needed to display
-- report remarks on the Geräte-Detailseite. Purely additive — no existing
-- PROJ-1 behavior changes.

alter table dv_pruefberichte add column if not exists bemerkungen text;
