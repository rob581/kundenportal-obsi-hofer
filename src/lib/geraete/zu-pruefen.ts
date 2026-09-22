// Geteilt zwischen der Dashboard-Kennzahl (PROJ-5) und dem "Zu prüfen"-Filter
// der Geräte-Übersicht (PROJ-7-Nachtrag), damit beide exakt dieselben Geräte
// zählen/anzeigen — sonst würde ein Klick auf die Dashboard-Kachel eine Liste
// zeigen, die nicht zur angezeigten Anzahl passt.
//
// "Zu prüfen": kein Prüfdatum, oder älter als das (per Nutzerentscheidung
// akzeptierte) 360-Tage-Intervall. String-Vergleich funktioniert korrekt für
// ISO-Datumsstrings (YYYY-MM-DD), wie sie letzte_pruefung liefert.
const ZU_PRUEFEN_TAGE = 360;

export function getZuPruefenCutoff(): string {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ZU_PRUEFEN_TAGE);
  return cutoff.toISOString().slice(0, 10);
}
