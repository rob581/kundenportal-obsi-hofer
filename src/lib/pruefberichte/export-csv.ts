import { escapeCsvCell } from "@/lib/geraete/export-csv";
import type { PruefberichtMitGeraet } from "./types";

type Spalte = { label: string; getValue: (bericht: PruefberichtMitGeraet) => string | null };

// Anders als beim Geräte-Export (PROJ-8) gibt es hier kein Zusatzspalten-
// Konzept — Prüfberichte haben keine pro Firma konfigurierbare Feldauswahl,
// daher ein einziges, festes Spalten-Set (siehe PROJ-10 Decision Log).
const SPALTEN: Spalte[] = [
  { label: "Gerät", getValue: (b) => b.geraetLabel },
  { label: "Datum", getValue: (b) => b.pruefdatum },
  { label: "Ergebnis", getValue: (b) => b.ergebnis },
  { label: "Bemerkungen", getValue: (b) => b.bemerkungen },
  { label: "Prüfer", getValue: (b) => b.pruefer },
];

// Semikolon statt Komma, UTF-8 mit BOM, CSV-Injection-Schutz — identisches
// Format zu PROJ-8, nutzt dieselbe escapeCsvCell-Hilfsfunktion.
export function buildPruefberichteExportCsv(items: PruefberichtMitGeraet[]): string {
  const header = SPALTEN.map((spalte) => escapeCsvCell(spalte.label)).join(";");
  const zeilen = items.map((bericht) => SPALTEN.map((spalte) => escapeCsvCell(spalte.getValue(bericht))).join(";"));

  return "﻿" + [header, ...zeilen].join("\r\n");
}
