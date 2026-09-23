-- PROJ-11: Erfolgsmessung Kundenportal
-- Records one row per successful CSV export (PROJ-8/PROJ-10). Used only to
-- compute "Anzahl CSV-Exports/Monat" via a manual query in the Supabase SQL
-- Editor — no client-side or customer-facing read/write path exists for
-- this table, see PROJ-11 Tech Design (deliberately no admin UI).

create table if not exists export_log (
  id bigint generated always as identity primary key,
  firma_id text not null,
  entity text not null check (entity in ('geraete', 'pruefberichte')),
  created_at timestamptz not null default now()
);

create index if not exists idx_export_log_created_at on export_log(created_at);
create index if not exists idx_export_log_firma_id on export_log(firma_id);

-- Row Level Security: deny-all for anon/authenticated, same convention as
-- portal_firma_einstellungen (migration 0006) — only the service role
-- (server-side only, used by the export routes) writes to this table; reads
-- happen only manually in the SQL Editor by the project owner.
alter table export_log enable row level security;
