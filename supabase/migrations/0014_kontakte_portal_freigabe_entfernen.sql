-- Aufräumen nach PROJ-15 (Portal-Zugang pro Standort)
-- dv_kontakte.ist_portal_freigegeben (Migration 0011, Häkchen bmvcc_kundenportal
-- aus PROJ-13) wird seit PROJ-15 weder vom Sync geschrieben noch von der
-- Zugriffsprüfung oder der Login-Quote gelesen — Zugang kommt ausschliesslich
-- aus dv_portalzugaenge. Die Login-Quoten-Funktion aus 0012, die die Spalte
-- noch nutzte, wurde durch 0013 ersetzt.
-- Mit dem laufenden Code unschädlich (keine Abhängigkeit mehr).

alter table dv_kontakte drop column if exists ist_portal_freigegeben;
