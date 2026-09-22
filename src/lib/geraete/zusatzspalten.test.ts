import { describe, it, expect } from "vitest";
import { ZUSATZSPALTEN_POOL, resolveZusatzspalten } from "./zusatzspalten";
import type { Geraet } from "./types";

const BASE_GERAET: Geraet = {
  id: "g1",
  name: "Testgerät",
  seriennummer: "SN-1",
  barcode: "BC-1",
  status: "Freigabe",
  letztePruefung: "2026-01-01",
  ablegereife: null,
  herstelljahr: null,
  standortName: null,
  lagerort: null,
  pruefer: null,
  zubehoer: "Gurt",
  bemerkungen: "Bemerkung",
  artikelBezeichnung: null,
  artikelHersteller: null,
  artikelNorm: null,
  artikelTyp: "Typ A",
  artikelDimension: "10mm",
  kundenId: "KD-1",
};

describe("resolveZusatzspalten", () => {
  it("returns an empty list for a Firma with no configured Zusatzspalten", () => {
    expect(resolveZusatzspalten([])).toEqual([]);
  });

  it("returns only the configured columns", () => {
    const result = resolveZusatzspalten(["seriennummer"]);
    expect(result.map((s) => s.key)).toEqual(["seriennummer"]);
  });

  it("always returns columns in the fixed pool order, regardless of config order", () => {
    const result = resolveZusatzspalten(["artikelDimension", "seriennummer", "kundenId"]);
    expect(result.map((s) => s.key)).toEqual(["seriennummer", "kundenId", "artikelDimension"]);
  });

  it("silently ignores unknown/invalid keys instead of throwing", () => {
    const result = resolveZusatzspalten(["seriennummer", "nicht-existent"]);
    expect(result.map((s) => s.key)).toEqual(["seriennummer"]);
  });

  it("deduplicates a key listed more than once in the config", () => {
    const result = resolveZusatzspalten(["seriennummer", "seriennummer"]);
    expect(result.map((s) => s.key)).toEqual(["seriennummer"]);
  });

  it("labels the KundenID column exactly \"KundenID\"", () => {
    const spalte = ZUSATZSPALTEN_POOL.find((s) => s.key === "kundenId");
    expect(spalte?.label).toBe("KundenID");
  });

  it("reads each column's value from the correct Geraet field", () => {
    for (const spalte of ZUSATZSPALTEN_POOL) {
      expect(spalte.getValue(BASE_GERAET)).not.toBeNull();
    }
    expect(ZUSATZSPALTEN_POOL.find((s) => s.key === "kundenId")?.getValue(BASE_GERAET)).toBe("KD-1");
  });

  it("returns null (renders as \"—\" on the page) when a Gerät has no value for the column", () => {
    const geraetOhneWerte: Geraet = { ...BASE_GERAET, kundenId: null, zubehoer: null };
    const zusatzspalten = resolveZusatzspalten(["kundenId", "zubehoer"]);
    expect(zusatzspalten.map((s) => s.getValue(geraetOhneWerte))).toEqual([null, null]);
  });
});
