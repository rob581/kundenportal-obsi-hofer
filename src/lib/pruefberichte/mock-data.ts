import type { Pruefbericht } from "./types";

// Placeholder for /frontend. Unlike PROJ-3's mock phase, the Geräte-Detailseite
// already reads real devices from Supabase (PROJ-3 backend is done) — but
// dv_pruefberichte still needs the bemerkungen/bmvcc_remark column before a
// real per-Gerät query can be built (see PROJ-4 Tech Design). So this always
// returns the same canned list regardless of geraetId, purely to verify the
// UI shape; /backend replaces the internals with a real Supabase query keyed
// by geraetId, keeping the same async signature.
const MOCK_PRUEFBERICHTE: Pruefbericht[] = [
  {
    id: "pb1",
    pruefdatum: "2026-08-12",
    ergebnis: "Freigabe",
    bemerkungen: "Keine Beanstandungen.",
    pruefer: "M. Keller",
  },
  {
    id: "pb2",
    pruefdatum: "2025-08-10",
    ergebnis: "Freigabe",
    bemerkungen: null,
    pruefer: "S. Meier",
  },
  {
    id: "pb3",
    pruefdatum: "2024-08-15",
    ergebnis: "keine Freigabe",
    bemerkungen: "Mangel behoben, Nachkontrolle empfohlen.",
    pruefer: "M. Keller",
  },
];

function compareByPruefdatumDesc(a: Pruefbericht, b: Pruefbericht): number {
  if (!a.pruefdatum && !b.pruefdatum) return 0;
  if (!a.pruefdatum) return 1;
  if (!b.pruefdatum) return -1;
  return b.pruefdatum.localeCompare(a.pruefdatum);
}

export async function getPruefberichteFuerGeraet(_geraetId: string): Promise<Pruefbericht[]> {
  return [...MOCK_PRUEFBERICHTE].sort(compareByPruefdatumDesc);
}
