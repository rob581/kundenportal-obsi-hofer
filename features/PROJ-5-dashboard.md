# PROJ-5: Dashboard

## Status: Approved
**Created:** 2026-09-18
**Last Updated:** 2026-09-18

## Dependencies
- Requires: PROJ-1 (Dataverse-Sync-Service) — liefert Geräte- und Prüfberichts-Daten
- Requires: PROJ-2 (Kunden-Login) — liefert die aktuell ausgewählte Firma, auf die alle Kennzahlen eingeschränkt werden
- Requires: PROJ-3 (Geräte-Übersicht) — liefert den Status-Filter-Mechanismus (URL-Parameter `?status=...`), zu dem die Status-Kacheln verlinken

## User Stories
- Als Kunde möchte ich auf einen Blick sehen, wie viele meiner Geräte in welchem Status sind, damit ich schnell erkenne, ob Handlungsbedarf besteht.
- Als Kunde möchte ich die Gesamtzahl meiner Prüfberichte sehen, damit ich einen Überblick über den Umfang meiner Prüfhistorie habe.
- Als Kunde möchte ich sehen, wann zuletzt eines meiner Geräte geprüft wurde, damit ich weiss, wie aktuell der Stand ist.
- Als Kunde möchte ich von einer Status-Kachel direkt zur entsprechend gefilterten Geräteliste springen können, ohne den Filter manuell erneut zu setzen.
- Als Kunde einer Firma ohne Geräte möchte ich eine klare Leermeldung sehen, statt leerer oder verwirrender Kacheln.

## Out of Scope
- Zeitverlauf/Trends/Diagramme (z.B. "Prüfungen über die letzten 12 Monate") — nur aktuelle Momentaufnahme, keine historische Visualisierung
- PDF-/Excel-Export des Dashboards — kein Bedarf im MVP, kann später ergänzt werden
- Kombinierte Ansicht über mehrere Firmen gleichzeitig — wie bei PROJ-3/4 gilt strikt die aktuell ausgewählte Firma (siehe PROJ-2)
- Weitere Kennzahlen über die drei aus dem PRD hinaus (z.B. Anzahl Standorte, überfällige Prüfungen) — bewusst auf den ursprünglichen Scope begrenzt, kann per `/refine PROJ-5` ergänzt werden
- Bearbeiten/Interagieren über die Verlinkung zur Geräteliste hinaus — Dashboard ist rein lesend (siehe PRD, Portal ist read-only)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Kunde ist angemeldet und hat eine Firma ausgewählt, wenn er das Dashboard aufruft, dann werden die Kennzahlen (Total Geräte, Geräte pro Status, Total Prüfberichte, letzte Prüfung) für diese Firma angezeigt
- [ ] Angenommen die Firma hat Geräte in nur einem oder zwei der drei bekannten Status, wenn das Dashboard geladen wird, dann werden trotzdem alle drei Status-Kacheln (Freigabe, keine Freigabe, letzte Freigabe) angezeigt, fehlende mit dem Wert 0
- [ ] Angenommen mindestens ein Gerät der Firma hat keinen Status gesetzt (`null`), wenn das Dashboard geladen wird, dann erscheint eine zusätzliche "Kein Status"-Kachel mit der entsprechenden Anzahl
- [ ] Angenommen kein Gerät der Firma hat einen fehlenden Status, wenn das Dashboard geladen wird, dann erscheint keine "Kein Status"-Kachel
- [ ] Angenommen ein Kunde klickt auf eine Status-Kachel (z.B. "12 Freigabe"), dann wird er zur Geräte-Übersicht weitergeleitet, bereits nach diesem Status gefiltert
- [ ] Angenommen die Firma hat keine Geräte, wenn das Dashboard geladen wird, dann wird eine Leermeldung angezeigt statt leerer Kacheln
- [ ] Angenommen die Firma hat Geräte, aber keines wurde je geprüft, wenn das Dashboard geladen wird, dann zeigt die Kennzahl "letzte Prüfung" einen klaren Hinweis ("Noch nie geprüft") statt eines leeren oder falschen Datums
- [ ] Angenommen die Kennzahlen können nicht geladen werden (z.B. Datenbank kurzzeitig nicht erreichbar), wenn der Fehler auftritt, dann wird eine Fehlermeldung mit "Erneut versuchen"-Button angezeigt und Header/Abmelden bleiben nutzbar
- [ ] Angenommen ein Kunde ist auf der Geräte-Übersicht oder der Detailseite, wenn er einen neuen Navigations-Link im Header anklickt, dann gelangt er zum Dashboard, und umgekehrt zurück zur Übersicht
- [ ] Angenommen ein Gerät der Firma wurde noch nie geprüft oder zuletzt vor mehr als 360 Tagen, wenn das Dashboard geladen wird, dann wird dieses Gerät in der Kennzahl "Zu prüfen" mitgezählt; ein Gerät, dessen letzte Prüfung höchstens 360 Tage zurückliegt, wird nicht mitgezählt

## Edge Cases
- Firma ohne jegliche Geräte → Leermeldung analog zu PROJ-3, keine Kacheln mit 0
- Firma mit Geräten, aber ohne jemals erfassten Prüfbericht → "Total Prüfberichte: 0"
- Alle Geräte der Firma haben `letzte_pruefung = null` → "Noch nie geprüft" statt eines leeren/verwirrenden Feldes
- Ein Kunde mit mehreren Firmen wechselt die aktive Firma → alle drei Kennzahlen aktualisieren sich automatisch auf die neu gewählte Firma (kein gecachter Stand der vorherigen Firma)
- Sehr grosse Firma mit tausenden Geräten/Prüfberichten → Kennzahlen sind reine Zählwerte (Counts), keine vollständige Datensatzliste wird geladen — keine Performance-Sorge zu erwarten

## Technical Requirements (optional)
- Zugriffsbeschränkung: Kennzahlen-Abfrage ist serverseitig auf die aktuell ausgewählte Firma beschränkt, gleiche Firma-Isolation wie PROJ-3/PROJ-4
- Performance: Kennzahlen sind aggregierte Zählwerte (Counts/Max), keine Einzeldatensatz-Liste wird für die Anzeige geladen

## Open Questions
Keine offenen Fragen — alle Kernentscheidungen wurden im Interview getroffen.

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Dashboard als eigene Seite neben der Geräte-Übersicht, Übersicht bleibt Startseite | Kein Bruch der bestehenden Nutzergewohnheit aus PROJ-2/PROJ-3; Navigation über einen neuen Header-Link | 2026-09-18 |
| "Letzte Prüfung" = Maximum von `dv_geraete.letzte_pruefung` über alle Geräte der Firma | Konsistent mit der bereits in PROJ-1 getroffenen Entscheidung, dieses Feld direkt vom Gerät zu lesen statt aus Prüfberichten abzuleiten | 2026-09-18 |
| Status-Kacheln sind anklickbar und verlinken zur gefilterten Geräte-Übersicht (`/uebersicht?status=...`) | Verbindet Dashboard und Geräte-Übersicht sinnvoll; nutzt den in PROJ-3 bereits vorhandenen URL-Filter-Mechanismus ohne Zusatzaufwand | 2026-09-18 |
| Genau die drei Kennzahlen aus dem PRD (Geräte pro Status, Total Prüfberichte, letzte Prüfung), keine weiteren | Deckt den ursprünglichen Scope ab, hält das Feature klein und schnell testbar; weitere Kennzahlen können später per `/refine` ergänzt werden | 2026-09-18 |
| **Nachträglich erweitert:** zusätzliche Kachel "Total Geräte" (Gesamtzahl Geräte der Firma, unabhängig vom Status) vor "Total Prüfberichte" ergänzt | Nutzerwunsch während `/frontend` — sinnvolle Ergänzung, da die vier Status-Kacheln allein die Gesamtzahl nicht auf einen Blick zeigen; einfache Summe, kein Mehraufwand | 2026-09-18 |
| Immer alle drei bekannten Status-Kacheln anzeigen (auch mit 0) | Konsistentes, vorhersehbares Layout unabhängig von der Firma; kein Rätselraten, warum eine Kategorie fehlt | 2026-09-18 |
| Eigene "Kein Status"-Kachel, aber nur wenn deren Anzahl > 0 | Betrifft laut PROJ-1-Datenfund nur ca. 0,6% der Geräte — soll bei den meisten Firmen nicht unnötig auftauchen, aber die Summe aller Kacheln muss der Gesamtzahl Geräte entsprechen | 2026-09-18 |
| **Nachträglich erweitert:** zusätzliche Kachel "Zu prüfen" (Geräte, deren letzte Prüfung mehr als 360 Tage zurückliegt) ergänzt, als erste Kachel in der Status-Reihe, vor "Freigabe" | Nutzerwunsch während `/frontend`; 360 Tage als fester Schwellenwert, um Geräte mit dringendem Handlungsbedarf sichtbar zu machen | 2026-09-18 |
| Nie geprüfte Geräte zählen ebenfalls als "Zu prüfen" | Ein nie geprüftes Gerät hat mit Sicherheit keine Prüfung innerhalb der letzten 360 Tage — logisch konsistent, auch wenn die reine Datums-Formel das nicht automatisch abdeckt | 2026-09-18 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Neuer Navigations-Link ("Übersicht" / "Dashboard") wird direkt im bestehenden, gemeinsam genutzten `AppHeader` ergänzt, statt einer neuen Navigationskomponente | `AppHeader` erscheint bereits auf allen geschützten Seiten (PROJ-2/3/4); eine Erweiterung dort macht den Link automatisch überall verfügbar, ohne jede Seite einzeln anzupassen | 2026-09-18 |
| Kennzahlen werden über eine neue, gemeinsame Abfrage-Schicht (`src/lib/dashboard/`) berechnet, die die bestehende Firma→Standort→Geräte-Auflösung aus PROJ-3 wiederverwendet, statt sie zu duplizieren | Vermeidet zwei unabhängige Implementierungen derselben Zugriffsbeschränkung; ein Bugfix an der Auflösung (z.B. aus einem künftigen PROJ-3-Fix) wirkt automatisch auch hier | 2026-09-18 |
| "Total Prüfberichte" wird als reiner Zähl-Query über alle Geräte-IDs der Firma berechnet (kein Laden einzelner Prüfbericht-Datensätze) | Konsistent mit der bestehenden Performance-Vorgabe aus der Spec; skaliert unabhängig von der tatsächlichen Anzahl Prüfberichte | 2026-09-18 |
| Status-Kacheln nutzen dieselbe Farb-Zuordnung wie die Geräte-Übersicht/-Detailseite (`getStatusBadgeVariant` aus dem `/design`-Nachtrag) | Visuelle Konsistenz zwischen Dashboard und Geräte-Übersicht — derselbe Status sieht überall gleich aus | 2026-09-18 |
| Kein separater API-Endpoint — Server Component liest direkt über die bestehende Supabase-Anbindung | Reine Leseoperation, konsistent mit dem in PROJ-3/PROJ-4 etablierten Muster | 2026-09-18 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponenten-Struktur

```
AppHeader (bestehend, erweitert)
└── NEU: Navigations-Links "Übersicht" / "Dashboard" — auf allen geschützten Seiten sichtbar

/dashboard (neue Seite)
├── AppHeader (erweitert)
├── Firma-Name-Anzeige (wie auf /uebersicht)
├── "Firma wechseln"-Button (wiederverwendet aus PROJ-3, nur bei mehreren Firmen)
├── Status-Kacheln
│   ├── Freigabe / keine Freigabe / letzte Freigabe — immer alle drei, auch mit 0
│   ├── Kein Status — nur wenn > 0
│   └── Jede Kachel anklickbar → /uebersicht?status=... (vorausgefüllter Filter)
├── Kachel "Total Prüfberichte"
├── Kachel "Letzte Prüfung" (Datum, oder "Noch nie geprüft")
├── Leer-Zustand ("Für Ihre Firma sind noch keine Geräte hinterlegt...", analog PROJ-3)
└── Fehler-Zustand mit "Erneut versuchen" (Header/Abmelden bleiben nutzbar)
```

### Datenmodell (in Textform)

- Die Firma→Standort→Geräte-Auflösung ist identisch zu PROJ-3 (erst Standorte der Firma, dann Geräte dieser Standorte) und wird für das Dashboard wiederverwendet statt neu gebaut
- Status-Kacheln: Zählung der Geräte dieser Firma, gruppiert nach normalisiertem Status (case-insensitiv, gleiche Normalisierung wie PROJ-3), inkl. einer Kategorie für "kein Status" (`null`)
- "Total Prüfberichte": Zählung aller nicht-soft-gelöschten Prüfberichte, deren Gerät zu einem Standort dieser Firma gehört
- "Letzte Prüfung": höchster Wert von `letzte_pruefung` über alle Geräte dieser Firma; `null`, wenn kein Gerät je geprüft wurde
- Alle drei Kennzahlen werden in einem Durchgang für die aktuell ausgewählte Firma berechnet, keine Paginierung nötig (reine Zählwerte)

### Technische Entscheidungen (Begründung)
Siehe Decision Log → Technical Decisions oben.

### Abhängigkeiten (Packages)
Keine neuen — nutzt weiterhin shadcn-Komponenten (Card) und die vorhandene Supabase-Anbindung.

## Implementation Notes (Frontend)

- `AppHeader` (`src/components/app-header.tsx`) um zwei Navigations-Links ("Übersicht" / "Dashboard") erweitert — erscheint automatisch auf allen geschützten Seiten, keine aktive-Link-Hervorhebung im MVP (nicht durch die Acceptance Criteria verlangt).
- Neue Seite `src/app/(protected)/dashboard/page.tsx`: löst Firma wie bei PROJ-3/4 auf (`getCurrentFirmaId`), zeigt "Firma wechseln"-Button nur bei mehreren Firmen, rendert Status-Kacheln (immer Freigabe/keine Freigabe/letzte Freigabe, "Kein Status" nur wenn > 0), Kachel "Total Prüfberichte", Kachel "Letzte Prüfung" (mit "Noch nie geprüft"-Fallback), Leer-Zustand und eigenen Fehler-Zustand mit "Erneut versuchen".
- Status-Kacheln (ausser "Kein Status") sind als `Link` zu `/uebersicht?status=...` umgesetzt und nutzen `getStatusBadgeVariant` (aus dem `/design`-Nachtrag) für die Textfarbe der Zahl — visuell konsistent mit den Status-Badges auf PROJ-3/4.
- **Nachträglich ergänzt (2026-09-18, Nutzerfeedback):** Überschrift "Geräte nach Status" oberhalb der vier Status-Kacheln ergänzt, um Verwechslung mit den Prüfbericht-Ergebnissen aus PROJ-4 auszuschliessen — beide verwenden dieselben drei Wörter (Freigabe/keine Freigabe/letzte Freigabe), aber für unterschiedliche Entitäten (Gerät vs. Prüfbericht). Die Kennzahlen selbst waren immer schon Geräte-Zählungen (siehe Datenmodell oben), nur die UI-Beschriftung war nicht eindeutig genug.
- **Nachträglich ergänzt (2026-09-18, Nutzerfeedback):** Zusätzliche Kachel "Total Geräte" vor "Total Prüfberichte" (neues Feld `totalGeraete` in `DashboardKennzahlen`); der Leer-Zustand-Check (`keineGeraete`) prüft jetzt direkt `totalGeraete === 0` statt die Summe der vier Status-Zahlen zu bilden.
- **Nachträglich ergänzt (2026-09-18, Nutzerfeedback):** Nav-Links und "Firma wechseln"-Button in den `AppHeader` verschoben (rechts neben "Abmelden", statt pro Seite einzeln links neben dem Titel). `AppHeader` ist dafür jetzt eine `async`-Server-Component, die `auth()` selbst aufruft — `uebersicht/page.tsx` und `dashboard/page.tsx` haben ihre jeweils dupliziert gebaute "Firma wechseln"-Logik entfernt (kein `auth()`-Aufruf, keine `hatMehrereFirmen`-Berechnung mehr dort nötig). Vermeidet künftige Duplikate, falls weitere Seiten dazukommen.
- Datenzugriff über eine neue Mock-Data-Schicht (`src/lib/dashboard/types.ts`, `src/lib/dashboard/mock-data.ts`) mit `getDashboardKennzahlen(firmaId)` — ignoriert `firmaId` bewusst (wie bei PROJ-4s Mock-Phase) und liefert feste Beispielzahlen inkl. eines "Kein Status"-Werts > 0, um alle UI-Zustände sichtbar zu machen. `/backend` ersetzt nur die Funktionsinnereien durch echte aggregierte Supabase-Abfragen, gleiche async Signatur.
- `npx tsc --noEmit`, `npx vitest run` (48 Tests, unverändert) und `npx playwright test` (12 Tests, unverändert) laufen fehlerfrei durch; manueller Smoke-Test bestätigt, dass `/dashboard` ohne Session korrekt zu `/login` umleitet (kein Server-Fehler).
- **Nachträglich ergänzt (2026-09-21, Nutzerwunsch):** Kachel "Total Geräte" ist jetzt ebenfalls als `Link` zu `/uebersicht` umgesetzt (ohne `?status=`-Filter, da sie die Gesamtzahl über alle Status zeigt), inkl. Hover-Effekt analog zu den Status-Kacheln.
- Noch offen (für `/backend`): echte Firma→Standort→Geräte-Auflösung (wiederverwendet aus PROJ-3) plus aggregierte Zähl-Abfragen für Status-Verteilung, Total Prüfberichte und maximales Prüfdatum.

## Implementation Notes (Backend)

- `src/lib/dashboard/queries.ts` ersetzt die Mock-Data-Schicht mit einer echten Supabase-Abfrage: `getStandortIdsFuerFirma` (neu aus `src/lib/geraete/queries.ts` exportiert, wiederverwendet statt dupliziert) liefert die Standort-IDs der Firma, danach werden `dv_geraete` (nur `id`/`status`/`letzte_pruefung`) für diese Standorte gelesen und einmal in JS zu den vier Status-Zählern + `letzte_pruefung`-Maximum reduziert.
- "Total Prüfberichte" ist ein reiner Zähl-Query (`count: "exact", head: true`) über `dv_pruefberichte`, gefiltert nach den zuvor ermittelten Geräte-IDs und `deleted_at is null` — es werden nie einzelne Prüfbericht-Datensätze geladen, wie im Tech Design festgelegt.
- Firma ohne Standorte oder ohne Geräte → alle Kennzahlen `0`/`null` (`EMPTY_KENNZAHLEN`), keine Sonderbehandlung in der aufrufenden Seite nötig (`dashboard/page.tsx`s `keineGeraete`-Check greift automatisch).
- 6 neue Integrationstests in `src/lib/dashboard/queries.test.ts` (gleiches Fluent-Mock-Muster wie bei PROJ-3/4, erweitert um eine `head: true`-Zähl-Abfrage): keine Standorte, Standorte ohne Geräte, Status-Zählung case-insensitiv, `letzte_pruefung`-Maximum inkl. Nullwerte, "nie geprüft"-Fall, Prüfberichte-Zählung schliesst Soft-gelöschte und fremde Geräte-IDs korrekt aus.
- `npx tsc --noEmit`, `npm run build`, `npx vitest run` (54 Tests, 6 neu) und `npx playwright test` (12 Tests, unverändert) laufen fehlerfrei durch; manueller Smoke-Test bestätigt weiterhin keinen Server-Fehler auf `/dashboard` ohne Session.
- Noch offen: Live-Verifikation gegen echte Daten (Nutzer-Review), danach `/qa`.
- **Nachträglich ergänzt (2026-09-18, Nutzerwunsch):** Vierte Kennzahl "Zu prüfen" — Anzahl Geräte, deren `letzte_pruefung` mehr als 360 Tage zurückliegt, oder die noch nie geprüft wurden (auf Nutzerentscheidung: nie-geprüfte Geräte zählen mit, da sie mit Sicherheit älter als das Intervall sind). Berechnung erfolgt im selben Reduce-Durchgang wie die Status-Zählung (`ZU_PRUEFEN_TAGE = 360`, String-Vergleich auf ISO-Datumsstrings), keine zusätzliche Datenbankabfrage. Kachel in der zweiten Kennzahlen-Reihe (jetzt 4 statt 3 Spalten), Zahl in Amber (`text-status-warning`) zur optischen Betonung. 2 neue Tests inkl. Grenzfall "exakt 360 Tage her zählt noch nicht" — insgesamt 61 Tests grün.
- **BUG-2 gefunden und behoben (2026-09-22, Live-Fund während PROJ-7-Tests):** Bei einer Firma mit vielen Geräten schlug die Prüfberichte-Zähl-Abfrage (`.in("geraet_id", geraetIds)` mit **allen** Geräte-IDs der Firma in einem Request) mit `TypeError: fetch failed` fehl, statt eine saubere Antwort zu liefern — die resultierende URL wurde zu lang. Betroffene Nutzer sahen "Die Kennzahlen konnten nicht geladen werden" auf `/dashboard`, obwohl kein echter Datenfehler vorlag. **Fix:** Die Geräte-IDs werden jetzt in Batches von 200 aufgeteilt (`PRUEFBERICHTE_COUNT_CHUNK_SIZE`), die Zähl-Abfragen parallel ausgeführt und die Teil-Counts summiert. Ausserdem: `dashboard/page.tsx` loggt den Fehler jetzt serverseitig (`console.error`) statt ihn nur zu verschlucken — das war der Grund, weshalb der Fehler bisher nicht auffiel. 1 neuer Regressionstest (250 simulierte Geräte, erzwingt mehrere Batches) — insgesamt 75 Vitest-Tests grün.

## QA Test Results

**Tested:** 2026-09-18
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)

> Hinweis: Wie bei PROJ-2/3/4 lässt sich der echte Entra-External-ID-Login nicht automatisiert/wiederholbar durchspielen. Die Aggregations-Logik ist vollständig über Vitest-Integrationstests abgedeckt; die tatsächliche Anzeige (Kennzahlen, Status-Kacheln, Verlinkung, "Zu prüfen") wurde vom Nutzer während der Backend-/Frontend-Phase live gegen echte Daten bestätigt ("sieht gut aus", mehrfach).

### Acceptance Criteria Status

#### AC-1: Kennzahlen werden für die ausgewählte Firma angezeigt
- [x] Integrationstests (`queries.test.ts`) + live vom Nutzer bestätigt

#### AC-2: Immer alle drei bekannten Status-Kacheln, fehlende mit 0
- [x] Code-Review (`StatusKachel` wird für Freigabe/keine Freigabe/letzte Freigabe immer gerendert, unabhängig vom Wert) + Integrationstest für die zugrunde liegende Zählung

#### AC-3: "Kein Status"-Kachel nur wenn > 0
- [x] Code-Review (`{kennzahlen!.statusKeinStatus > 0 && (...)}`) + Integrationstest für `statusKeinStatus`-Zählung

#### AC-4: Keine "Kein Status"-Kachel wenn 0
- [x] Gleicher Code-Pfad wie AC-3, negativer Fall durch die Bedingung selbst abgedeckt

#### AC-5: Status-Kachel-Klick verlinkt zur gefilterten Übersicht
- [x] Code-Review: `href="/uebersicht?status=..."`, case-insensitiver Filter auf der Zielseite (PROJ-3) macht das robust gegenüber Schreibweisen-Inkonsistenzen in den echten Daten

#### AC-6: Leermeldung bei Firma ohne Geräte
- [x] Integrationstest (`EMPTY_KENNZAHLEN` bei keinen Standorten/Geräten) + Code-Review des `keineGeraete`-Zweigs

#### AC-7: "Noch nie geprüft" statt leerem Datum
- [x] Integrationstest + Code-Review (`formatDatum` liefert "Noch nie geprüft" bei `null`)

#### AC-8: Fehler-Zustand mit "Erneut versuchen"
- [x] Code-Review: eigener try/catch um `getDashboardKennzahlen`, `AppHeader` bleibt ausserhalb des Fehler-Zweigs nutzbar (gleiches Muster wie PROJ-3/4)

#### AC-9: Navigation zwischen Übersicht und Dashboard über Header-Link
- [x] Code-Review: `AppHeader` rendert beide Links auf jeder geschützten Seite, unabhängig vom aktuellen Pfad

#### AC-10: "Zu prüfen" zählt Geräte ohne Prüfung oder älter als 360 Tage
- [x] 2 neue Integrationstests: überfällige/nie geprüfte Geräte werden gezählt, ein Gerät mit Prüfung vor genau 360 Tagen noch nicht (Grenzfall bewusst getestet)

### Security Audit Results
- [x] Authentication: `/dashboard` ohne Session → Redirect zu `/login` (neuer Playwright-Test, `tests/PROJ-5-dashboard.spec.ts`)
- [x] Autorisierung: Keine neue Angriffsfläche — `firmaId` kommt ausschliesslich aus der Session (`getCurrentFirmaId`), keine URL-Parameter, die eine fremde Firma erzwingen könnten (im Gegensatz zu PROJ-3/4 gibt es hier nicht einmal eine ID im Pfad)
- [x] Keine Secrets im Client-Code: `getDashboardKennzahlen`/`getSupabaseAdmin` werden von keiner `"use client"`-Datei importiert (per Grep geprüft)
- [x] Kein Injection-Vektor: keine Freitext-Eingaben auf dieser Seite
- [x] Kein XSS-Vektor: nur Zahlen und ein formatiertes Datum werden gerendert
- [x] Rate-Limiting: kein neuer API-Endpoint

### Bugs Found

#### BUG-1: Bei seltener "Kein Status"-Kachel (5. Kachel) entstehen auf Desktop 3 leere Spalten in der neuen Zeile
- **Severity:** Low
- **Steps to Reproduce:**
  1. Firma mit mindestens einem Gerät ohne Status aufrufen (betrifft laut PROJ-1-Datenfund ca. 0,6% der Geräte)
  2. Dashboard auf Desktop-Breite betrachten
  3. Erwartet: saubere Kachel-Anordnung
  4. Tatsächlich: 5 Kacheln in einem 4-spaltigen Grid — die 5. Kachel ("Kein Status") rutscht in eine neue Zeile mit 3 leeren Spalten daneben
- **Priority:** Nice to have — seltener Fall, keine funktionale Beeinträchtigung, nur optisch nicht perfekt ausbalanciert

### Automatisierte Tests
- **Unit-/Integrationstests (Vitest):** 61/61 grün gesamt, davon 8 in `src/lib/dashboard/queries.test.ts` (inkl. der 2 neuen für "Zu prüfen")
- **E2E-Tests (Playwright):** 14/14 grün gesamt (12 unverändert + 2 neu in `tests/PROJ-5-dashboard.spec.ts` für Chromium + Mobile Safari)
- **Regression:** Alle bisherigen PROJ-1/2/3/4-Tests weiterhin grün — keine Regressionen durch PROJ-5

### Summary
- **Acceptance Criteria:** 10/10 abgedeckt (Integrationstests + Code-Review; UI-Verhalten zusätzlich vom Nutzer live gegen echte Daten bestätigt)
- **Bugs Found:** 1 total (0 Critical, 0 High, 0 Medium, 1 Low) — nicht blockierend
- **Security:** Solide — kleinste Angriffsfläche aller bisherigen Features (keine URL-Parameter, keine Freitext-Eingaben)
- **Production Ready:** JA
- **Recommendation:** Status auf "Approved" setzen. BUG-1 optional bei einem künftigen Layout-Polish mitnehmen (z.B. "Kein Status" immer in eine eigene, schmalere Kachel-Reihe stellen).

## Deployment
- **Production URL:** https://obsi-hoferkundenportal.vercel.app
- **Deployed:** 2026-09-18
- **Verifiziert:** `/dashboard` live auf Production aufgerufen — 200, Kacheln (inkl. "Zu prüfen") korrekt befüllt.
