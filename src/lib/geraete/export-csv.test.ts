import { describe, it, expect } from "vitest";
import { escapeCsvCell, buildGeraeteExportCsv } from "./export-csv";
import type { Geraet } from "./types";

function makeGeraet(overrides: Partial<Geraet> = {}): Geraet {
  return {
    id: "g1",
    name: "Testgerät",
    seriennummer: "SN-1",
    barcode: "BC-1",
    status: "Freigabe",
    letztePruefung: "2026-01-15",
    ablegereife: "2030-01-15",
    herstelljahr: "2019",
    standortName: "Hauptlager Zürich",
    lagerort: "Regal 3",
    pruefer: "M. Muster",
    zubehoer: "Gurt",
    bemerkungen: "Alles ok",
    artikelBezeichnung: "Feuerlöscher 6kg ABC",
    artikelHersteller: "GLORIA",
    artikelNorm: "EN 3",
    artikelTyp: "Typ A",
    artikelDimension: "10mm",
    kundenId: "KD-1",
    pruefBemerkung: null,
    ...overrides,
  };
}

describe("escapeCsvCell", () => {
  it("returns an empty string for null (never the '—' UI placeholder)", () => {
    expect(escapeCsvCell(null)).toBe("");
  });

  it("passes plain values through unchanged", () => {
    expect(escapeCsvCell("Regal 3")).toBe("Regal 3");
  });

  it("quotes values containing the semicolon delimiter", () => {
    expect(escapeCsvCell("a;b")).toBe('"a;b"');
  });

  it("quotes and doubles internal quotes", () => {
    expect(escapeCsvCell('Sagt "Hallo"')).toBe('"Sagt ""Hallo"""');
  });

  it("quotes values containing a line break", () => {
    expect(escapeCsvCell("Zeile 1\nZeile 2")).toBe('"Zeile 1\nZeile 2"');
  });

  it.each(["=cmd", "+1", "-1", "@SUM(1)"])(
    "prefixes formula-like values (%s) with an apostrophe to prevent CSV injection",
    (value) => {
      expect(escapeCsvCell(value)).toBe(`'${value}`);
    }
  );

  it("does not alter a value that merely contains one of the formula characters mid-string", () => {
    expect(escapeCsvCell("Preis = 10")).toBe("Preis = 10");
  });
});

describe("buildGeraeteExportCsv", () => {
  it("starts with a UTF-8 BOM", () => {
    const csv = buildGeraeteExportCsv([], []);
    expect(csv.startsWith("﻿")).toBe(true);
  });

  it("always includes the standard/detail columns in the fixed order, even with no Zusatzspalten", () => {
    const csv = buildGeraeteExportCsv([], []);
    const header = csv.replace("﻿", "").split("\r\n")[0];
    expect(header).toBe(
      "Gerätename;Gerät;Status;Lagerort;Letzte Prüfung;Bemerkung Prüfung;Standort;Ablegereife;Prüfer;Herstelljahr;Hersteller;Norm"
    );
  });

  it("appends activated Zusatzspalten after the always-included columns", () => {
    const csv = buildGeraeteExportCsv([], [{ label: "KundenID", getValue: (g) => g.kundenId }]);
    const header = csv.replace("﻿", "").split("\r\n")[0];
    expect(header.endsWith(";KundenID")).toBe(true);
  });

  it("renders one row per Gerät with semicolon-separated values", () => {
    const geraet = makeGeraet();
    const csv = buildGeraeteExportCsv([geraet], []);
    const [, row] = csv.replace("﻿", "").split("\r\n");

    expect(row).toBe(
      "Testgerät;Feuerlöscher 6kg ABC EN 3 Typ A 10mm GLORIA;Freigabe;Regal 3;2026-01-15;;Hauptlager Zürich;2030-01-15;M. Muster;2019;GLORIA;EN 3"
    );
  });

  it("leaves cells empty (not '—') for missing values", () => {
    const geraet = makeGeraet({ lagerort: null, pruefer: null });
    const csv = buildGeraeteExportCsv([geraet], []);
    const [, row] = csv.replace("﻿", "").split("\r\n");
    const cells = row.split(";");

    expect(cells[3]).toBe(""); // Lagerort
    expect(cells[8]).toBe(""); // Prüfer
  });

  // PROJ-3 Nachtrag 2026-10-09: Bemerkung des aktuellen Prüfberichts,
  // ungekürzt, mehrzeilig korrekt maskiert.
  it("exports the full Prüfbericht remark right after 'Letzte Prüfung', quoting line breaks", () => {
    const bemerkung = "Gurt leicht ausgefranst; beobachten\nNächste Prüfung vorziehen";
    const geraet = makeGeraet({ pruefBemerkung: bemerkung });
    const csv = buildGeraeteExportCsv([geraet], []).replace("﻿", "");

    const header = csv.split("\r\n")[0].split(";");
    expect(header.indexOf("Bemerkung Prüfung")).toBe(header.indexOf("Letzte Prüfung") + 1);
    expect(csv).toContain('"Gurt leicht ausgefranst; beobachten\nNächste Prüfung vorziehen"');
  });
});
