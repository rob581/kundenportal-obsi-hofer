import { describe, it, expect } from "vitest";
import { formatArtikelInfo } from "./artikel-info";

describe("formatArtikelInfo", () => {
  it("joins all Artikel parts in order, separated by a single space", () => {
    const result = formatArtikelInfo({
      artikelBezeichnung: "Auffanggurt",
      artikelNorm: "EN 361",
      artikelTyp: "Komplettgurt",
      artikelDimension: "L-XL",
      artikelHersteller: "Petzl",
      name: "Absturzsicherung Kran 2",
    });

    expect(result).toBe("Auffanggurt EN 361 Komplettgurt L-XL Petzl");
  });

  it("skips missing/empty parts without leaving stray double spaces", () => {
    const result = formatArtikelInfo({
      artikelBezeichnung: "Feuerlöscher 6kg ABC",
      artikelNorm: null,
      artikelTyp: "",
      artikelDimension: null,
      artikelHersteller: "GLORIA",
      name: "Feuerlöscher Halle A",
    });

    expect(result).toBe("Feuerlöscher 6kg ABC GLORIA");
  });

  it("falls back to the Gerätename when no Artikel data is available at all", () => {
    const result = formatArtikelInfo({
      artikelBezeichnung: null,
      artikelNorm: null,
      artikelTyp: null,
      artikelDimension: null,
      artikelHersteller: null,
      name: "Notleuchte Treppenhaus",
    });

    expect(result).toBe("Notleuchte Treppenhaus");
  });

  it("falls back to a placeholder when neither Artikel data nor a Gerätename exists", () => {
    const result = formatArtikelInfo({
      artikelBezeichnung: null,
      artikelNorm: null,
      artikelTyp: null,
      artikelDimension: null,
      artikelHersteller: null,
      name: null,
    });

    expect(result).toBe("(ohne Angaben)");
  });
});
