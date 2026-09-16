-- PROJ-1: Dataverse-Sync-Service
-- Mirrors a subset of the Dataverse solution "bmvcc" for the customer portal.
-- All tables are written to exclusively by the sync API routes (service role).
-- RLS is enabled with no anon/authenticated policies: only the Supabase
-- service role (used server-side only) can read or write these tables.

create table if not exists dv_firmen (
  id text primary key,
  name text,
  name2 text,
  nummer text,
  email text,
  telefon text,
  mobil text,
  website text,
  adresse_strasse text,
  adresse_hausnummer text,
  adresse_plz text,
  adresse_ort text,
  synced_at timestamptz not null default now()
);

create table if not exists dv_kontakte (
  id text primary key,
  name1 text,
  name2 text,
  email text,
  telefon text,
  mobil text,
  ist_aktiv boolean not null default true,
  synced_at timestamptz not null default now()
);

create index if not exists idx_dv_kontakte_email on dv_kontakte (lower(email));

create table if not exists dv_artikel (
  id text primary key,
  bezeichnung text,
  artikelnummer text,
  artikeltyp text,
  norm text,
  hersteller text,
  synced_at timestamptz not null default now()
);

create table if not exists dv_standorte (
  id text primary key,
  name text,
  firma_id text references dv_firmen (id) on delete set null,
  synced_at timestamptz not null default now()
);

create index if not exists idx_dv_standorte_firma_id on dv_standorte (firma_id);

create table if not exists dv_geraete (
  id text primary key,
  name text,
  seriennummer text,
  barcode text,
  status text,
  letzte_pruefung date,
  ablegereife date,
  herstelljahr date,
  standort_id text references dv_standorte (id) on delete set null,
  artikel_id text references dv_artikel (id) on delete set null,
  lagerort text,
  pruefer text,
  zubehoer text,
  dokumentation text,
  bemerkungen text,
  synced_at timestamptz not null default now()
);

create index if not exists idx_dv_geraete_standort_id on dv_geraete (standort_id);
create index if not exists idx_dv_geraete_status on dv_geraete (status);
create index if not exists idx_dv_geraete_letzte_pruefung on dv_geraete (letzte_pruefung);

create table if not exists dv_pruefberichte (
  id text primary key,
  geraet_id text references dv_geraete (id) on delete set null,
  pruefdatum date,
  ergebnis text,
  pruefer text,
  ist_archiviert boolean not null default false,
  deleted_at timestamptz,
  synced_at timestamptz not null default now()
);

create index if not exists idx_dv_pruefberichte_geraet_id on dv_pruefberichte (geraet_id);
create index if not exists idx_dv_pruefberichte_pruefdatum on dv_pruefberichte (pruefdatum);
create index if not exists idx_dv_pruefberichte_deleted_at on dv_pruefberichte (deleted_at);

create table if not exists dv_relationen (
  id text primary key,
  firma_id text references dv_firmen (id) on delete set null,
  kontakt_id text references dv_kontakte (id) on delete set null,
  rolle text,
  synced_at timestamptz not null default now()
);

create index if not exists idx_dv_relationen_firma_id on dv_relationen (firma_id);
create index if not exists idx_dv_relationen_kontakt_id on dv_relationen (kontakt_id);

-- Row Level Security: deny-all for anon/authenticated. Only the service
-- role (used exclusively by server-side sync/API code) can access these
-- tables; the service role bypasses RLS entirely by design.
alter table dv_firmen enable row level security;
alter table dv_kontakte enable row level security;
alter table dv_artikel enable row level security;
alter table dv_standorte enable row level security;
alter table dv_geraete enable row level security;
alter table dv_pruefberichte enable row level security;
alter table dv_relationen enable row level security;
