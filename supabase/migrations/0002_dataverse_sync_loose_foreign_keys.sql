-- Fix for QA BUG-1 (PROJ-1, critical): the columns below were declared as
-- `references ... on delete set null`, which only controls what happens
-- when the PARENT row is later deleted — Postgres still rejects inserting
-- a non-null value that does not yet reference an existing row. That broke
-- exactly the scenario PROJ-1 is designed to tolerate: sync events can
-- arrive out of order (e.g. a Pruefbericht before its Geraet), and the
-- referenced parent may not exist yet.
--
-- Dataverse remains the single source of truth and already enforces real
-- referential integrity there; this mirror only needs to store whatever
-- arrives, in whatever order it arrives. So these become plain, indexed,
-- unconstrained id columns — no database-level foreign key at all. The
-- indexes created in 0001 are untouched and still speed up lookups/joins.

alter table dv_standorte drop constraint if exists dv_standorte_firma_id_fkey;
alter table dv_geraete drop constraint if exists dv_geraete_standort_id_fkey;
alter table dv_geraete drop constraint if exists dv_geraete_artikel_id_fkey;
alter table dv_pruefberichte drop constraint if exists dv_pruefberichte_geraet_id_fkey;
alter table dv_relationen drop constraint if exists dv_relationen_firma_id_fkey;
alter table dv_relationen drop constraint if exists dv_relationen_kontakt_id_fkey;
