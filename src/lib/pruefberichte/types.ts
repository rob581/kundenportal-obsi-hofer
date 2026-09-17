export type Pruefbericht = {
  id: string;
  pruefdatum: string | null; // ISO date, or null if not recorded
  ergebnis: string | null;
  bemerkungen: string | null;
  pruefer: string | null;
};
