# PROJ-10: CSV-Export der Prüfberichte-Übersicht

## Status: Deployed
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

## Implementation Notes (Backend)

- **PROJ-9 BUG-1 behoben:** `zeitraumCutoff` (`src/lib/pruefberichte/queries.ts`) validiert jetzt mit `Number.isFinite(tage) && tage > 0`, bevor ein Cutoff-Datum berechnet wird — ein ungültiger/nicht-numerischer/negativer Wert wird wie "alle" (kein Filter) behandelt statt eine `RangeError` zu werfen. Nimmt weiterhin bewusst einen rohen `string` entgegen, nicht den engeren `Zeitraum`-Typ, da der Export-Endpoint den Parameter direkt aus der URL liest, ohne die Validierung von `pruefberichte/page.tsx` zu durchlaufen.
- **Refactor zur Wiederverwendung:** Die bisher in `getPruefberichteFuerFirma` (PROJ-9) enthaltene Logik wurde in zwei geteilte Hilfsfunktionen aufgeteilt:
  - `fetchAllePruefberichteFuerFirma(firmaId, zeitraum)` — Firma→Geräte-Auflösung, gechunkte `dv_pruefberichte`-Abfrage, Sortierung; liefert **alle** Treffer, keine Paginierung
  - `anreichernMitGeraetLabel(rows)` — Geräte-/Artikel-Anreicherung für die "Gerät"-Spalte, jetzt selbst über die Geräte-IDs gechunkt (wichtiger Unterschied zu vorher: PROJ-9 nahm an, dass nie mehr als eine Seite/25 Zeilen angereichert werden müssen — für den Export gilt das nicht mehr)
  - `getPruefberichteFuerFirma` ruft beide auf und paginiert dazwischen (unverändertes Verhalten, per bestehenden Tests bestätigt); `getPruefberichteExportRows` (neu, PROJ-10) ruft beide ohne Paginierung auf
- Neues Modul `src/lib/pruefberichte/export-csv.ts`: `buildPruefberichteExportCsv` mit einem festen Fünf-Spalten-Set (Gerät, Datum, Ergebnis, Bemerkungen, Prüfer), nutzt `escapeCsvCell` aus `src/lib/geraete/export-csv.ts` (PROJ-8) wieder — keine eigene Escaping-Logik dupliziert.
- Neuer Route Handler `src/app/api/pruefberichte/export/route.ts` (`GET`): identisches Muster wie PROJ-8s Export-Route (Session-/Zugriffsprüfung selbst, `getCurrentFirmaId()`, `Content-Disposition: attachment`, 500 bei Fehler statt Crash).
- Kein neuer API-Endpoint für Zod-Validierung nötig — `zeitraum` ist ein einzelner optionaler String, dieselbe Behandlung wie bei PROJ-8/PROJ-9.
- 18 neue Tests: 7 in `pruefberichte/queries.test.ts` (leere Firma, unpaginiert, Firma-Isolation, Zeitraum-Filter, ungültiger Zeitraum als "alle" behandelt — für Export und für die bestehende `getPruefberichteFuerFirma`, gebatchte Anreicherung über 250 Geräte), 5 in `export-csv.test.ts` (BOM, feste Spaltenreihenfolge, Zeilen-Mapping, leere Zellen, Formel-Escaping), 6 in `route.test.ts` (Auth-Redirects, erfolgreicher Download inkl. BOM-Bytes, Parameter-Weitergabe inkl. `undefined`, 500 bei Fehler) — insgesamt 145 Tests grün.
- `npx tsc --noEmit`, `npx eslint`, `npx vitest run` und `npm run build` laufen fehlerfrei durch.

**Nachträgliche additive Ergänzung (2026-09-23, Nutzerwunsch):** `PruefberichtMitGeraet` um `geraetName` erweitert (rohes `dv_geraete.name`, unabhängig vom kombinierten `geraetLabel`), in `anreichernMitGeraetLabel` mitbefüllt und als neue Spalte "Gerätename" (nach "Gerät") in `buildPruefberichteExportCsv` ergänzt — identisch zur selben Ergänzung im PROJ-8-Export. Betrifft nur den CSV-Export, nicht die Prüfberichte-Übersichtsseite. Rein additiv.

## QA Test Results

**Tested:** 2026-09-22
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)

> Hinweis: Wie bei allen bisherigen Features lässt sich der echte Login nicht automatisiert/wiederholbar durchspielen. Die Export-Logik selbst (Firma-Isolation, Batching, CSV-Erzeugung, Zeitraum-Filter inkl. Robustheit gegen ungültige Werte) ist vollständig über Vitest-Tests abgedeckt.

### Acceptance Criteria Status

#### AC-1: Klick auf "Als CSV exportieren" lädt eine Datei mit korrektem Namen herunter
- [x] `route.test.ts` ("returns a CSV download with the correct headers on success") prüft `Content-Disposition: attachment; filename="pruefberichte-uebersicht-YYYY-MM-DD.csv"`

#### AC-2: Zeitraum-Filter gesetzt → Export enthält nur passende Prüfberichte, über alle Seiten hinweg
- [x] `queries.test.ts` ("respects the Zeitraum-Filter", "returns ALL matching Prüfberichte, not just a page") — 30 simulierte Berichte, keine Paginierungs-Begrenzung in `getPruefberichteExportRows`

#### AC-3: Zeitraum "Alle" → keine Zeit-Einschränkung im Export
- [x] Code-Review: `zeitraum: undefined` (kein Parameter gesendet, da `page.tsx` "alle" nicht in die URL schreibt) → `zeitraumCutoff` liefert `null`, kein Filter angewendet; `route.test.ts` bestätigt die `undefined`-Weitergabe

#### AC-4: CSV enthält genau die Spalten Gerät, Datum, Ergebnis, Bemerkungen, Prüfer
- [x] `export-csv.test.ts` ("has exactly the five fixed columns, no Zusatzspalten-Konzept")

#### AC-5: 0 Treffer → Export-Button deaktiviert
- [x] Code-Review: `ExportCsvButton disabled={result!.total === 0}` in `pruefberichte/page.tsx` (identische, bereits für PROJ-8 auditierte Komponente)

#### AC-6: Export schlägt fehl → Fehlermeldung, kein Download, Kunde bleibt auf der Seite
- [x] Code-Review: `ExportCsvButton` (PROJ-8, wiederverwendet) nutzt `fetch()` statt Navigation; `route.test.ts` bestätigt 500 bei Datenbankfehler, ohne dass die Route crasht

#### AC-7: Formel-Präfixe in Bemerkungen werden escaped
- [x] `export-csv.test.ts` ("escapes a formula-like Bemerkung to prevent CSV injection") — nutzt dieselbe, bereits für PROJ-8 mit allen vier Präfixen (`=`/`+`/`-`/`@`) getestete `escapeCsvCell`-Funktion

#### AC-8: Datei öffnet sich in Schweizer/deutschem Excel korrekt
- [x] `export-csv.test.ts` (Semikolon-Trennung, `﻿`-Präfix) + `route.test.ts` prüft die rohen Antwort-Bytes explizit auf die UTF-8-BOM-Sequenz (`EF BB BF`)

#### AC-9: Ungültiger/fehlender Zeitraum-Wert am Endpoint → wie "Alle" behandelt, kein Serverfehler (behebt PROJ-9 BUG-1)
- [x] `queries.test.ts` — zwei Tests: einer für `getPruefberichteExportRows`, einer für die bestehende `getPruefberichteFuerFirma` (beide nutzen dieselbe `zeitraumCutoff`) mit einem nicht-numerischen Wert; `route.test.ts` bestätigt die `undefined`-Weitergabe bei fehlendem Parameter

### Edge Cases Status

#### EC-1: Firma mit vielen Prüfberichten/Geräten (Batching)
- [x] `queries.test.ts` ("enriches every row with the Gerät's Artikel-Info label, even across many distinct Geräte") — 250 Geräte/Prüfberichte, `GERAET_ID_CHUNK_SIZE = 200` erzwingt mehrere Batches sowohl bei der Prüfberichte- als auch bei der neu gebatchten Geräte-Anreicherungs-Abfrage

#### EC-2: Bemerkungsfeld enthält Semikolon/Zeilenumbruch
- [x] Abgedeckt durch die bereits für PROJ-8 getestete, hier wiederverwendete `escapeCsvCell`-Funktion (keine Prüfberichte-spezifische Duplizierung nötig)

#### EC-3: Fehlender Wert → leer statt "—"
- [x] `export-csv.test.ts` ("leaves cells empty (not '—') for missing values")

#### EC-4: Firma-Wechsel → Export bezieht sich auf neu gewählte Firma
- [x] Code-Review: `firmaId` wird bei jedem Request frisch über `getCurrentFirmaId()` aufgelöst, identisches, bereits mehrfach auditiertes Muster

#### EC-5: Manipulierter/unbekannter `zeitraum`-Parameter direkt am Endpoint
- [x] Deckt sich mit AC-9 oben — abgedeckt

### Security Audit Results
- [x] **Authentication:** `/api/pruefberichte/export` ohne Session → Redirect zu `/login` (neuer Playwright-Test, live gegen die echte Next.js-Redirect-Implementierung) + `route.test.ts`
- [x] **Query-Parameter umgehen die Session-Prüfung nicht:** zweiter Playwright-Test mit `zeitraum` gesetzt, landet trotzdem auf `/login`
- [x] **Autorisierung/Firma-Isolation:** `firmaId` kommt ausschliesslich aus `getCurrentFirmaId()`, nie aus einem Query-Parameter; Prüfberichte werden ausschliesslich über die bereits firmengeprüfte Geräte-ID-Menge abgefragt (`queries.test.ts` "only includes Prüfberichte of Geräte belonging to the Firma") — kein IDOR-Vektor
- [x] **Auth-Reihenfolge korrekt:** Route prüft E-Mail + Portal-Zugriff selbst, bevor `getCurrentFirmaId()` aufgerufen wird — identisches, bereits für PROJ-8 auditiertes Muster
- [x] **Eingabevalidierung `zeitraum`:** jetzt robust gegen beliebige Strings (behebt PROJ-9 BUG-1) — kein Absturz, kein unerwartetes Verhalten bei manipulierten Werten
- [x] **CSV-Injection:** Alle fünf Zellwerte durchlaufen ausnahmslos `escapeCsvCell` (identische, bereits für PROJ-8 auditierte Funktion)
- [x] **Response-Header-Injection:** `Content-Disposition`-Dateiname wird ausschliesslich aus dem serverseitig berechneten Datum gebildet, nie aus Request-Daten
- [x] **Content-Type/Content-Disposition verhindert Inline-Rendering:** identisch zu PROJ-8
- [x] **Keine Secrets im Client-Code:** `getSupabaseAdmin` wird ausschliesslich in serverseitigen Dateien verwendet
- [x] **Rate-Limiting:** kein Rate-Limiting, gleiches bereits akzeptiertes Risikoprofil wie der PROJ-8-Export-Endpoint (BUG-1 dort) — kein neuer, eigenständiger Befund nötig, da identische Ursache/Einschätzung

### Bugs Found
Keine neuen Bugs. PROJ-9 BUG-1 (`zeitraumCutoff`-Robustheit) wurde im Rahmen dieses Features wie geplant behoben und ist oben unter AC-9 verifiziert.

### Automatisierte Tests
- **Unit-/Integrationstests (Vitest):** 145/145 grün gesamt — 7 neu in `pruefberichte/queries.test.ts`, 5 neu in `pruefberichte/export-csv.test.ts`, 6 neu in `api/pruefberichte/export/route.test.ts`
- **E2E-Tests (Playwright):** 38/38 grün gesamt (34 unverändert + 4 neu in `tests/PROJ-10-csv-export-pruefberichte.spec.ts` für Chromium + Mobile Safari)
- **Regression:** Alle bisherigen PROJ-1–9-Tests weiterhin grün — keine Regressionen durch PROJ-10, insbesondere nicht durch den Refactor von `getPruefberichteFuerFirma` (bestehende PROJ-9-Tests laufen unverändert weiter). `npx tsc --noEmit`, `npm run lint` und `npm run build` laufen vollständig fehlerfrei

### Summary
- **Acceptance Criteria:** 9/9 abgedeckt
- **Bugs Found:** 0 neue (PROJ-9 BUG-1 wie geplant behoben)
- **Security:** Solide — korrekte Firma-Isolation, robuste Eingabeverarbeitung, kein IDOR-/Injection-/Header-Injection-Vektor, keine Secrets im Client-Code
- **Production Ready:** JA
- **Recommendation:** Status auf "Approved" setzen.

## Deployment
- **Production URL:** https://obsi-hoferkundenportal.vercel.app
- **Deployed:** 2026-09-22 (automatisch via Vercel bei Push auf `main`, alle PROJ-10-Commits liefen bereits vor diesem `/deploy`-Schritt live)
- **Verifiziert:** `npm run build`/`npm run lint` lokal fehlerfrei vor jedem Push; keine neuen Umgebungsvariablen, keine neue Migration nötig. Live-Verifikation des eigentlichen Downloads (echte Firma-Daten, Zeitraum-Filter, Excel-Öffnen) steht beim Nutzer noch aus.
