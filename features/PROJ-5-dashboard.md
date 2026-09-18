# PROJ-5: Dashboard

## Status: In Progress
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
- Noch offen (für `/backend`): echte Firma→Standort→Geräte-Auflösung (wiederverwendet aus PROJ-3) plus aggregierte Zähl-Abfragen für Status-Verteilung, Total Prüfberichte und maximales Prüfdatum.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
