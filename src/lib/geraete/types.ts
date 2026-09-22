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
  artikelTyp: string | null;
  artikelDimension: string | null;
  // Kunden-eigene Gerätebezeichnung (Dataverse bmvcc_KundenID) — siehe PROJ-7.
  // Noch nicht synchronisiert (siehe PROJ-1 Decision Log), daher aktuell
  // immer null; /backend befüllt dies über die PROJ-1-Sync-Erweiterung.
  kundenId: string | null;
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
