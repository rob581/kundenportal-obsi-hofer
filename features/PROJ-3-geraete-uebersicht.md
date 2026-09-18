# PROJ-3: Geräte-Übersicht

## Status: Approved
**Created:** 2026-09-17
**Last Updated:** 2026-09-17

## Dependencies
- Requires: PROJ-1 (Dataverse-Sync-Service) — liefert die Geräte-, Standort- und Firmen-Daten
- Requires: PROJ-2 (Kunden-Login) — liefert die aktuell ausgewählte Firma, auf die die Geräteliste eingeschränkt wird

## User Stories
- Als Kunde möchte ich alle Geräte meiner Firma in einer Liste sehen, damit ich einen Überblick über deren Status habe.
- Als Kunde möchte ich die Liste nach Status filtern können, damit ich schnell Geräte mit Handlungsbedarf finde.
- Als Kunde möchte ich nach Gerätename oder Seriennummer suchen können, damit ich ein bestimmtes Gerät schnell finde.
- Als Kunde möchte ich auf ein Gerät klicken können, um alle verfügbaren Details zu sehen.
- Als Kunde einer Firma ohne Geräte möchte ich eine klare Meldung sehen, statt einer leeren oder verwirrenden Seite.

## Out of Scope
- Link zu Prüfberichten pro Gerät — folgt, sobald PROJ-4 (Prüfberichte-Liste) existiert, wird dann per `/refine PROJ-3` oder direkt bei PROJ-4 ergänzt
- Sortierbare Spalten-Header (Klick zum Umsortieren) — nur die eine fest definierte Standard-Sortierung (siehe unten)
- Bearbeiten, Erstellen oder Löschen von Geräten — Portal ist read-only (siehe PRD)
- Dashboard-Kennzahlen ("Anzahl Geräte pro Status" etc.) — siehe PROJ-5
- PDF-Download — siehe PROJ-4
- Anzeige von Geräten mehrerer Firmen gleichzeitig — nur die aktuell in PROJ-2 ausgewählte Firma

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Kunde ist angemeldet und hat eine Firma ausgewählt, wenn er die Geräte-Übersicht aufruft, dann werden alle Geräte dieser Firma geladen und mit Gerätename, Status, Standort und Datum der letzten Prüfung angezeigt
- [ ] Angenommen die ausgewählte Firma hat keine Geräte, wenn die Übersicht geladen wird, dann wird eine Leermeldung angezeigt ("Für Ihre Firma sind noch keine Geräte hinterlegt...")
- [ ] Angenommen der Kunde wählt einen Status-Filter, wenn dieser angewendet wird, dann zeigt die Liste ausschliesslich Geräte mit diesem Status
- [ ] Angenommen der Kunde gibt einen Suchbegriff ein, wenn nach Gerätename oder Seriennummer gesucht wird, dann werden nur passende Geräte angezeigt
- [ ] Angenommen Status-Filter und Suchbegriff sind gleichzeitig gesetzt, wenn die Liste angezeigt wird, dann werden beide Kriterien kombiniert (UND-Verknüpfung) angewendet
- [ ] Angenommen mehr als 25 Geräte entsprechen den aktuellen Filtern, wenn die Liste angezeigt wird, dann wird sie paginiert (25 Einträge pro Seite)
- [ ] Angenommen ein Kunde klickt auf ein Gerät in der Liste, wenn die Detailseite lädt, dann werden alle verfügbaren Felder angezeigt (u.a. Seriennummer, Barcode, Hersteller/Artikel, Standort, Lagerort, Zubehör, Bemerkungen)
- [ ] Angenommen die Geräteliste wird angezeigt, dann ist sie standardmässig nach Datum der letzten Prüfung sortiert (neuestes Datum zuerst); Geräte ohne jemals erfasste Prüfung erscheinen ganz oben
- [ ] Angenommen die Gerätedaten können nicht geladen werden (z.B. Datenbank kurzzeitig nicht erreichbar), wenn der Fehler auftritt, dann wird eine Fehlermeldung mit "Erneut versuchen"-Button angezeigt und Header/Abmelden bleiben nutzbar

## Edge Cases
- Ein Gerät hat keinen Standort und damit keinen herstellbaren Firma-Bezug (bekannter Datenqualitäts-Hinweis aus PROJ-1) → erscheint in keiner Kunden-Übersicht, da die Zuordnung Gerät→Standort→Firma fehlt
- Der Gerätestatus ist in Dataverse ein Freitextfeld ohne festen Wertebereich → die Filter-Optionen werden dynamisch aus den tatsächlich bei dieser Firma vorkommenden Status-Werten gebildet, nicht hart codiert
- Ein Kunde mit mehreren Firmen wechselt die aktive Firma (PROJ-2) → die Geräteliste zeigt automatisch nur noch Geräte der neu gewählten Firma, Filter/Suche werden zurückgesetzt
- Sehr lange Gerätenamen, Bemerkungen oder Standortnamen → Tabellenzellen brechen sauber um bzw. werden gekürzt, damit das Layout nicht bricht (insbesondere auf Mobile)
- Suchbegriff liefert keine Treffer → eigene "Keine Ergebnisse für '...'"-Meldung, unterscheidbar von der generellen Leermeldung (keine Geräte überhaupt)

## Technical Requirements (optional)
- Zugriffsbeschränkung: Geräte-Abfrage ist serverseitig auf die aktuell ausgewählte Firma (PROJ-2) beschränkt, nie clientseitig gefiltert
- Performance: Paginierte Abfrage (nicht die komplette Geräteliste einer Firma auf einmal laden)

## Open Questions
- [x] Genaue Liste/Bedeutung der vorkommenden Status-Werte in `bmvcc_Betriebsmittelstatus` → bei `/architecture` anhand der echten Daten geprüft: "Freigabe" (83%), "keine Freigabe" (14%), "letzte Freigabe"/"Letzte Freigabe" (2%, uneinheitliche Gross-/Kleinschreibung), kein Status gesetzt (0,6%) (2026-09-17)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Liste zeigt nur Gerätename, Status, Standort, Datum letzte Prüfung; Rest in Detailansicht | Hält die Übersicht auf einen Blick lesbar, Details bei Bedarf verfügbar | 2026-09-17 |
| Status-Filter UND Freitextsuche (Gerätename/Seriennummer) bereits im MVP | Beides zusammen deckt die wichtigsten Anwendungsfälle ab (Handlungsbedarf finden vs. bekanntes Gerät nachschlagen) | 2026-09-17 |
| Paginierung mit 25 Einträgen pro Seite | Firmen können mehrere hundert Geräte haben; verhindert unübersichtliche/langsame Listen | 2026-09-17 |
| Detailansicht als eigene Unterseite, kein Modal | Einfacher umzusetzen, funktioniert gut auf Mobile, erweiterbar für spätere Prüfberichte-Verlinkung (PROJ-4) | 2026-09-17 |
| Link zu Prüfberichten pro Gerät bewusst nicht in PROJ-3 | PROJ-4 existiert noch nicht — ein Link ins Leere wäre verwirrend; wird nachgezogen | 2026-09-17 |
| Standard-Sortierung: Datum letzte Prüfung, neueste zuerst, nie geprüfte Geräte ganz oben | Macht Geräte mit dringendstem Handlungsbedarf (nie geprüft) sofort sichtbar | 2026-09-17 |
| Fehler beim Laden zeigt Fehlermeldung + "Erneut versuchen", keine kaputte Seite | Header/Abmelden bleiben trotzdem nutzbar | 2026-09-17 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| `/uebersicht` (bisheriger PROJ-2-Platzhalter) wird die echte Geräte-Übersicht; Detailseite unter `/uebersicht/geraete/[id]` | Ist bereits die vorgesehene Landing-Page nach Firma-Auswahl, kein zusätzlicher Redirect nötig | 2026-09-17 |
| Server Components lesen direkt aus Supabase, kein separater API-Endpoint | Reine Leseoperation, passt zum bestehenden Muster (Firmen-Auswahl macht das schon so) | 2026-09-17 |
| Firma-Einschränkung erfolgt vollständig im Server-Code (eigene WHERE-Bedingungen), nicht über Datenbank-RLS-Policies | Die PROJ-1-Tabellen haben RLS ohne jegliche Freigabe für anon/authenticated — nur der Service-Role-Schlüssel darf überhaupt lesen; die Firma-Einschränkung muss daher explizit im Code erfolgen | 2026-09-17 |
| Kein automatischer Datenbank-Join zwischen Gerät und Standort (PostgREST-Embedding) — stattdessen zweistufige Abfrage (erst Standorte der Firma, dann Geräte dieser Standorte) | Seit PROJ-1 BUG-1-Fix gibt es keine echten Fremdschlüssel-Constraints zwischen den Tabellen mehr, wodurch Supabase/PostgREST keine automatische Verknüpfung erkennen kann | 2026-09-17 |
| Filter/Suche/Seite werden als URL-Suchparameter geführt, nicht als reiner Client-State | Zustand bleibt beim Neuladen/Teilen erhalten; Server Component kann die Datenbankabfrage direkt anhand der URL bauen | 2026-09-17 |
| Status-Filter-Optionen werden bei jedem Laden dynamisch aus den tatsächlichen Werten der Firma ermittelt, mit Gross-/Kleinschreibungs-Normalisierung beim Gruppieren | Echte Daten zeigen inkonsistente Schreibweisen ("letzte Freigabe" vs. "Letzte Freigabe") — ohne Normalisierung erschienen zwei Filter für denselben Status | 2026-09-17 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponenten-Struktur

```
/uebersicht (ersetzt den PROJ-2-Platzhalter)
├── AppHeader (bestehend)
├── Filterleiste
│   ├── Status-Filter (Dropdown, Optionen aus den echten Daten der Firma)
│   └── Suchfeld (Gerätename/Seriennummer)
├── Geräte-Tabelle
│   ├── Spalten: Gerätename, Status, Standort, Datum letzte Prüfung
│   ├── Zeile anklickbar → Detailseite
│   ├── Leer-Zustand ("keine Geräte") bzw. "keine Ergebnisse für Suche"
│   └── Fehler-Zustand mit "Erneut versuchen"
└── Pagination (25 pro Seite)

/uebersicht/geraete/[id] (neue Detailseite)
├── AppHeader
├── Zurück-Link
└── Detail-Karte: Seriennummer, Barcode, Hersteller/Norm (Artikel), Standort, Lagerort, Zubehör, Bemerkungen, Status, Prüfdaten
```

### Datenmodell (in Textform)

- Bei jedem Aufruf liest der Server Geräte aus der PROJ-1-Tabelle `dv_geraete`, eingeschränkt auf die Standorte der aktuell gewählten Firma (zweistufig: erst `dv_standorte` nach `firma_id`, dann `dv_geraete` nach den gefundenen Standort-IDs)
- Filter (Status, Suche) und Seite werden als URL-Parameter geführt (`?status=...&suche=...&seite=2`)
- Detailseite liest einen einzelnen Geräte-Datensatz plus verknüpften Artikel- und Standort-Namen (ebenfalls per separater Abfrage, kein automatischer Join)

### Technische Entscheidungen (Begründung)
Siehe Decision Log → Technical Decisions oben.

### Abhängigkeiten (Packages)
Keine neuen — nutzt die bereits installierten shadcn-Komponenten (Table, Input, Select, Pagination) und die vorhandene Supabase-Anbindung (`@supabase/supabase-js`, `src/lib/supabase-admin.ts`).

### Datenfund für `/frontend` und `/backend`
Echte Status-Werte über alle 8243 Geräte (Stand 2026-09-17): "Freigabe" (6842), "keine Freigabe" (1174), "letzte Freigabe"/"Letzte Freigabe" (172+2, uneinheitliche Schreibung), kein Status (53, `null`). Beim Gruppieren für den Filter case-insensitiv vergleichen.

## Implementation Notes (Frontend)

- `/uebersicht` neu gebaut als Server Component: liest `searchParams` (`status`, `suche`, `seite`), löst die aktuell ausgewählte Firma auf (Single-Firma direkt aus der Session, Multi-Firma über das bestehende `obsi_selected_firma`-Cookie, redirect zu `/firmen-auswahl` falls keine gültige Auswahl vorliegt), rendert `AppHeader`, die neue `GeraeteFilterBar` und eine shadcn-`Table` mit Paginierung.
- `GeraeteFilterBar` (`src/components/geraete-filter-bar.tsx`, Client Component) steuert Status-Filter (shadcn `Select`) und Freitextsuche (shadcn `Input` + `Button`) über URL-Suchparameter (`router.push`), damit Zustand beim Neuladen/Teilen erhalten bleibt; jede Filteränderung setzt `seite` zurück.
- Detailseite `/uebersicht/geraete/[id]` neu gebaut: zeigt alle Felder (Seriennummer, Barcode, Standort, Lagerort, Prüfdaten, Artikel/Hersteller/Norm, Zubehör, Bemerkungen), `notFound()` bei unbekannter ID.
- Leer-Zustand, "keine Ergebnisse für Suche"-Zustand und Fehler-Zustand (mit "Erneut versuchen"-Link) sind umgesetzt wie in den Acceptance Criteria beschrieben.
- Datenzugriff ist noch über eine Mock-Data-Schicht (`src/lib/geraete/types.ts`, `src/lib/geraete/mock-data.ts`) realisiert, bewusst mit denselben async Funktionssignaturen (`getGeraeteList(query)`, `getGeraetById(id)`) wie die künftige echte Implementierung — Mock-Daten decken alle vorkommenden Status-Werte inkl. der Gross-/Kleinschreibungs-Inkonsistenz sowie ein nie geprüftes Gerät ab. `/backend` ersetzt nur die Funktionsinnereien (echte zweistufige Supabase-Abfrage), keine Änderungen an den aufrufenden Seiten nötig.
- `npx tsc --noEmit` und `npx vitest run` laufen fehlerfrei durch; manueller Smoke-Test bestätigt, dass `/uebersicht` ohne Session korrekt zu `/login` umleitet (kein Server-Fehler).
- Noch offen (für `/backend`): echte Supabase-Anbindung, serverseitige Firma-Einschränkung über `dv_standorte`/`dv_geraete`, Pagination/Filter direkt in der Datenbankabfrage statt im Speicher.
- **Nachträglich ergänzt (2026-09-17, Nutzerfeedback nach dem Backend-Test):** "Firma wechseln"-Button neben dem Titel, sichtbar nur für Kontakte mit mehr als einer zugeordneten Firma (`session.portal.firmaIds.length > 1`). Nutzt die neue Server Action `changeFirma()` (`firmen-auswahl/actions.ts`, PROJ-2) — löscht das `obsi_selected_firma`-Cookie und leitet zu `/firmen-auswahl` weiter, ohne dass sich der Kunde ab- und wieder anmelden muss.
- **Überholt durch PROJ-5 (2026-09-18):** Der "Firma wechseln"-Button lebt nicht mehr auf `/uebersicht` selbst, sondern wurde in den gemeinsamen `AppHeader` verschoben (siehe PROJ-5 Implementation Notes) — Verhalten unverändert, nur die Position (jetzt im Header neben "Abmelden", auf allen Seiten einheitlich).
- **Nachträglich ergänzt (2026-09-18, `/design`-Nachtrag):** Geräte-Status wird jetzt farblich markiert (Freigabe=Grün, keine Freigabe=Rot, letzte Freigabe=Amber) statt neutralem Text/Grau-Badge, auf der Übersicht-Tabelle und der Detailseite — siehe `docs/design-system.md` Component Conventions und `src/lib/status-badge.ts`.
- **Nachträglich geändert (2026-09-18, Nutzerwunsch):** Die "Gerät"-Spalte in der Übersicht-Tabelle und der Titel auf der Detailseite zeigen jetzt eine kombinierte Artikel-Info statt des Gerätenamens — Formel vom Nutzer vorgegeben: `Modellartikel & " " & ArtikelENNorm & " " & ArtikelTyp & " " & ArtikelDimension & " " & HerstellerName` (= `bezeichnung norm artikeltyp dimension hersteller`, leere Teile werden übersprungen). Neuer shared Helper `src/lib/geraete/artikel-info.ts` (`formatArtikelInfo`), fällt auf den Gerätenamen zurück, wenn kein Artikel verknüpft ist bzw. auf "(ohne Angaben)", wenn auch der Gerätename fehlt. Spaltenkopf bleibt bewusst "Gerät" (Nutzerentscheidung), der Link zur Detailseite bleibt unverändert erhalten. Detailseite zeigt zusätzlich zwei neue Felder "Typ" und "Dimension" in der Detail-Karte.

## Implementation Notes (Backend)

- `src/lib/geraete/queries.ts` ersetzt die Mock-Data-Schicht mit echten Supabase-Abfragen; `getGeraeteList`/`getGeraetById` haben jetzt zusätzlich einen expliziten `firmaId`-Parameter (in der Mock-Phase gab es nur einen globalen Datensatz, daher kein Firma-Parameter nötig — musste für die echte Firma-Einschränkung ergänzt werden).
- Zweistufige Abfrage wie in der Architektur festgelegt: erst `dv_standorte` nach `firma_id`, dann `dv_geraete` nach den gefundenen Standort-IDs (kein PostgREST-Embedding wegen fehlender Fremdschlüssel seit PROJ-1 BUG-1).
- Status-Filter-Optionen werden über alle (ungefilterten) Geräte der Firma ermittelt und case-insensitiv depupliziert; Sortierung der Optionen jetzt locale-aware (`localeCompare` mit `sensitivity: "base"`) statt des ursprünglichen case-sensitiven `Array.sort()`, das Gross-/Kleinschreibung falsch einordnete (z.B. "keine Freigabe" nach "Letzte Freigabe" statt alphabetisch).
- Freitextsuche über Gerätename/Seriennummer läuft über `.or()` mit `ilike`; Kommas und Klammern im Suchbegriff werden escaped, da PostgREST `.or()` diese sonst als Trennzeichen der Filterliste fehlinterpretiert.
- Paginierung und Sortierung (`letzte_pruefung` absteigend, nie geprüfte Geräte zuerst via `nullsFirst`) laufen direkt in der Datenbankabfrage (`range`/`order`), nicht mehr im Speicher wie in der Mock-Version.
- **Sicherheitsrelevant:** `getGeraetById` prüft bei jedem Aufruf, dass der Standort des gefundenen Geräts tatsächlich zur übergebenen `firmaId` gehört — eine Geräte-ID, die zu einer anderen Firma gehört, liefert `null` (identisch zu "unbekannte ID"), damit ein Kunde nicht durch Erraten von IDs in der URL Geräte anderer Kunden sehen kann (IDOR-Schutz, da RLS auf `dv_geraete` alle Zugriffe ausser Service-Role verweigert).
- Neuer gemeinsamer Helper `src/lib/auth/current-firma.ts` (`getCurrentFirmaId()`) löst die aktuell gewählte Firma auf (Einzel-Firma direkt aus der Session, Mehrfach-Firma über das PROJ-2-Cookie, redirect zu `/firmen-auswahl` sonst) und wird jetzt von **beiden** Seiten (`/uebersicht` und `/uebersicht/geraete/[id]`) verwendet. Das hat einen Lücke aus der Frontend-Phase geschlossen: die Detailseite hatte zuvor gar keine Firma-Prüfung, wodurch (mit der reinen Mock-Implementierung) rein technisch keine Kunden-Trennung bestand — mit den echten Daten wäre das ein Zugriffs-Bug gewesen.
- Kein separater API-Endpoint (`src/app/api/...`) nötig — Server Components lesen direkt über `src/lib/supabase-admin.ts`, wie in der Architektur festgelegt.
- Integrationstests in `src/lib/geraete/queries.test.ts` (11 Tests) mit demselben Fluent-Mock-Muster wie `src/lib/auth/access.test.ts`, decken u.a. ab: Firma-Isolation, leere Standort-Liste, Status-/Suche-Filter, Sortierung mit nie-geprüften Geräten zuerst, und die drei "kein Zugriff"-Fälle von `getGeraetById` (fremde Firma, unbekannte ID, Gerät ohne Standort).
- `npx tsc --noEmit` und `npx vitest run` (36 Tests total) laufen fehlerfrei durch; manueller Smoke-Test bestätigt weiterhin keinen Server-Fehler auf `/uebersicht` ohne Session. Echter End-to-End-Test mit dem vorhandenen Test-Kontakt (`test-kontakt-robert-1`) steht noch aus (Nutzer-Review).
- **Nachträglich ergänzt (2026-09-18, Artikel-Info statt Gerätename):** PROJ-1-Ergänzung zuerst umgesetzt (additiv): Migration `supabase/migrations/0004_artikel_dimension.sql` fügt `dimension` zu `dv_artikel` hinzu, gemappt von `bmvcc_dimensions` (`src/lib/sync/entities.ts`, `src/lib/sync/jobs.ts`). `Geraet`-Typ um `artikelTyp`/`artikelDimension` erweitert; `getGeraetById` lädt diese zusätzlich mit. `getGeraeteList` musste die bisherige "kein Artikel-Lookup für die Liste"-Optimierung aufgeben — lädt jetzt die Artikel-Daten für die aktuelle Seite als eine Batch-Abfrage über die distinct Artikel-IDs (`getArtikelMapFuerIds`, max. 25 IDs pro Seite), kein Lookup pro Zeile. 6 neue/aktualisierte Tests (`artikel-info.test.ts` neu, ein `queries.test.ts`-Test auf das neue Verhalten angepasst) — insgesamt 58 Tests grün.

## QA Test Results

**Tested:** 2026-09-17
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)

> Hinweis: Wie schon bei PROJ-2 lässt sich der echte Entra-External-ID-Login nicht automatisiert/wiederholbar durchspielen (dafür bräuchte es einen dauerhaften echten Kundenzugang). Was ohne echten Login automatisiert prüfbar ist — Routen-Schutz, Daten-/Filter-/Sortier-/Paginierungslogik, Autorisierung — wurde automatisiert getestet (Vitest-Integrationstests gegen die echte Query-Logik, Playwright für den Routen-Schutz). Die tatsächlich angezeigten Inhalte (Geräteliste, Filter, Detailseite, "Firma wechseln") wurden vom Nutzer während der Backend-Phase live mit dem Test-Kontakt `test-kontakt-robert-1` gegen echte Daten geprüft und als funktionierend bestätigt (siehe Chat-Verlauf 2026-09-17).

### Acceptance Criteria Status

#### AC-1: Geräteliste zeigt Gerätename, Status, Standort, Datum letzte Prüfung für die Firma
- [x] Verifiziert durch Integrationstest (`getGeraeteList` gibt nur Geräte der Standorte der übergebenen Firma zurück) + live vom Nutzer bestätigt

#### AC-2: Leermeldung bei Firma ohne Geräte
- [x] Datenlayer verifiziert (Firma ohne Standorte → `total: 0`, `items: []`); UI-Zweig für die Leermeldung durch Code-Review bestätigt (kein automatisierter Render-Test ohne echten Login möglich)

#### AC-3: Status-Filter zeigt nur passende Geräte
- [x] Integrationstest grün (case-insensitive exakter Match)

#### AC-4: Freitextsuche nach Gerätename/Seriennummer
- [x] Integrationstest grün (beide Felder geprüft)

#### AC-5: Status-Filter UND Suchbegriff kombiniert (UND-Verknüpfung)
- [x] Neuer Integrationstest in dieser QA-Runde ergänzt (`combines status filter and search term with AND`) — grün; deckt sowohl "nur ein Kriterium passt → kein Treffer" als auch "beide passen → Treffer" ab

#### AC-6: Paginierung bei mehr als 25 Geräten
- [x] Neuer Integrationstest mit 30 simulierten Geräten ergänzt — Seite 1: 25 Einträge, Seite 2: 5 Einträge, `total: 30`, keine Überschneidung/Lücke zwischen den Seiten

#### AC-7: Detailseite zeigt alle verfügbaren Felder
- [x] Feld-für-Feld-Abgleich zwischen `getGeraetById`-Rückgabe und Detailseiten-JSX durch Code-Review; Zugriffskontrolle durch 3 Integrationstests abgedeckt (fremde Firma, unbekannte ID, Gerät ohne Standort); Rendering live vom Nutzer bestätigt

#### AC-8: Standard-Sortierung (neueste Prüfung zuerst, nie geprüft ganz oben)
- [x] Integrationstest grün

#### AC-9: Fehler-Zustand mit "Erneut versuchen", Header/Abmelden bleiben nutzbar
- [x] Code-Review bestätigt: `<AppHeader />` wird ausserhalb des try/catch-Zweigs gerendert, ist im Fehlerfall also immer vorhanden. Ein echter Datenbank-Ausfall wurde nicht künstlich provoziert (gleiche Konvention wie bei PROJ-1/2: kein mutwilliges Lahmlegen der Produktions-Supabase-Instanz)

### Edge Cases Status

#### EC-1: Gerät ohne Standort
- [x] Integrationstest `getGeraetById` → `null` bei fehlendem Standort

#### EC-2: Freitext-Statuswerte, dynamische Filter-Optionen
- [x] Integrationstest: case-insensitive Deduplizierung über alle Geräte der Firma; Sortierung der Optionen zusätzlich verbessert (siehe BUG-1 unten aus der Backend-Phase, bereits behoben)

#### EC-3: Firma-Wechsel setzt Filter/Suche zurück
- [x] Code-Review: sowohl `selectFirma` als auch der neue `changeFirma` redirecten auf bare Pfade (`/uebersicht` bzw. `/firmen-auswahl`) ohne Query-Parameter — Filter/Suche sind danach zwingend zurückgesetzt

#### EC-4: Sehr lange Gerätenamen/Bemerkungen/Standortnamen in der Tabelle
- [ ] **BUG-1 gefunden** (siehe unten) — Spec verspricht "werden gekürzt", tatsächlich nur horizontales Scrollen über die shadcn-Table-Standardkomponente

#### EC-5: Suchbegriff ohne Treffer
- [x] Code-Review + Integrationstests (Suchbegriffe ohne Match liefern ein leeres Array) bestätigen die Grundlage für die eigene "Keine Ergebnisse für..."-Meldung

### Security Audit Results
- [x] Authentication: Beide neuen PROJ-3-Routen ohne Session → Redirect zu `/login` (2 neue Playwright-Tests, inkl. Test, dass Filter-/Suche-/Seite-Query-Parameter den Session-Check nicht umgehen)
- [x] Autorisierung/IDOR: `getGeraetById` verweigert den Zugriff auf ein Gerät, dessen Standort zu einer anderen Firma gehört — liefert `null`, identisch zum "unbekannte ID"-Fall (3 Integrationstests: fremde Firma, unbekannte ID, kein Standort)
- [x] Cookie-Manipulation: `getCurrentFirmaId` validiert den `obsi_selected_firma`-Cookie-Wert gegen `session.portal.firmaIds`; ungültiger/fremder Wert → Redirect zu `/firmen-auswahl` (Code-Review; identische, bereits in PROJ-2 auditierte Logik, jetzt zusätzlich von der Detailseite genutzt)
- [x] Keine Secrets im Client-Code: `getSupabaseAdmin` (Service-Role-Key) wird von keiner `"use client"`-Datei importiert (per Grep geprüft)
- [x] Injection: Freitextsuche escaped `,`/`(`/`)` vor dem Einsetzen in PostgRESTs `.or()`-Filterliste, verhindert das Einschleusen zusätzlicher Filterbedingungen über die Suche
- [x] XSS: Suchbegriff wird ausschliesslich über JSX-Textinterpolation ausgegeben (React escaped automatisch), kein `dangerouslySetInnerHTML` im gesamten Feature
- [x] Rate-Limiting: kein neuer öffentlicher API-Endpoint — reine Server-Component-Seiten hinter der bestehenden Login-Pflicht, gleiches Risikoprofil wie PROJ-2 (dort bereits geprüft/akzeptiert)

### Bugs Found

#### BUG-1: Tabellenzellen kürzen lange Texte nicht wie im Spec beschrieben
- **Severity:** Low
- **Steps to Reproduce:**
  1. Gerät mit sehr langem Gerätenamen/Standortnamen in der Geräte-Übersicht anzeigen
  2. Auf einem schmalen Viewport (z.B. 375px) betrachten
  3. Erwartet (laut Edge Case in diesem Spec): Zellen "brechen sauber um bzw. werden gekürzt"
  4. Tatsächlich: Keine `truncate`/Kürzungs-Klassen auf den `TableCell`-Inhalten — die shadcn-`Table`-Komponente wickelt lediglich die gesamte Tabelle in einen `overflow-auto`-Container, wodurch bei sehr langen Inhalten horizontal gescrollt statt umgebrochen/gekürzt wird
- **Priority:** Nice to have — kein Blocker, da die Tabelle dadurch nicht sichtbar "kaputt" geht (funktionierender Scroll-Fallback), nur nicht exakt wie im Spec-Wortlaut beschrieben; guter Kandidat für einen späteren `/design`-Polish-Durchgang zusammen mit dem Rest des visuellen Feinschliffs

### Automatisierte Tests
- **Unit-/Integrationstests (Vitest):** 38/38 grün gesamt. Für PROJ-3: 13 Tests in `src/lib/geraete/queries.test.ts` (11 aus der Backend-Phase + 2 in dieser QA-Runde ergänzt: kombinierter Status+Suche-Filter, Paginierung über 25 Geräte hinaus) — decken Firma-Isolation, Filter, Suche, Sortierung, Paginierung und alle drei "kein Zugriff"-Fälle von `getGeraetById` ab
- **E2E-Tests (Playwright):** 12/12 grün gesamt (Chromium + Mobile Safari). Neu für PROJ-3 in `tests/PROJ-3-geraete-uebersicht.spec.ts`: Routen-Schutz für die Detailseite, sowie dass Filter-/Suche-/Seite-Query-Parameter den Session-Check nicht umgehen
- **Regression:** Alle bisherigen PROJ-1- (5 Sync-Tests) und PROJ-2-Tests (7 Access-Unit-Tests, 4 E2E-Tests) weiterhin grün — keine Regressionen durch PROJ-3

### Summary
- **Acceptance Criteria:** 9/9 abgedeckt (Datenlayer + Code-Review automatisiert geprüft; UI-Verhalten zusätzlich vom Nutzer live gegen echte Daten bestätigt)
- **Bugs Found:** 1 total (0 Critical, 0 High, 0 Medium, 1 Low) — nicht blockierend
- **Security:** Solide — Firma-Isolation doppelt abgesichert (Datenbankebene über `getGeraetById`/`getGeraeteList` + Cookie-Validierung), kein Secret-Leak, kein Injection- oder XSS-Vektor gefunden
- **Production Ready:** JA
- **Recommendation:** Status auf "Approved" setzen. BUG-1 (Tabellen-Trunkierung) optional bei einem künftigen `/design`-Durchgang mitnehmen, kein Grund für einen Deployment-Aufschub.

## Deployment
_To be added by /deploy_
