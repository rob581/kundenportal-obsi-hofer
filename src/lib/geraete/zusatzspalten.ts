import type { Geraet } from "./types";

export type ZusatzspalteKey =
  | "seriennummer"
  | "barcode"
  | "kundenId"
  | "zubehoer"
  | "bemerkungen"
  | "artikelTyp"
  | "artikelDimension";

type Zusatzspalte = {
  key: ZusatzspalteKey;
  label: string;
  getValue: (geraet: Geraet) => string | null;
};

// Feste Anzeige-Reihenfolge alle Firmen (siehe PROJ-7 Tech Design) — eine
// Firma-Konfiguration speichert nur, WELCHE Keys aktiv sind, nicht deren
// Reihenfolge.
export const ZUSATZSPALTEN_POOL: Zusatzspalte[] = [
  { key: "seriennummer", label: "Seriennummer", getValue: (g) => g.seriennummer },
  { key: "barcode", label: "Barcode", getValue: (g) => g.barcode },
  { key: "kundenId", label: "KundenID", getValue: (g) => g.kundenId },
  { key: "zubehoer", label: "Zubehör", getValue: (g) => g.zubehoer },
  { key: "bemerkungen", label: "Bemerkungen", getValue: (g) => g.bemerkungen },
  { key: "artikelTyp", label: "Typ", getValue: (g) => g.artikelTyp },
  { key: "artikelDimension", label: "Dimension", getValue: (g) => g.artikelDimension },
];

// Unbekannte Keys (Tippfehler in der manuell gepflegten Konfiguration) werden
// stillschweigend ignoriert statt einen Fehler zu werfen (siehe Acceptance
// Criteria); Duplikate fallen durch den Filter über ZUSATZSPALTEN_POOL
// automatisch weg.
export function resolveZusatzspalten(aktivierteKeys: string[]): Zusatzspalte[] {
  const aktiv = new Set(aktivierteKeys);
  return ZUSATZSPALTEN_POOL.filter((spalte) => aktiv.has(spalte.key));
}
