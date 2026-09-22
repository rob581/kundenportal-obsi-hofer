-- PROJ-7: Kundenspezifische Spalten in der Geräte-Übersicht
-- Deliberately separate from the dv_* Dataverse-mirror tables (see PROJ-7
-- Tech Design): the nightly PROJ-1 sync job never touches this table, so a
-- manually configured Firma preference here survives every sync run instead
-- of being overwritten. No foreign key to dv_firmen (same "loose reference"
-- reasoning as migration 0002) — firma_id is just an unconstrained, indexed
-- text id. Maintained manually by OBSI Hofer directly in Supabase; no
-- customer-facing write path exists for this table.

create table if not exists portal_firma_einstellungen (
  firma_id text primary key,
  zusatzspalten text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- Row Level Security: deny-all for anon/authenticated, same convention as
-- every dv_* table (see migration 0001) — only the service role (server-side
-- only) reads this table.
alter table portal_firma_einstellungen enable row level security;
