import { formatArtikelInfo } from "./artikel-info";
import type { Geraet } from "./types";

type Spalte = { label: string; getValue: (geraet: Geraet) => string | null };

// Immer enthalten (Standard-Tabellenspalten + Detailseite-Felder, die nicht
// Teil des PROJ-7-Zusatzspalten-Pools sind) — siehe PROJ-8 Spec Decision Log.
const ALWAYS_COLUMNS: Spalte[] = [
  { label: "Gerät", getValue: (g) => formatArtikelInfo(g) },
  { label: "Gerätename", getValue: (g) => g.name },
  { label: "Status", getValue: (g) => g.status },
  { label: "Lagerort", getValue: (g) => g.lagerort },
  { label: "Letzte Prüfung", getValue: (g) => g.letztePruefung },
  { label: "Standort", getValue: (g) => g.standortName },
  { label: "Ablegereife", getValue: (g) => g.ablegereife },
  { label: "Prüfer", getValue: (g) => g.pruefer },
  { label: "Herstelljahr", getValue: (g) => g.herstelljahr },
  { label: "Hersteller", getValue: (g) => g.artikelHersteller },
  { label: "Norm", getValue: (g) => g.artikelNorm },
];

// Werte, die mit einem dieser Zeichen beginnen, werden von Excel/Sheets als
// Formel interpretiert ("CSV-Injection") — ein führendes Apostroph zwingt sie
// zu reinem Text, ohne den sichtbaren Wert zu verändern.
const FORMULA_PREFIXES = ["=", "+", "-", "@"];

export function escapeCsvCell(value: string | null): string {
  if (value == null) return "";

  let cell = value;
  if (FORMULA_PREFIXES.some((prefix) => cell.startsWith(prefix))) {
    cell = `'${cell}`;
  }

  // RFC-4197-Quoting: nötig bei Trennzeichen, Anführungszeichen oder
  // Zeilenumbrüchen im Wert, sonst verrutscht die Spaltenaufteilung.
  if (/[;"\r\n]/.test(cell)) {
    cell = `"${cell.replace(/"/g, '""')}"`;
  }

  return cell;
}

// Semikolon statt Komma (Schweizer/deutsches Excel nutzt Komma als
// Dezimaltrennzeichen), UTF-8 mit BOM (sonst zeigt Excel unter Windows
// Umlaute falsch an) — siehe PROJ-8 Decision Log.
export function buildGeraeteExportCsv(items: Geraet[], zusatzspalten: Spalte[]): string {
  const spalten = [...ALWAYS_COLUMNS, ...zusatzspalten];
  const header = spalten.map((spalte) => escapeCsvCell(spalte.label)).join(";");
  const zeilen = items.map((geraet) => spalten.map((spalte) => escapeCsvCell(spalte.getValue(geraet))).join(";"));

  return "﻿" + [header, ...zeilen].join("\r\n");
}
