export type Geraet = {
  id: string;
  name: string | null;
  seriennummer: string | null;
  barcode: string | null;
  status: string | null;
  letztePruefung: string | null; // ISO date, or null if never inspected
  ablegereife: string | null;
  herstelljahr: string | null;
  standortName: string | null;
  lagerort: string | null;
  pruefer: string | null;
  zubehoer: string | null;
  bemerkungen: string | null;
  artikelBezeichnung: string | null;
  artikelHersteller: string | null;
  artikelNorm: string | null;
};

export type GeraeteQuery = {
  status?: string;
  suche?: string;
  seite?: number;
};

export type GeraeteResult = {
  items: Geraet[];
  total: number;
  page: number;
  pageSize: number;
  statusOptions: string[];
};
