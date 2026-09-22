import type { PruefberichteFirmaQuery, PruefberichteFirmaResult, PruefberichtMitGeraet } from "./types";

const PAGE_SIZE = 25;

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const GERAETE = [
  { id: "mock-g1", label: "Feuerlöscher 6kg ABC EN 3 GLORIA" },
  { id: "mock-g2", label: "Rauchmelder Typ X" },
  { id: "mock-g3", label: "Absturzsicherung Kran" },
  { id: "mock-g4", label: "Erste-Hilfe-Koffer Büro EG" },
  { id: "mock-g5", label: "Notlicht Treppenhaus" },
];

const ERGEBNISSE = ["Freigabe", "keine Freigabe", "letzte Freigabe"];

// Mock-Data-Schicht (PROJ-9 Frontend-Phase) — ignoriert firmaId/Filter bewusst
// wie bei den anderen Features in ihrer jeweiligen Mock-Phase (PROJ-3/4/5/7).
// Deckt alle UI-Zustände ab: mehrere Geräte, verschiedene Ergebnisse, leere
// Bemerkungen, ein Datum ohne Prüfer, und genug Einträge für Paginierung.
export async function getPruefberichteFuerFirma(
  _firmaId: string,
  query: PruefberichteFirmaQuery
): Promise<PruefberichteFirmaResult> {
  const alle: PruefberichtMitGeraet[] = Array.from({ length: 40 }, (_, i) => {
    const geraet = GERAETE[i % GERAETE.length];
    return {
      id: `mock-pb-${i}`,
      pruefdatum: daysAgo(i * 10),
      ergebnis: ERGEBNISSE[i % ERGEBNISSE.length],
      bemerkungen: i % 4 === 0 ? null : `Bemerkung zu Prüfung ${i}`,
      pruefer: i % 7 === 0 ? null : "M. Muster",
      geraetId: geraet.id,
      geraetLabel: geraet.label,
    };
  });

  const cutoffTage = query.zeitraum && query.zeitraum !== "alle" ? Number(query.zeitraum) : null;
  const gefiltert = cutoffTage
    ? alle.filter((pb) => pb.pruefdatum && pb.pruefdatum >= daysAgo(cutoffTage))
    : alle;

  const page = Math.max(1, query.seite ?? 1);
  const start = (page - 1) * PAGE_SIZE;

  return {
    items: gefiltert.slice(start, start + PAGE_SIZE),
    total: gefiltert.length,
    page,
    pageSize: PAGE_SIZE,
  };
}
