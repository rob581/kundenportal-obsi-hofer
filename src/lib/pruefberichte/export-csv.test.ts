import { describe, it, expect } from "vitest";
import { buildPruefberichteExportCsv } from "./export-csv";
import type { PruefberichtMitGeraet } from "./types";

function makeBericht(overrides: Partial<PruefberichtMitGeraet> = {}): PruefberichtMitGeraet {
  return {
    id: "pb1",
    pruefdatum: "2026-01-15",
    ergebnis: "Freigabe",
    bemerkungen: "Alles ok",
    pruefer: "M. Keller",
    geraetId: "g1",
    geraetLabel: "Feuerlöscher 6kg ABC",
    geraetName: "FL-EG-003",
    ...overrides,
  };
}

// Feinheiten wie Semikolon-Quoting, Formel-Escaping und die BOM-Byte-Sequenz
// sind bereits ausführlich für escapeCsvCell in src/lib/geraete/export-csv.test.ts
// getestet (wird hier wiederverwendet) — dieser Test deckt nur das
// Prüfberichte-spezifische Spalten-Mapping ab.
describe("buildPruefberichteExportCsv", () => {
  it("starts with a UTF-8 BOM", () => {
    const csv = buildPruefberichteExportCsv([]);
    expect(csv.startsWith("﻿")).toBe(true);
  });

  it("has exactly the six fixed columns, no Zusatzspalten-Konzept", () => {
    const csv = buildPruefberichteExportCsv([]);
    const header = csv.replace("﻿", "").split("\r\n")[0];
    expect(header).toBe("Gerät;Gerätename;Datum;Ergebnis;Bemerkungen;Prüfer");
  });

  it("renders one row per Prüfbericht with semicolon-separated values", () => {
    const csv = buildPruefberichteExportCsv([makeBericht()]);
    const [, row] = csv.replace("﻿", "").split("\r\n");

    expect(row).toBe("Feuerlöscher 6kg ABC;FL-EG-003;2026-01-15;Freigabe;Alles ok;M. Keller");
  });

  it("leaves cells empty (not '—') for missing values", () => {
    const bericht = makeBericht({ bemerkungen: null, pruefer: null });
    const csv = buildPruefberichteExportCsv([bericht]);
    const [, row] = csv.replace("﻿", "").split("\r\n");
    const cells = row.split(";");

    expect(cells[4]).toBe(""); // Bemerkungen
    expect(cells[5]).toBe(""); // Prüfer
  });

  it("escapes a formula-like Bemerkung to prevent CSV injection", () => {
    const bericht = makeBericht({ bemerkungen: "=cmd" });
    const csv = buildPruefberichteExportCsv([bericht]);
    const [, row] = csv.replace("﻿", "").split("\r\n");

    expect(row).toContain("'=cmd");
  });
});
