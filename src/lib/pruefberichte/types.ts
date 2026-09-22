export type Pruefbericht = {
  id: string;
  pruefdatum: string | null; // ISO date, or null if not recorded
  ergebnis: string | null;
  bemerkungen: string | null;
  pruefer: string | null;
};

// PROJ-9: ein Prüfbericht in der firmenweiten Übersicht, angereichert um
// das zugehörige Gerät (fehlt bei der Pro-Gerät-Liste aus PROJ-4, da dort
// der Kontext durch die Detailseite bereits klar ist).
export type PruefberichtMitGeraet = Pruefbericht & {
  geraetId: string;
  geraetLabel: string;
};

// "alle" = kein Zeitraum-Filter (Standard, siehe PROJ-9 Spec).
export type Zeitraum = "30" | "90" | "365" | "alle";

export type PruefberichteFirmaQuery = {
  zeitraum?: Zeitraum;
  seite?: number;
};

export type PruefberichteFirmaResult = {
  items: PruefberichtMitGeraet[];
  total: number;
  page: number;
  pageSize: number;
};
