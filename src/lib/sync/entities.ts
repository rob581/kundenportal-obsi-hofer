import { z } from "zod";

// One entry per Power Automate flow. `slug` is the URL segment used in
// /api/sync/[entity]. `table` is the mirrored Supabase table (see
// supabase/migrations/0001_dataverse_sync_schema.sql). `softDelete` follows
// the PROJ-1 decision: only Pruefberichte are soft-deleted, everything else
// is hard-deleted.

const firmaSchema = z.object({
  id: z.string().min(1),
  name: z.string().nullable().optional(),
  name2: z.string().nullable().optional(),
  nummer: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  telefon: z.string().nullable().optional(),
  mobil: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  adresse_strasse: z.string().nullable().optional(),
  adresse_hausnummer: z.string().nullable().optional(),
  adresse_plz: z.string().nullable().optional(),
  adresse_ort: z.string().nullable().optional(),
});

const kontaktSchema = z.object({
  id: z.string().min(1),
  name1: z.string().nullable().optional(),
  name2: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  telefon: z.string().nullable().optional(),
  mobil: z.string().nullable().optional(),
  ist_aktiv: z.boolean(),
});

const artikelSchema = z.object({
  id: z.string().min(1),
  bezeichnung: z.string().nullable().optional(),
  artikelnummer: z.string().nullable().optional(),
  artikeltyp: z.string().nullable().optional(),
  norm: z.string().nullable().optional(),
  hersteller: z.string().nullable().optional(),
});

const standortSchema = z.object({
  id: z.string().min(1),
  name: z.string().nullable().optional(),
  firma_id: z.string().nullable().optional(),
});

const geraetSchema = z.object({
  id: z.string().min(1),
  name: z.string().nullable().optional(),
  seriennummer: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  letzte_pruefung: z.string().nullable().optional(),
  ablegereife: z.string().nullable().optional(),
  herstelljahr: z.string().nullable().optional(),
  standort_id: z.string().nullable().optional(),
  artikel_id: z.string().nullable().optional(),
  lagerort: z.string().nullable().optional(),
  pruefer: z.string().nullable().optional(),
  zubehoer: z.string().nullable().optional(),
  dokumentation: z.string().nullable().optional(),
  bemerkungen: z.string().nullable().optional(),
});

const pruefberichtSchema = z.object({
  id: z.string().min(1),
  geraet_id: z.string().nullable().optional(),
  pruefdatum: z.string().nullable().optional(),
  ergebnis: z.string().nullable().optional(),
  pruefer: z.string().nullable().optional(),
  ist_archiviert: z.boolean().nullable().optional(),
});

const relationSchema = z.object({
  id: z.string().min(1),
  firma_id: z.string().min(1),
  kontakt_id: z.string().min(1),
  rolle: z.string().nullable().optional(),
});

export const deleteSchema = z.object({
  id: z.string().min(1),
});

export type EntityConfig = {
  table: string;
  schema: z.ZodType<{ id: string }>;
  softDelete: boolean;
};

export const ENTITIES: Record<string, EntityConfig> = {
  firmen: { table: "dv_firmen", schema: firmaSchema, softDelete: false },
  kontakte: { table: "dv_kontakte", schema: kontaktSchema, softDelete: false },
  artikel: { table: "dv_artikel", schema: artikelSchema, softDelete: false },
  standorte: { table: "dv_standorte", schema: standortSchema, softDelete: false },
  geraete: { table: "dv_geraete", schema: geraetSchema, softDelete: false },
  pruefberichte: {
    table: "dv_pruefberichte",
    schema: pruefberichtSchema,
    softDelete: true,
  },
  relationen: { table: "dv_relationen", schema: relationSchema, softDelete: false },
};

export function getEntityConfig(slug: string): EntityConfig | undefined {
  return ENTITIES[slug];
}
