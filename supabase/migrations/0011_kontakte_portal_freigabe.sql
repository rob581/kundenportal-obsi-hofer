-- PROJ-13: Kontakt-Freigabe für Kundenportal-Zugang
-- Mirrors the Dataverse checkbox bmvcc_kundenportal ("Kundenportal"), set per
-- Kontakt in obsi-hofer-admin (PROJ-8). Portal access now additionally
-- requires this flag. Default false is deliberate (fail-closed): every
-- existing Kontakt counts as not released until the next sync of one of its
-- Firmen brings in the real value — that is the intended hard cutover.
-- Purely additive; harmless with the previous code still deployed.

alter table dv_kontakte add column if not exists ist_portal_freigegeben boolean not null default false;
