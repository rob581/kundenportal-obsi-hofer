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
  kundenId: string | null;
};

export type GeraeteQuery = {
  status?: string;
  suche?: string;
  seite?: number;
  // Deckt sich exakt mit der "Zu prüfen"-Kennzahl auf dem Dashboard (PROJ-5) —
  // siehe src/lib/geraete/zu-pruefen.ts.
  zuPruefen?: boolean;
  // Nur true, wenn die Firma die Zusatzspalte "kundenId" aktiviert hat (siehe
  // PROJ-7) — Suche über ein für die Firma unsichtbares Feld wäre verwirrend.
  sucheKundenId?: boolean;
};

export type GeraeteResult = {
  items: Geraet[];
  total: number;
  page: number;
  pageSize: number;
  statusOptions: string[];
};
