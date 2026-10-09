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
  // PROJ-3 Nachtrag 2026-10-09: Bemerkung des aktuellen Prüfberichts
  // (neuestes Prüfdatum, gelöschte ausgenommen) — nicht zu verwechseln mit
  // `bemerkungen` (Bemerkung am Gerät, PROJ-7-Zusatzspalte).
  pruefBemerkung: string | null;
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
  // PROJ-3 Nachtrag 2: auf einen Standort einschränken. Wird nur angewendet,
  // wenn er unter den freigegebenen Standorten der Firma ist — sonst leer.
  standortId?: string;
};

export type StandortOption = { id: string; name: string };

export type GeraeteResult = {
  items: Geraet[];
  total: number;
  page: number;
  pageSize: number;
  statusOptions: string[];
  // PROJ-3 Nachtrag 2: alle freigegebenen Standorte der Firma, alphabetisch —
  // Filter und Spalte erscheinen nur bei mehr als einem.
  standortOptions: StandortOption[];
};
