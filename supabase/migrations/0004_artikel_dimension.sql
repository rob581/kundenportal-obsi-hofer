-- PROJ-3 refinement: Geräte-Übersicht/-Detail zeigen jetzt Artikel-Infos
-- statt des Gerätenamens. Adds the Dimension field (Dataverse: bmvcc_dimensions).
-- Purely additive — no existing PROJ-1 behavior changes.

alter table dv_artikel add column if not exists dimension text;
