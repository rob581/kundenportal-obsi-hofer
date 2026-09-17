import type { Geraet, GeraeteQuery, GeraeteResult } from "./types";

// Placeholder data for /frontend — mirrors the real distribution found in
// dv_geraete during /architecture (Freigabe ~83%, keine Freigabe ~14%,
// letzte Freigabe ~2% with inconsistent casing, ~1% no status).
// /backend replaces getGeraeteList's internals with real Supabase queries
// against dv_geraete/dv_standorte/dv_artikel, keeping the same signature.
export const MOCK_GERAETE: Geraet[] = [
  {
    id: "g1",
    name: "Feuerlöscher Halle A",
    seriennummer: "FL-2019-0041",
    barcode: "4012345000041",
    status: "Freigabe",
    letztePruefung: "2026-08-12",
    ablegereife: "2029-08-12",
    herstelljahr: "2019",
    standortName: "Hauptlager Zürich",
    lagerort: "Regal 3, Fach 2",
    pruefer: "M. Keller",
    zubehoer: "Halterung, Prüfplakette",
    bemerkungen: null,
    artikelBezeichnung: "Feuerlöscher 6kg ABC",
    artikelHersteller: "GLORIA",
    artikelNorm: "EN 3",
  },
  {
    id: "g2",
    name: "Rauchmelder EG",
    seriennummer: "RM-2021-1187",
    barcode: null,
    status: "keine Freigabe",
    letztePruefung: "2026-03-04",
    ablegereife: null,
    herstelljahr: "2021",
    standortName: "Bürogebäude Ost",
    lagerort: "Flur EG",
    pruefer: "S. Meier",
    zubehoer: null,
    bemerkungen: "Batterie schwach, Austausch nötig",
    artikelBezeichnung: "Funkrauchmelder",
    artikelHersteller: "Hekatron",
    artikelNorm: "EN 14604",
  },
  {
    id: "g3",
    name: "Erste-Hilfe-Koffer Werkstatt",
    seriennummer: "EH-2018-0092",
    barcode: "4012345000092",
    status: "letzte Freigabe",
    letztePruefung: "2026-06-30",
    ablegereife: "2026-12-31",
    herstelljahr: "2018",
    standortName: "Werkstatt Nord",
    lagerort: "Wand neben Eingang",
    pruefer: "M. Keller",
    zubehoer: "Wandhalterung",
    bemerkungen: "Läuft bald ab — Ersatz bestellen",
    artikelBezeichnung: "Verbandkasten DIN 13157",
    artikelHersteller: "Söhngen",
    artikelNorm: "DIN 13157",
  },
  {
    id: "g4",
    name: "Absturzsicherung Kran 2",
    seriennummer: "AS-2022-0512",
    barcode: "4012345000512",
    status: "Freigabe",
    letztePruefung: null,
    ablegereife: null,
    herstelljahr: "2022",
    standortName: "Hauptlager Zürich",
    lagerort: "Kranbereich",
    pruefer: null,
    zubehoer: "Karabiner, Seil 10m",
    bemerkungen: "Erstprüfung noch ausstehend",
    artikelBezeichnung: "Auffanggurt",
    artikelHersteller: "Petzl",
    artikelNorm: "EN 361",
  },
  {
    id: "g5",
    name: "Notleuchte Treppenhaus",
    seriennummer: "NL-2020-0733",
    barcode: "4012345000733",
    status: "Letzte Freigabe",
    letztePruefung: "2025-11-18",
    ablegereife: "2026-11-18",
    herstelljahr: "2020",
    standortName: "Bürogebäude Ost",
    lagerort: "Treppenhaus 2. OG",
    pruefer: "S. Meier",
    zubehoer: null,
    bemerkungen: null,
    artikelBezeichnung: "LED-Notleuchte",
    artikelHersteller: "Eaton",
    artikelNorm: "EN 60598-2-22",
  },
  {
    id: "g6",
    name: "Feuerlöscher Werkstatt Nord",
    seriennummer: "FL-2023-0201",
    barcode: "4012345000201",
    status: null,
    letztePruefung: null,
    ablegereife: null,
    herstelljahr: "2023",
    standortName: "Werkstatt Nord",
    lagerort: "Eingangsbereich",
    pruefer: null,
    zubehoer: null,
    bemerkungen: "Neu erfasst, noch keine Statusmeldung aus Dataverse",
    artikelBezeichnung: "Feuerlöscher 6kg ABC",
    artikelHersteller: "GLORIA",
    artikelNorm: "EN 3",
  },
];

function normalizeStatus(status: string | null): string | null {
  if (!status) return null;
  return status.trim().toLowerCase();
}

export function getStatusOptions(items: Geraet[]): string[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    const key = normalizeStatus(item.status);
    if (key && !seen.has(key)) seen.set(key, item.status!.trim());
  }
  return [...seen.values()].sort();
}

function compareByLetztePruefungDesc(a: Geraet, b: Geraet): number {
  // Never-inspected devices need attention most urgently, so they sort first.
  if (!a.letztePruefung && !b.letztePruefung) return 0;
  if (!a.letztePruefung) return -1;
  if (!b.letztePruefung) return 1;
  return b.letztePruefung.localeCompare(a.letztePruefung);
}

const PAGE_SIZE = 25;

export async function getGeraeteList(query: GeraeteQuery): Promise<GeraeteResult> {
  const allStatusOptions = getStatusOptions(MOCK_GERAETE);

  let items = [...MOCK_GERAETE];

  if (query.status) {
    const wanted = normalizeStatus(query.status);
    items = items.filter((g) => normalizeStatus(g.status) === wanted);
  }

  if (query.suche) {
    const needle = query.suche.trim().toLowerCase();
    items = items.filter(
      (g) =>
        g.name?.toLowerCase().includes(needle) || g.seriennummer?.toLowerCase().includes(needle)
    );
  }

  items.sort(compareByLetztePruefungDesc);

  const total = items.length;
  const page = Math.max(1, query.seite ?? 1);
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = items.slice(start, start + PAGE_SIZE);

  return {
    items: pageItems,
    total,
    page,
    pageSize: PAGE_SIZE,
    statusOptions: allStatusOptions,
  };
}

export async function getGeraetById(id: string) {
  return MOCK_GERAETE.find((g) => g.id === id) ?? null;
}
