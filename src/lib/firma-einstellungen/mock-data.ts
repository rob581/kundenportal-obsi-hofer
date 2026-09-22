import type { FirmaEinstellungen } from "./types";

// Mock-Data-Schicht (PROJ-7 Frontend-Phase) — ignoriert firmaId bewusst, wie
// bei den anderen Features in ihrer jeweiligen Mock-Phase (PROJ-3/4/5).
// Liefert testweise zwei aktive Zusatzspalten, damit sich das Verhalten
// (mehrere Spalten, feste Pool-Reihenfolge) im Browser prüfen lässt.
// /backend ersetzt nur die Funktionsinnereien durch eine echte Abfrage der
// neuen, vom Dataverse-Sync unabhängigen Supabase-Tabelle
// `portal_firma_einstellungen` (siehe PROJ-7 Tech Design) — gleiche async
// Signatur, keine Änderungen an den aufrufenden Seiten nötig.
export async function getFirmaEinstellungen(_firmaId: string): Promise<FirmaEinstellungen> {
  return { zusatzspalten: ["seriennummer", "kundenId"] };
}
