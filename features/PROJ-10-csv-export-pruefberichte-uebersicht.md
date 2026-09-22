# PROJ-10: CSV-Export der Prüfberichte-Übersicht

## Status: In Progress
**Created:** 2026-09-22
**Last Updated:** 2026-09-22

## Dependencies
- Requires: PROJ-9 (Prüfberichte-Übersicht) — exportiert deren gefilterte Liste
- Requires: PROJ-8 (CSV-Export der Geräte-Übersicht) — liefert das bereits etablierte CSV-Format/-Muster (Trennzeichen, Encoding, Escaping, Download-Mechanismus), das hier wiederverwendet wird

## User Stories
- Als Kunde möchte ich meine (nach Zeitraum gefilterten) Prüfberichte als CSV-Datei herunterladen können, damit ich sie in Excel oder einem eigenen Reporting-Tool weiterverwenden kann.
- Als Kunde möchte ich beim Export nicht auf die aktuell angezeigte Seite beschränkt sein, sondern alle zum gewählten Zeitraum passenden Prüfberichte erhalten.
- Als Kunde möchte ich, dass der Export dieselben Spalten wie die Tabelle enthält (Gerät, Datum, Ergebnis, Bemerkungen, Prüfer).
- Als OBSI Hofer GmbH möchte ich, dass der Export in Schweizer Excel korrekt aussieht (Umlaute, Spaltentrennung).

## Out of Scope
- Zusatzspalten-Konzept wie bei PROJ-8/PROJ-7 — nicht anwendbar, Prüfberichte haben keine pro Firma konfigurierbare Feldauswahl
- Weitere Dateiformate (Excel .xlsx, PDF) — nur CSV
- Geplante/automatische Exporte — Non-Goal laut PRD
- Eigene Spaltenauswahl durch den Kunden für den Export
- Export der Pro-Gerät-Prüfberichte-Liste (PROJ-4, auf der Geräte-Detailseite) — nur die firmenweite Übersicht (PROJ-9) wird exportiert
- Künstliche Obergrenze für die Anzahl exportierbarer Prüfberichte

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Kunde ist auf der Prüfberichte-Übersicht mit mindestens einem Treffer, wenn er auf "Als CSV exportieren" klickt, dann wird eine CSV-Datei mit dem Namen `pruefberichte-uebersicht-YYYY-MM-DD.csv` heruntergeladen
- [ ] Angenommen der Zeitraum-Filter ist gesetzt (z.B. "Letzte 30 Tage"), wenn der Export ausgelöst wird, dann enthält die CSV ausschliesslich die Prüfberichte, die diesem Zeitraum entsprechen, über alle Seiten hinweg (nicht nur die aktuell angezeigte Seite)
- [ ] Angenommen der Zeitraum-Filter steht auf "Alle", wenn der Export ausgelöst wird, dann enthält die CSV alle Prüfberichte ohne Zeit-Einschränkung
- [ ] Angenommen die CSV wird erstellt, dann enthält sie genau die Spalten Gerät, Datum, Ergebnis, Bemerkungen, Prüfer
- [ ] Angenommen die aktuellen Filter liefern keine Treffer, wenn der Kunde die Seite betrachtet, dann ist der "Als CSV exportieren"-Button deaktiviert
- [ ] Angenommen der Export schlägt fehl (z.B. Datenbank kurzzeitig nicht erreichbar), wenn der Kunde auf "Als CSV exportieren" klickt, dann erscheint eine Fehlermeldung, es wird keine Datei heruntergeladen, und der Kunde bleibt auf der Seite
- [ ] Angenommen ein Bemerkungsfeld beginnt mit einem Zeichen wie `=`/`+`/`-`/`@`, wenn die CSV erstellt wird, dann wird der Wert so escaped, dass Excel ihn nicht als Formel interpretiert
- [ ] Angenommen die Datei wird in Excel (Schweizer/deutsche Version) geöffnet, dann werden Spalten korrekt getrennt (Semikolon) und Umlaute korrekt dargestellt (UTF-8 mit BOM)
- [ ] Angenommen der Export-Endpoint wird mit einem ungültigen oder fehlenden Zeitraum-Wert aufgerufen, dann wird das wie "Alle" behandelt, statt mit einem Serverfehler abzubrechen (behebt PROJ-9 BUG-1)

## Edge Cases
- Firma mit vielen Prüfberichten/Geräten → Export darf nicht am selben Problem scheitern wie der bereits behobene Dashboard-Bug (PROJ-5 BUG-2) — muss intern batched abgefragt werden, analog zu PROJ-8/PROJ-9
- Bemerkungsfeld enthält das Trennzeichen Semikolon oder einen Zeilenumbruch → wird gemäss CSV-Standard in Anführungszeichen gesetzt
- Fehlender Wert (z.B. kein Prüfer erfasst) → Zelle bleibt leer statt "—" (konsistent mit PROJ-8)
- Kunde mit mehreren Firmen wechselt die aktive Firma (PROJ-2) → Export bezieht sich immer auf die aktuell ausgewählte Firma
- Der Export-Endpoint erhält einen manipulierten/unbekannten `zeitraum`-Query-Parameter direkt (nicht über die UI) → fällt sicher auf "Alle" zurück statt abzustürzen (siehe AC zu PROJ-9 BUG-1)

## Technical Requirements (optional)
- Zugriffsbeschränkung: Export-Abfrage ist serverseitig auf die aktuell ausgewählte Firma beschränkt, identische Firma-Isolation wie PROJ-9
- Performance: Muss auch bei Firmen mit vielen Geräten/Prüfberichten zuverlässig funktionieren (Batching-Strategie analog zu PROJ-9/PROJ-8)
- Voraussetzung: `zeitraumCutoff` (aus PROJ-9) muss robust gegen ungültige/fehlende Werte gemacht werden, bevor der Export-Endpoint sie eigenständig (unabhängig von der Seiten-Validierung) entgegennimmt — behebt PROJ-9 BUG-1
- Format: CSV mit Semikolon als Trennzeichen, UTF-8 mit BOM, Standard-Quoting, CSV-Injection-Schutz — identisch zu PROJ-8

## Open Questions
Keine offenen Fragen — alle Kernentscheidungen wurden im Interview getroffen.

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Export übernimmt alle Konventionen aus PROJ-8 (Zeilen-Umfang, Format, Button-Verhalten, Dateiname-Muster) | Konsistenz für den Kunden über beide Exporte hinweg, keine Notwendigkeit für abweichende Entscheidungen | 2026-09-22 |
| Spalten = exakt die fünf Tabellenspalten (Gerät, Datum, Ergebnis, Bemerkungen, Prüfer), kein Zusatzspalten-Konzept | Prüfberichte haben keine PROJ-7-artige, pro Firma konfigurierbare Feldauswahl — es gibt schlicht keine weiteren Felder zu exportieren | 2026-09-22 |
| Behebung von PROJ-9 BUG-1 (`zeitraumCutoff`-Robustheit) als Teil dieses Features eingeplant | Der Export-Endpoint parst den `zeitraum`-Parameter eigenständig (wie bei PROJ-8s Route Handler), unabhängig von der bereits validierenden Seite — die Funktion muss daher selbst robust sein | 2026-09-22 |
| Export der Pro-Gerät-Liste (PROJ-4) bewusst nicht mit exportierbar | Nur 2-3 Einträge pro Gerät, auf der Detailseite bereits vollständig sichtbar — kein Mehrwert für einen Export | 2026-09-22 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Neuer Route Handler (`src/app/api/pruefberichte/export`) statt Server Action | Gleiche Begründung wie PROJ-8: ein Datei-Download braucht eine echte, navigierbare URL mit HTTP-Headern (Dateiname, Dateityp) | 2026-09-22 |
| Route Handler prüft die Kunden-Session selbst | API-Routen liegen ausserhalb der automatischen Schutzschicht von `(protected)/layout.tsx` — identisches Muster wie PROJ-8 | 2026-09-22 |
| Neue Funktion `getPruefberichteExportRows(firmaId, { zeitraum })` erweitert `pruefberichte/queries.ts`, wiederverwendet dieselbe Firma→Geräte-Auflösung, Chunking- und Sortierlogik wie `getPruefberichteFuerFirma` (PROJ-9), aber ohne die Paginierungs-Slice — alle Treffer werden zurückgegeben | Vermeidet eine zweite unabhängige Implementierung derselben Firma-Isolation/Filterlogik | 2026-09-22 |
| Geräte-/Artikel-Anreicherung für die "Gerät"-Spalte erfolgt für **alle** Treffer, nicht nur eine Seite (anders als PROJ-9) — dafür genauso gebatcht wie die Prüfberichte-Abfrage selbst | Der Export enthält per Definition alle Treffer; die Anzahl unterschiedlicher Geräte darüber kann gross sein und braucht daher dieselbe Chunking-Vorsicht wie die Haupt-Abfrage | 2026-09-22 |
| `zeitraumCutoff` (PROJ-9) wird robust gegen ungültige/fehlende Werte gemacht (fällt auf "kein Filter" zurück statt eine Exception zu werfen) | Behebt PROJ-9 BUG-1 — der Export-Endpoint liest `zeitraum` eigenständig aus der URL, ohne die Validierung der Seite zu durchlaufen | 2026-09-22 |
| Eigene, kleine CSV-Bau-Funktion (`buildPruefberichteExportCsv`) statt Wiederverwendung/Verallgemeinerung von `buildGeraeteExportCsv` (PROJ-8) — nutzt aber dieselbe `escapeCsvCell`-Hilfsfunktion | Die beiden Export-Formate (Geräte vs. Prüfberichte) haben unterschiedliche, feste Spaltensets ohne Zusatzspalten-Konzept bei Prüfberichten — eine gemeinsame Abstraktion würde hier nur unnötige Komplexität hinzufügen; das eigentlich wiederverwendbare Stück (Zell-Escaping) wird geteilt | 2026-09-22 |
| Kein neues Package für die CSV-Erzeugung | Gleiche Begründung wie PROJ-8 | 2026-09-22 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponenten-Struktur

```
/pruefberichte (bestehende PROJ-9-Seite, erweitert)
├── AppHeader (unverändert)
├── Zeitraum-Filter (unverändert)
├── NEU: "Als CSV exportieren"-Button (Client-Component mit fetch()+Blob-Download,
│        gleicher Mechanismus wie PROJ-8 — kein einfacher Link, da Fehler
│        laut Spec auf der Seite bleiben und angezeigt werden müssen)
└── Prüfberichte-Tabelle (unverändert)

NEU: /api/pruefberichte/export (Route Handler)
├── Prüft die Kunden-Session selbst (wie PROJ-8, ausserhalb der (protected)-Schutzschicht)
├── Löst die aktuell ausgewählte Firma auf
├── Liest den zeitraum-Parameter (jetzt robust gegen ungültige Werte, siehe Technical Decisions)
├── Baut die vollständige, ungepaginierte Prüfberichte-Liste inkl. Gerät-Label für alle Treffer
└── Liefert eine CSV-Datei als Download-Antwort (Dateiname, Content-Type als HTTP-Header)
```

### Datenmodell (in Textform)

- Kein neues Datenfeld, keine neue Tabelle — der Export liest exakt dieselben Daten wie die Prüfberichte-Übersicht (PROJ-9), nur ohne die 25er-Seitenbegrenzung
- Jede Export-Zeile entspricht einem Prüfbericht mit den fünf Feldern Gerät, Datum, Ergebnis, Bemerkungen, Prüfer
- Die Datei wird nicht gespeichert — sie entsteht bei jedem Klick frisch aus der Datenbank und wird direkt zum Download geschickt

### Technische Entscheidungen (Begründung)
Siehe Decision Log → Technical Decisions oben.

### Abhängigkeiten (Packages)
Keine neuen — nutzt die bestehende Supabase-Anbindung, keine externe CSV-Bibliothek nötig.

## Implementation Notes (Frontend)

- `src/components/export-csv-button.tsx` (PROJ-8) wiederverwendet statt dupliziert — die Komponente war bereits generisch (`href`/`disabled`-Props, kein Bezug zu Geräten im Verhalten). Einzige Anpassung: Fallback-Dateiname von `"geraete-uebersicht.csv"` auf das generische `"export.csv"` geändert (greift ohnehin nur, falls der Server ausnahmsweise keinen `Content-Disposition`-Header sendet).
- `src/components/pruefberichte-filter-bar.tsx`: eigenen `mb-4` entfernt, `flex-1` ergänzt — gleiche Umstrukturierung wie bei `GeraeteFilterBar` in PROJ-8, damit der neue Export-Button ohne doppelten Abstand daneben Platz hat.
- `src/app/(protected)/pruefberichte/page.tsx`: `PruefberichteFilterBar` und `ExportCsvButton` in einem gemeinsamen Flex-Wrapper (identisches Muster wie `/uebersicht`, PROJ-8). Export-Link übernimmt nur `zeitraum` (falls nicht "alle"), lässt `seite` bewusst weg.
- Der Route Handler `/api/pruefberichte/export` existiert noch nicht — der Button führt bis `/backend` zu einem Fehler beim Klick (Content-Type-Check schlägt fehl, zeigt die normale Fehlermeldung). Kein Mock nötig, gleiche Begründung wie bei PROJ-8.
- `npx tsc --noEmit`, `npx eslint`, `npx vitest run` (127 Tests, unverändert) und `npm run build` laufen fehlerfrei durch.
- Noch offen (für `/backend`): der eigentliche Route Handler, `getPruefberichteExportRows` (ungepaginiert, mit für alle Treffer gebatchter Geräte-/Artikel-Anreicherung), robuste `zeitraumCutoff`-Behandlung (behebt PROJ-9 BUG-1), und `buildPruefberichteExportCsv`.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
