import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { Geraet, GeraeteQuery, GeraeteResult } from "./types";

const PAGE_SIZE = 25;

function normalizeStatus(status: string | null): string | null {
  if (!status) return null;
  return status.trim().toLowerCase();
}

function dedupeStatusOptions(statuses: (string | null)[]): string[] {
  const seen = new Map<string, string>();
  for (const status of statuses) {
    const key = normalizeStatus(status);
    if (key && !seen.has(key)) seen.set(key, status!.trim());
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "de", { sensitivity: "base" }));
}

// PostgREST's .or() reads its argument as a comma-separated filter list, so a
// literal "," or "(" / ")" typed into the search box would otherwise break
// the filter instead of just failing to match.
function escapeOrListValue(value: string): string {
  return value.replace(/[(),]/g, (c) => `\\${c}`);
}

function extractYear(date: string | null): string | null {
  return date ? date.slice(0, 4) : null;
}

type GeraetRow = {
  id: string;
  name: string | null;
  seriennummer: string | null;
  barcode: string | null;
  status: string | null;
  letzte_pruefung: string | null;
  ablegereife: string | null;
  herstelljahr: string | null;
  standort_id: string | null;
  artikel_id: string | null;
  lagerort: string | null;
  pruefer: string | null;
  zubehoer: string | null;
  bemerkungen: string | null;
};

type ArtikelInfo = {
  bezeichnung: string | null;
  hersteller: string | null;
  norm: string | null;
  artikeltyp: string | null;
  dimension: string | null;
};

function mapGeraetRow(row: GeraetRow, standortName: string | null, artikel: ArtikelInfo | null): Geraet {
  return {
    id: row.id,
    name: row.name,
    seriennummer: row.seriennummer,
    barcode: row.barcode,
    status: row.status,
    letztePruefung: row.letzte_pruefung,
    ablegereife: row.ablegereife,
    herstelljahr: extractYear(row.herstelljahr),
    standortName,
    lagerort: row.lagerort,
    pruefer: row.pruefer,
    zubehoer: row.zubehoer,
    bemerkungen: row.bemerkungen,
    artikelBezeichnung: artikel?.bezeichnung ?? null,
    artikelHersteller: artikel?.hersteller ?? null,
    artikelNorm: artikel?.norm ?? null,
    artikelTyp: artikel?.artikeltyp ?? null,
    artikelDimension: artikel?.dimension ?? null,
  };
}

async function getArtikelMapFuerIds(artikelIds: string[]): Promise<Map<string, ArtikelInfo>> {
  if (artikelIds.length === 0) return new Map();

  const { data, error } = await getSupabaseAdmin()
    .from("dv_artikel")
    .select("id, bezeichnung, hersteller, norm, artikeltyp, dimension")
    .in("id", artikelIds);

  if (error) throw new Error(`Artikel-Lookup fehlgeschlagen: ${error.message}`);

  return new Map(
    (data ?? []).map((row) => [
      row.id as string,
      {
        bezeichnung: row.bezeichnung as string | null,
        hersteller: row.hersteller as string | null,
        norm: row.norm as string | null,
        artikeltyp: row.artikeltyp as string | null,
        dimension: row.dimension as string | null,
      },
    ])
  );
}

async function getStandorteFuerFirma(firmaId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("dv_standorte")
    .select("id, name")
    .eq("firma_id", firmaId);

  if (error) throw new Error(`Standorte-Lookup fehlgeschlagen: ${error.message}`);
  return (data ?? []) as { id: string; name: string | null }[];
}

// Shared with src/lib/dashboard/queries.ts (see PROJ-5 Tech Design: reuse
// this resolution instead of duplicating it) — just the IDs, no names.
export async function getStandortIdsFuerFirma(firmaId: string): Promise<string[]> {
  const standorte = await getStandorteFuerFirma(firmaId);
  return standorte.map((s) => s.id);
}

// Two-step lookup by design (see PROJ-3 Tech Design): dv_geraete/dv_standorte
// have no real foreign keys since PROJ-1's BUG-1 fix, so PostgREST can't
// embed the join — we resolve the Firma's Standort-IDs first, then query
// Geräte against that ID list.
export async function getGeraeteList(firmaId: string, query: GeraeteQuery): Promise<GeraeteResult> {
  const standorte = await getStandorteFuerFirma(firmaId);
  const standortIds = standorte.map((s) => s.id);
  const standortNamen = new Map(standorte.map((s) => [s.id, s.name]));

  const page = Math.max(1, query.seite ?? 1);

  if (standortIds.length === 0) {
    return { items: [], total: 0, page, pageSize: PAGE_SIZE, statusOptions: [] };
  }

  const supabase = getSupabaseAdmin();

  // Filter options must reflect every status in use at this Firma, not just
  // the current page/filter — queried unfiltered, deduped case-insensitively
  // (real data has "letzte Freigabe" vs. "Letzte Freigabe").
  const { data: statusRows, error: statusError } = await supabase
    .from("dv_geraete")
    .select("status")
    .in("standort_id", standortIds);

  if (statusError) throw new Error(`Status-Lookup fehlgeschlagen: ${statusError.message}`);
  const statusOptions = dedupeStatusOptions((statusRows ?? []).map((r) => r.status as string | null));

  let geraeteQuery = supabase
    .from("dv_geraete")
    .select(
      "id, name, seriennummer, barcode, status, letzte_pruefung, ablegereife, herstelljahr, standort_id, artikel_id, lagerort, pruefer, zubehoer, bemerkungen",
      { count: "exact" }
    )
    .in("standort_id", standortIds);

  if (query.status) {
    geraeteQuery = geraeteQuery.ilike("status", query.status);
  }
  if (query.suche) {
    const needle = escapeOrListValue(query.suche.trim());
    geraeteQuery = geraeteQuery.or(
      `seriennummer.ilike.%${needle}%,barcode.ilike.%${needle}%,lagerort.ilike.%${needle}%`
    );
  }

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE - 1;

  const { data, error, count } = await geraeteQuery
    .order("letzte_pruefung", { ascending: false, nullsFirst: true })
    .range(start, end);

  if (error) throw new Error(`Geräte-Lookup fehlgeschlagen: ${error.message}`);

  // The "Gerät"-Spalte zeigt seit dem PROJ-3-Refinement Artikel-Infos statt
  // des Gerätenamens (siehe formatArtikelInfo), daher werden Artikel jetzt
  // auch für die Liste geladen — als eine Batch-Abfrage über die (max. 25)
  // distinct Artikel-IDs der aktuellen Seite, kein Lookup pro Zeile.
  const rows = (data ?? []) as GeraetRow[];
  const artikelIds = [...new Set(rows.map((row) => row.artikel_id).filter((id): id is string => !!id))];
  const artikelMap = await getArtikelMapFuerIds(artikelIds);

  const items = rows.map((row) =>
    mapGeraetRow(
      row,
      standortNamen.get(row.standort_id ?? "") ?? null,
      row.artikel_id ? artikelMap.get(row.artikel_id) ?? null : null
    )
  );

  return { items, total: count ?? items.length, page, pageSize: PAGE_SIZE, statusOptions };
}

// firmaId comes from the caller's own session/cookie (never from the URL),
// so an id that resolves to a device outside that Firma is treated exactly
// like an unknown id (null) — this is the actual access check, since RLS on
// dv_geraete denies everyone but the service role.
export async function getGeraetById(id: string, firmaId: string): Promise<Geraet | null> {
  const supabase = getSupabaseAdmin();

  const { data: geraet, error } = await supabase
    .from("dv_geraete")
    .select(
      "id, name, seriennummer, barcode, status, letzte_pruefung, ablegereife, herstelljahr, standort_id, artikel_id, lagerort, pruefer, zubehoer, bemerkungen"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Gerät-Lookup fehlgeschlagen: ${error.message}`);
  if (!geraet) return null;

  const row = geraet as GeraetRow;
  if (!row.standort_id) return null;

  const { data: standort, error: standortError } = await supabase
    .from("dv_standorte")
    .select("name, firma_id")
    .eq("id", row.standort_id)
    .maybeSingle();

  if (standortError) throw new Error(`Standort-Lookup fehlgeschlagen: ${standortError.message}`);
  if (!standort || standort.firma_id !== firmaId) return null;

  let artikel: ArtikelInfo | null = null;
  if (row.artikel_id) {
    const { data: artikelRow, error: artikelError } = await supabase
      .from("dv_artikel")
      .select("bezeichnung, hersteller, norm, artikeltyp, dimension")
      .eq("id", row.artikel_id)
      .maybeSingle();

    if (artikelError) throw new Error(`Artikel-Lookup fehlgeschlagen: ${artikelError.message}`);
    artikel = artikelRow as ArtikelInfo | null;
  }

  return mapGeraetRow(row, standort.name as string | null, artikel);
}
