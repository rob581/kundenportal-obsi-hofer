import type { Geraet } from "./types";

// Replaces the Gerätename in the Übersicht and on the Detailseite with a
// combined Artikel description, per the user's own formula:
// Modellartikel & " " & ArtikelENNorm & " " & ArtikelTyp & " " &
// ArtikelDimension & " " & HerstellerName
// (= bezeichnung, norm, artikeltyp, dimension, hersteller). Empty/missing
// parts are skipped rather than leaving stray double spaces.
export function formatArtikelInfo(
  geraet: Pick<
    Geraet,
    "artikelBezeichnung" | "artikelNorm" | "artikelTyp" | "artikelDimension" | "artikelHersteller" | "name"
  >
): string {
  const teile = [
    geraet.artikelBezeichnung,
    geraet.artikelNorm,
    geraet.artikelTyp,
    geraet.artikelDimension,
    geraet.artikelHersteller,
  ].filter((teil): teil is string => !!teil && teil.trim().length > 0);

  if (teile.length === 0) {
    return geraet.name ?? "(ohne Angaben)";
  }

  return teile.join(" ");
}
