# PROJ-15: Portal-Zugang pro Standort

## Status: Deployed
**Created:** 2026-10-09
**Last Updated:** 2026-10-09

## Dependencies
- Requires: PROJ-1 / PROJ-12 (Dataverse-Sync, pro Firma): Der Sync übernimmt zusätzlich die Portalzugänge der Standorte der Firma
- Requires: PROJ-2 (Kunden-Login): Die zentrale Zugriffsprüfung wird auf Zugänge pro Standort umgestellt
- Ersetzt: PROJ-13 (Kontakt-Freigabe über das Häkchen `bmvcc_kundenportal`): Das Häkchen wird im Portal nicht mehr geprüft
- Betrifft (Einschränkung auf freigegebene Standorte): PROJ-3 (Geräte-Übersicht und Detailseite), PROJ-4/PROJ-9 (Prüfberichte), PROJ-5 (Dashboard), PROJ-8/PROJ-10 (CSV-Exporte), PROJ-11 (Login-Quote), PROJ-14 (PDF-Export, geplant)
- **Cross-Repo-Abhängigkeit:** `obsi-hofer-admin` PROJ-11 (Freigabe pro Standort, Pflege der Dataverse-Tabelle `bmvcc_portalzugang`). Auftrag aus dem Admin-Tool vom 2026-10-09
- **Dataverse-Voraussetzung (geprüft 2026-10-09, rein lesend):** Der Portal-Zugang darf `bmvcc_portalzugang` lesen

## Datengrundlage (Dataverse, laut Admin-Tool, Stand 2026-10-09 rein lesend geprüft)
- Tabelle `bmvcc_portalzugang` (Entity-Set `bmvcc_portalzugangs`), Primärschlüssel `bmvcc_portalzugangid`, Anzeigename `bmvcc_name`
- Verweis auf den Kontakt (`_bmvcc_kontakt_value`) und auf den Standort (`_bmvcc_standort_value`); pro Kontakt und Standort höchstens ein Datensatz
- Ein Datensatz = Zugang. Entziehen = Datensatz wird gelöscht. Datensätze mit leerem Kontakt- oder Standort-Verweis sind verwaist und zählen nicht
- Stand: 8 Zugänge für 4 Kontakte (alle aktiv, mit E-Mail), keine verwaisten Datensätze, kein Zugang ohne Relation zur Firma. Die 4 Kontakte mit Zugang sind genau die 4 mit Häkchen. Noch kein Kontakt hat nur einen Teil der Standorte seiner Firma. 13 Firmen haben mehr als einen Standort

## User Stories
- Als Freigeber (Admin-Tool) möchte ich einem Kontakt nur bestimmte Standorte seiner Firma freigeben, damit z. B. ein Standortleiter nur die Geräte seines Standorts sieht.
- Als Kunde mit Zugang zu einzelnen Standorten möchte ich im Portal genau die Geräte und Prüfberichte dieser Standorte sehen, ohne durch fremde Standorte verwirrt zu werden.
- Als Freigeber möchte ich einem Kontakt den Zugang zu einem Standort entziehen können, sodass dieser Standort nach dem nächsten Sync im Portal nicht mehr sichtbar ist.
- Als Freigeber möchte ich, dass ein Kontakt ohne verbleibenden Zugang nach dem Sync gar keinen Zugriff mehr aufs Portal hat.
- Als Kunde mit Zugängen bei mehreren Firmen möchte ich bei jeder Firma genau meine Standorte sehen.
- Als Betreiber (OBSI Hofer) möchte ich, dass die Login-Quote im Wochenreport auf denselben Zugängen beruht wie der tatsächliche Portal-Zugang.

## Out of Scope
- Sync pro Standort (Parameter `standortId`): kommt später als eigenes Feature (Admin-Tool PROJ-12)
- Pflege der Zugänge im Portal: erfolgt ausschliesslich im Admin-Tool, Portal bleibt read-only
- Hinweis oder Liste in der Oberfläche, welche Standorte der Kunde sieht: bewusst keine Anzeige (siehe Decision Log)
- Übergangslogik über das alte Häkchen: harter Umstieg (siehe Decision Log)
- Abbau des Häkchens `bmvcc_kundenportal` in Dataverse: Sache des Admin-Tools, nach Rückmeldung dieses Deploys
- Rollen oder abgestufte Rechte innerhalb eines Standorts: alle Kontakte mit Zugang zu einem Standort sehen dieselben Daten dieses Standorts
- Bereinigung alter Vollsync-Daten von Firmen ohne Zugänge (siehe PROJ-13 Open Questions)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Sync**
- [ ] Angenommen für Standorte einer Firma gibt es Portalzugänge in Dataverse, wenn der Sync dieser Firma läuft, dann sind diese Zugänge danach im Portal bekannt
- [ ] Angenommen ein Zugang wurde in Dataverse gelöscht, wenn der nächste Sync der Firma des Standorts läuft, dann ist der Zugang auch im Portal entfernt
- [ ] Angenommen ein Kontakt hat einen Zugang zu einem Standort der Firma, aber keine Relation zur Firma, wenn der Sync dieser Firma läuft, dann ist der Kontakt danach trotzdem im Portal vorhanden (damit er sich anmelden kann)
- [ ] Angenommen ein Zugang hat einen leeren Kontakt- oder Standort-Verweis, wenn der Sync läuft, dann wird er ignoriert, ohne Fehler und ohne Zugang

**Zugang zum Portal**
- [ ] Angenommen ein aktiver Kontakt hat mindestens einen Zugang, wenn er sich anmeldet, dann erhält er Zugang zum Portal; das Häkchen `bmvcc_kundenportal` spielt dabei keine Rolle mehr
- [ ] Angenommen ein aktiver Kontakt hat keinen Zugang (mehr), wenn er sich anmeldet oder nach dem Sync eine Seite aufruft, dann sieht er die generische „Kein Zugang“-Meldung (wie bisher, PROJ-2)
- [ ] Angenommen ein Kontakt hat Zugänge, ist aber inaktiv, wenn er sich anmeldet, dann sieht er „Kein Zugang“
- [ ] Angenommen ein Kontakt hat Zugänge zu Standorten von zwei Firmen, wenn er sich anmeldet, dann erscheinen in der Firmen-Auswahl genau diese beiden Firmen
- [ ] Angenommen ein Kontakt hat eine Relation zu einer Firma, aber keinen Zugang zu einem ihrer Standorte, wenn er sich anmeldet, dann erscheint diese Firma nicht

**Sichtbarkeit innerhalb der Firma**
- [ ] Angenommen ein Kontakt hat nur Zugang zu Standort A einer Firma mit den Standorten A und B, wenn er die Geräte-Übersicht, das Dashboard oder die Prüfberichte-Übersicht aufruft, dann sieht er nur Geräte, Zahlen und Prüfberichte von Standort A
- [ ] Angenommen derselbe Kontakt exportiert die Geräte- oder die Prüfberichte-Übersicht als CSV, wenn der Export erzeugt wird, dann enthält er nur Daten von Standort A
- [ ] Angenommen derselbe Kontakt ruft die Detailseite eines Geräts von Standort B direkt über die Adresse auf, wenn die Seite geladen wird, dann werden keine Gerätedaten angezeigt (gleiches Verhalten wie bei einem Gerät einer fremden Firma)
- [ ] Angenommen der Zugang zu Standort B wird im Admin-Tool entzogen, wenn danach der Sync der Firma läuft, dann ist Standort B beim nächsten Seitenaufruf nicht mehr sichtbar, auch in einer laufenden Sitzung
- [ ] Angenommen ein Kontakt hat Zugang zu allen Standorten seiner Firma (z. B. Firma mit nur einem Standort), wenn er das Portal nutzt, dann verhält es sich wie bisher
- [ ] Angenommen die Einschränkung wird geprüft, wenn ein Kunde Daten abruft, dann gilt sie serverseitig für jede Abfrage, nicht nur in der Oberfläche

**Erfolgsmessung**
- [ ] Angenommen die Login-Quote wird berechnet, wenn der Wochenreport erzeugt wird, dann zählen zur Basis die Firmen, für deren Standorte mindestens ein aktiver Kontakt einen Zugang hat, und als „eingeloggt“ nur Logins dieser Kontakte

## Edge Cases
- **Verwaiste Zugänge** (Kontakt oder Standort gelöscht, Verweis leer): kein Fehler, kein Zugang
- **Zugang zu einem Standort, der zu keiner Firma gehört:** gibt keinen Zugang zu irgendeiner Firma (aktuell 0 Fälle)
- **Standort wechselt in Dataverse die Firma:** Der Zugang folgt dem Standort; massgeblich ist nach dem Sync die neue Firma
- **Gerät wechselt den Standort:** Sichtbarkeit folgt dem aktuellen Standort des Geräts nach dem Sync
- **Mehrere Kontakte mit derselben E-Mail-Adresse** (Bexio-Dubletten, PROJ-13 BUG-1): Die Zugänge aller aktiven Kontakte dieser Adresse werden zusammengezählt
- **Zugang entzogen, aber Sync noch nicht gelaufen:** Im Portal gilt weiter der zuletzt synchronisierte Stand (wie PROJ-13)
- **Kontakt hat Zugänge bei zwei Firmen, nur eine wird synchronisiert:** Die Zugänge der anderen Firma bleiben auf dem zuletzt synchronisierten Stand
- **Firma mit Zugängen, aber deren Standorte haben keine Geräte:** Kunde sieht die leeren Zustände der Übersichten wie bisher
- **Gewählte Firma in der Sitzung verliert alle Zugänge:** Die Firmen-Auswahl wird beim nächsten Seitenaufruf neu geprüft; bei keiner verbleibenden Firma „Kein Zugang“
- **Harter Umstieg beim Deploy:** Bis die Firmen der 4 heutigen Kontakte synchronisiert sind, hat niemand Zugang. Direkt nach dem Deploy deren Firmen im Admin-Tool synchronisieren

## Technical Requirements (optional)
- Security: Zugriff und Standort-Einschränkung ausschliesslich serverseitig, an zentraler Stelle für alle Datenabfragen (Seiten, Detailseite, Exporte, Dashboard), nie nur in der Oberfläche
- Security: fail-closed: Ein nicht synchronisierter oder unklarer Zugang gibt nie Zugriff
- Portal bleibt read-only gegenüber Dataverse
- Rückmeldung an das Admin-Tool nach dem Deploy, damit es `bmvcc_kundenportal` als Übergangsfeld behandeln kann

## Open Questions
- [ ] Gilt dasselbe Schwellen-Problem auch für andere Daten kleiner Firmen (z. B. Firma mit 3 Standorten, einer wird gelöscht = 33 % -> Löschung übersprungen)? Bestehendes Verhalten seit PROJ-1, nicht Teil von PROJ-15. Bei Bedarf separat prüfen
- [ ] Ab wann darf das Admin-Tool das Häkchen `bmvcc_kundenportal` abbauen? Vorschlag: nach dem Deploy von PROJ-15 und einer Woche Betrieb. Rückmeldung an das Admin-Tool beim `/deploy`

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Priorität P1, vor PROJ-14 | Das Admin-Tool vergibt Zugänge bereits pro Standort. Ohne PROJ-15 sähe ein Kunde nach einem Entzug weiterhin alle Standorte seiner Firma: eine Zugriffsfrage | 2026-10-09 |
| Portal-Benutzer = aktiver Kontakt mit mindestens einem Zugang; das Häkchen `bmvcc_kundenportal` wird im Portal nicht mehr geprüft | Wunsch des Admin-Tools („Massgeblich soll künftig die Tabelle sein“). So kann das Admin-Tool das Häkchen später abbauen, ohne das Portal zu brechen. Ersetzt die Kernregel aus PROJ-13 | 2026-10-09 |
| Sichtbare Firmen ergeben sich aus den Standorten mit Zugang, nicht mehr aus der Relation Kontakt–Firma | Der Zugang ist die bewusste Freigabe-Entscheidung; die Bexio-Relation ist nur Stammdaten. Heute deckungsgleich (jeder Zugang hat eine Relation) | 2026-10-09 |
| Kontakte mit Zugang werden auch ohne Relation zur Firma synchronisiert | Folge der vorigen Entscheidung: sonst könnte sich ein solcher Kontakt nicht anmelden | 2026-10-09 |
| Harter Umstieg, keine Übergangslogik über das Häkchen | Betrifft heute 4 Kontakte; ihre Firmen werden direkt nach dem Deploy synchronisiert. Übergangslogik müsste später wieder entfernt werden. Gleiches Vorgehen wie PROJ-13 | 2026-10-09 |
| Keine Anzeige in der Oberfläche, welche Standorte der Kunde sieht | Kein Oberflächen-Aufwand; der Kunde erfährt nichts über Standorte, die ihm nicht freigegeben sind | 2026-10-09 |
| Login-Quote (PROJ-11) wird in PROJ-15 auf die Zugänge umgestellt | Danach hängt im Portal nichts mehr am Häkchen; Quote und tatsächlicher Zugang beruhen auf derselben Regel | 2026-10-09 |
| Entzug wirkt nach dem Sync der Firma des Standorts beim nächsten Seitenaufruf, auch in laufenden Sitzungen | Gleiches Prinzip wie PROJ-13: Zugang wird bei jedem Aufruf neu geprüft | 2026-10-09 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Neue Portal-Tabelle für die Zugänge (je Zugang: Kontakt, Standort), befüllt nur durch den Sync, wie alle anderen Dataverse-Spiegeltabellen nur serverseitig lesbar | Gleiches Muster wie alle bisherigen Spiegeltabellen (PROJ-1); keine neue Zugriffsart | 2026-10-09 |
| Zugänge werden im Firma-Sync direkt nach den Standorten geladen, über die Standort-IDs der Firma | Die Standort-IDs liegen an dieser Stelle schon vor (gleiche ID-Verkettung wie Geräte, PROJ-12); ein entzogener Zugang fällt dabei automatisch als „fehlt“ auf und wird gelöscht | 2026-10-09 |
| **Zugänge sind von der 20-%-Lösch-Schwelle ausgenommen** | Die Schwelle (PROJ-1) schützt vor halben Abrufen, indem Löschungen über 20 % übersprungen werden. Bei wenigen Zugängen pro Firma wäre schon ein einzelner Entzug „über 20 %“ und würde ignoriert, der letzte Zugang (100 %) nie entzogen. Für Zugänge ist die sichere Richtung umgekehrt: lieber einmal zu viel entziehen als einen Entzug verpassen. Ein fehlgeschlagener Abruf bricht ohnehin mit Fehler ab, statt leer zu antworten | 2026-10-09 |
| Kontakte-Schritt im Sync lädt Kontakte aus Relationen **und** aus Zugängen | Ein Kontakt mit Zugang, aber ohne Relation zur Firma, muss im Portal vorhanden sein, sonst könnte er sich nicht anmelden (Product Decision) | 2026-10-09 |
| Verwaiste Zugänge (leerer Kontakt- oder Standort-Verweis) werden ignoriert: ohne Standort tauchen sie im Abruf gar nicht auf, ohne Kontakt werden sie gespeichert, aber von der Zugriffsprüfung nie berücksichtigt | Kein Sonderweg im Sync nötig; wird der verwaiste Datensatz in Dataverse gelöscht, verschwindet er beim nächsten Sync auch im Portal | 2026-10-09 |
| Die zentrale Zugriffsprüfung liefert künftig neben den Firmen auch die freigegebenen Standorte; Firmen = Firmen dieser Standorte | Eine Stelle bestimmt, wer was sieht. Relationen und Häkchen werden dafür nicht mehr gelesen | 2026-10-09 |
| Alle Datenabfragen ermitteln „die Standorte der Firma“ an genau einer gemeinsamen Stelle; diese liefert künftig nur noch die freigegebenen Standorte. Die Besitzprüfung der Gerät-Detailseite prüft auf freigegebenen Standort statt nur auf Firma | Übersicht, CSV-Exporte, Prüfberichte, Dashboard und Detailseite laufen heute schon über diese gemeinsame Stelle bzw. die Besitzprüfung. Damit wirkt die Einschränkung überall gleichzeitig, und neue Seiten (z. B. PDF-Export PROJ-14) erben sie automatisch | 2026-10-09 |
| Das Häkchen `bmvcc_kundenportal` wird nicht mehr aus Dataverse abgerufen; die Portal-Spalte dafür bleibt vorerst bestehen und wird später entfernt | Würde der Sync das Feld weiter abfragen, bräche er, sobald das Admin-Tool das Feld in Dataverse löscht. Die Spalte selbst stört nicht und kann nach dem Deploy gefahrlos entfernt werden | 2026-10-09 |
| Login-Quote (PROJ-11) über dieselbe Datenbank-Funktion, neu auf Zugänge statt Relationen + Häkchen | Ergebnisform unverändert, Report-Code bleibt gleich (wie beim PROJ-11-Nachtrag vom 2026-10-07) | 2026-10-09 |
| Eine Migration für Tabelle und Login-Quote; Reihenfolge Migration → Code-Deploy → Sync der betroffenen Firmen | Ohne die Tabelle scheitern neuer Sync und neue Zugriffsprüfung. Die Migration allein stört den laufenden alten Code nicht | 2026-10-09 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Component Structure
Keine neue oder geänderte Oberfläche. Geändert werden Bausteine im Hintergrund:

```
Firma-Sync (über Admin-Tool ausgelöst)
+-- Firma
+-- Standorte der Firma
|   +-- Portalzugänge dieser Standorte        <- NEU (ohne 20-%-Schwelle)
|   +-- Geräte -> Prüfberichte (unverändert)
+-- Relationen der Firma
+-- Kontakte aus Relationen UND Zugängen       <- erweitert
+-- Artikel (unverändert)

Zentrale Zugriffsprüfung (bei jedem Seitenaufruf)
+-- E-Mail passt zu aktivem Kontakt (Dubletten zusammengefasst, wie bisher)
+-- dessen Zugänge -> freigegebene Standorte   <- NEU (statt Häkchen + Relationen)
+-- Firmen = Firmen dieser Standorte
    +-- keine -> "Kein Zugang"
    +-- eine -> direkt zur Firma; mehrere -> Firmen-Auswahl (unverändert)

Gemeinsame Stelle "Standorte der aktuellen Firma"  <- liefert nur noch freigegebene
+-- Geräte-Übersicht, Filter-Optionen
+-- CSV-Export Geräte (PROJ-8), CSV-Export Prüfberichte (PROJ-10)
+-- Prüfberichte-Übersicht (PROJ-9)
+-- Dashboard-Zahlen (PROJ-5)
+-- künftig: PDF-Export (PROJ-14)

Besitzprüfung Gerät-Detailseite                    <- prüft freigegebenen Standort
+-- Gerät eines nicht freigegebenen Standorts -> "nicht gefunden" (wie fremde Firma)

Login-Quote im Wochenreport (PROJ-11)              <- zählt über Zugänge
```

### B) Data Model (plain language)
**Neu: Portalzugänge** (Spiegel der Dataverse-Tabelle `bmvcc_portalzugang`). Jeder Eintrag hat:
- ID (aus Dataverse)
- Kontakt (Verweis, kann bei verwaisten Datensätzen leer sein)
- Standort (Verweis)

Befüllt und bereinigt ausschliesslich durch den Firma-Sync. Gelesen nur serverseitig, wie alle Spiegeltabellen.

**Unverändert, aber nicht mehr für den Zugang genutzt:** Relationen Kontakt–Firma (werden weiter synchronisiert) und das Feld „Für Kundenportal freigegeben“ an den Kontakten (wird nicht mehr abgerufen, Spalte bleibt vorerst bestehen).

**Login-Quote:** Basis = Firmen, für deren Standorte mindestens ein aktiver Kontakt einen Zugang hat; eingeloggt = Login eines dieser Kontakte.

### C) Tech Decisions (für PM erklärt)
- **Eine Stelle entscheidet, welche Standorte jemand sieht.** Alle Seiten und Exporte fragen heute schon an einer gemeinsamen Stelle „welche Standorte gehören zur Firma?“. Diese Stelle liefert künftig nur noch die Standorte, für die der Kunde einen Zugang hat. Damit gilt die Einschränkung automatisch überall, auch für den künftigen PDF-Export.
- **Detailseite:** Ruft jemand ein Gerät eines nicht freigegebenen Standorts direkt über die Adresse auf, verhält sich das Portal wie bei einem Gerät einer fremden Firma (Seite nicht gefunden).
- **Entzug muss immer greifen:** Der Sync hat eine Sicherheitsbremse, die grössere Löschungen auf einmal überspringt. Für Zugänge wird sie abgeschaltet, sonst würde schon das Entziehen eines von zwei Zugängen ignoriert.
- **Kein Bruch beim Abbau des Häkchens:** Das Portal fragt das alte Häkchen nicht mehr ab. Das Admin-Tool kann es danach jederzeit in Dataverse löschen.

**Inbetriebnahme (in dieser Reihenfolge):**
1. Datenbank-Migration in Supabase ausführen (neue Tabelle + angepasste Login-Quote; stört den laufenden Code nicht)
2. Code deployen. Ab hier hat niemand Zugang, bis Schritt 3 gelaufen ist
3. Im Admin-Tool die Firmen der 4 Kontakte mit Zugang synchronisieren
4. Rückmeldung an das Admin-Tool

### D) Dependencies
- Keine neuen Pakete
- Eine neue Datenbank-Migration (Tabelle Portalzugänge + Login-Quoten-Funktion)
- Dataverse-Lesezugriff auf `bmvcc_portalzugang`: bereits geprüft (2026-10-09)
- Nachgelagert (eigener kleiner Schritt nach dem Deploy): Spalte „Für Kundenportal freigegeben“ aus der Kontakt-Tabelle entfernen

## Implementation Notes (Backend)

Umgesetzt wie im Tech Design. Kein Frontend-Anteil.

**Datenbank**
- `supabase/migrations/0013_portalzugaenge.sql`: neue Tabelle `dv_portalzugaenge` (`id`, `kontakt_id` nullable, `standort_id`, `synced_at`), Indizes auf beide Verweise, RLS ohne Policies (nur Service-Role). Ersetzt im selben Schritt `erfolgsmessung_login_status()`: Basis = Firmen über Standorte mit Zugang eines aktiven Kontakts. Execute-Rechte erneut nur `service_role`
- `supabase/queries/erfolgsmessung.sql`: beide Login-Quoten-Abfragen mit derselben Regel

**Sync**
- `src/lib/sync/jobs.ts`: neuer Job `portalzugaenge` (`bmvcc_portalzugangs`: ID, Kontakt-, Standort-Verweis). Kontakte-Job fragt `bmvcc_kundenportal` nicht mehr ab
- `src/lib/sync/entities.ts`: Schema für Zugänge (`kontakt_id` darf leer sein), Kontakt-Schema ohne `ist_portal_freigegeben`; neues Flag `ignoreDeleteThreshold`, für Zugänge gesetzt
- `src/lib/sync/run-sync.ts`: Zugänge direkt nach den Standorten über deren IDs; die 20-%-Schwelle gilt nicht, wenn `ignoreDeleteThreshold` gesetzt ist; Kontakte-Schritt lädt Kontakte aus Relationen und Zugängen (ohne Doppelte). Scheitert der Standorte-Schritt, ist die ID-Liste leer und es wird kein Zugang gelöscht
- Die Portal-Spalte `dv_kontakte.ist_portal_freigegeben` bleibt vorerst bestehen (wird nicht mehr geschrieben oder gelesen); Entfernen als späterer Aufräumschritt

**Zugriff**
- `src/lib/auth/access.ts`: `getPortalAccess()` = aktive Kontakte der E-Mail (Dubletten vereinigt) → deren Zugänge → nur Standorte, die im Portal existieren und einer Firma gehören → Firmen dieser Standorte. Liefert zusätzlich `standortIds`. Relationen und Häkchen werden nicht mehr gelesen. Verwaiste Zugänge (ohne Kontakt) können nie treffen
- `src/lib/auth/current-firma.ts`: neuer Typ `FirmaScope` (Firma + freigegebene Standorte) und `getCurrentFirmaScope()`

**Datenabfragen**
- `getStandorteFuerFirma(scope)` in `src/lib/geraete/queries.ts` ist die einzige Stelle für „Standorte der Firma“ und liefert nur noch Standorte der Firma **und** mit Zugang. Darauf bauen `getGeraeteList`, `getGeraeteExportRows`, Prüfberichte-Liste und -Export (`src/lib/pruefberichte/queries.ts`) und `getDashboardKennzahlen` auf; alle nehmen jetzt einen `FirmaScope` statt einer Firma-ID
- `getGeraetById(id, scope)`: Gerät muss an einem Standort mit Zugang **und** in der Firma liegen, sonst `null` → Detailseite 404 (wie fremde Firma)
- Aufrufer umgestellt: Übersicht, Detailseite, Prüfberichte, Dashboard, beide Export-Routen (`getCurrentFirmaScope()`); Firmenname, Einstellungen und Export-Zählung nutzen weiter die Firma-ID

**Tests**
- `access.test.ts` neu für die Zugangsregel (11 Fälle: Firmen/Standorte aus Zugängen, nur Teil-Standorte, zwei Firmen, letzter Zugang entzogen, Relation allein reicht nicht, Häkchen wird ignoriert, inaktiv, firmenloser/unbekannter Standort, verwaister Zugang, Dubletten)
- `jobs.test.ts`: Häkchen wird nicht mehr abgefragt; Mapping der Zugänge inkl. verwaistem Datensatz
- Neue Standort-Einschränkungs-Tests in `geraete/queries.test.ts` (Liste, Export, Detailseite, leerer Bereich), `pruefberichte/queries.test.ts` (Liste + Export), `dashboard/queries.test.ts`; bestehende Tests auf `FirmaScope` umgestellt, Export-Routen-Tests erwarten den Bereich
- `vitest.config.ts`: `.claude/worktrees/**` ausgeschlossen. **Korrektur früherer Zahlen:** `npm test` lief bisher auch über 22 Testdateien einer alten Arbeitskopie unter `.claude/worktrees/` (Branch `claude/datenschutz-datenzugriff-5de83e`, Stand 25.09.). Die in PROJ-11/12/13 genannten Gesamtzahlen (z. B. „380/380“) enthielten diese Kopie; die Projekt-eigene Suite umfasst 25 Testdateien
- `run-sync.test.ts` +6 (Zugänge über Standort-IDs, Kontakt nur mit Zugang wird synchronisiert, Entzug 1 von 2 trotz Schwelle, letzter Zugang, verwaister Zugang, fremde Firma unberührt, kein Löschen bei gescheitertem Standorte-Schritt)
- Gegenproben: ohne Schwellen-Ausnahme schlagen die 2 Entzugs-Tests fehl; ohne Standort-Einschränkung in `getStandorteFuerFirma`/`getGeraetById` schlagen alle 5 Standort-Tests fehl
- `npm test` 218/218 (25 Dateien), Lint, `tsc --noEmit` und Build grün

**Noch nicht ausgeführt:** Migration 0013 in Supabase. Code nur lokal committet; erst **nach** der Migration auf `main` pushen (sonst scheitern Sync und Zugriffsprüfung an der fehlenden Tabelle).

## QA Test Results

**Tested:** 2026-10-09
**Tester:** QA Engineer (AI)
**Testmethode:** Code-Review aller Datenpfade gegen Kriterien und Edge Cases, Unit- und E2E-Suiten, rein lesende Prüfungen gegen die echte Supabase-Datenbank und Dataverse (nach Ausführung von Migration 0013 durch den Nutzer). Kein echter Kunden-Login und kein Sync gegen Produktion vor dem Deploy: Ein Sync mit dem neuen Code schreibt in die Produktionsdatenbank, das ist Teil der Inbetriebnahme. Live-Nachweis deshalb beim `/deploy`.

### Datenbank und Daten (rein lesend verifiziert)
- Migration 0013 ausgeführt: `dv_portalzugaenge` existiert (noch 0 Zeilen, wird beim ersten Sync befüllt); `erfolgsmessung_login_status()` läuft fehlerfrei (aktuell 0 Firmen, siehe Hinweis unten)
- Öffentlicher (Browser-)Schlüssel: Funktion `42501 permission denied`; RLS-Sperre per Vergleich bestätigt (gleiche Regel wie `dv_kontakte`: Service-Role sieht 596 Zeilen, öffentlicher Schlüssel 0)
- Genau der Abruf des neuen Syncs (Zugänge über Standort-IDs, gemappt mit dem echten Job) liefert alle 8 Zugänge aus Dataverse in korrekter Form. Betroffen: 3 Firmen, davon eine mit 3 Standorten (geeignet für den Live-Test der Teil-Freigabe)

### Acceptance Criteria Status
**Sync**
- [x] Zugänge der Standorte werden übernommen: `run-sync.test.ts` + echter Dataverse-Abruf (8/8)
- [x] In Dataverse gelöschter Zugang verschwindet: `run-sync.test.ts` (1 von 2, auch letzter Zugang; Gegenprobe ohne Schwellen-Ausnahme schlägt fehl)
- [x] Kontakt mit Zugang ohne Relation wird synchronisiert: `run-sync.test.ts`
- [x] Verwaister Zugang: kein Fehler (`run-sync.test.ts`), kein Zugang (`access.test.ts`)

**Zugang zum Portal**
- [x] Aktiver Kontakt mit Zugang → Zugang, Häkchen irrelevant: `access.test.ts`
- [x] Kein (verbleibender) Zugang → „Kein Zugang“: `access.test.ts` (auch: Relation allein reicht nicht)
- [x] Inaktiv mit Zugang → „Kein Zugang“: `access.test.ts`
- [x] Zugänge bei zwei Firmen → genau diese Firmen: `access.test.ts`
- [x] Relation ohne Zugang → Firma erscheint nicht: `access.test.ts`

**Sichtbarkeit innerhalb der Firma**
- [x] Nur Standort A sichtbar (Übersicht, Dashboard, Prüfberichte): Standort-Tests in `geraete`, `dashboard`, `pruefberichte`; Gegenprobe ohne Einschränkung schlägt fehl
- [x] CSV-Exporte nur Standort A: Standort-Tests (Geräte- und Prüfberichte-Export), Routen-Tests übergeben den Bereich
- [x] Detailseite eines Geräts an Standort B → keine Daten (404): `geraete/queries.test.ts`; Prüfberichte des Geräts werden erst nach dieser Prüfung geladen (Code-Review)
- [x] Entzug wirkt nach Sync beim nächsten Seitenaufruf: Zugriffsprüfung läuft bei jedem Request (Code-Review, unverändert seit PROJ-2)
- [x] Zugang zu allen Standorten → Verhalten wie bisher: bestehende Tests mit vollem Bereich unverändert grün
- [x] Serverseitig: Code-Review: Alle Abfragen auf Geräte/Prüfberichte laufen über `getStandorteFuerFirma(scope)` oder die Besitzprüfung `getGeraetById(id, scope)`; der Bereich kommt ausschliesslich aus der Sitzung

**Erfolgsmessung**
- [x] Login-Quote über Zugänge: Migration-SQL-Review (Join Firma → Standorte → Zugänge → aktive Kontakte); Funktion läuft fehlerfrei

### Edge Cases Status
- [x] Verwaiste Zugänge, Standort ohne Firma/unbekannt: `access.test.ts`, `run-sync.test.ts`
- [x] Dubletten (gleiche E-Mail): Zugänge vereinigt (`access.test.ts`)
- [x] Zugänge anderer Firmen bleiben beim Sync einer Firma unberührt; gescheiterter Standorte-Schritt löscht keine Zugänge (`run-sync.test.ts`)
- [x] Gewählte Firma verliert alle Zugänge: `current-firma.ts` prüft die Auswahl bei jedem Aufruf gegen die Firmen aus den Zugängen
- [x] Standort wechselt die Firma / wird gelöscht: Standort verschwindet beim Sync der alten Firma aus `dv_standorte` → Zugriffsprüfung ignoriert ihn (fail-closed), bis die neue Firma synchronisiert ist
- [x] Harter Umstieg: Tabelle leer bis zum ersten Sync (verifiziert)

### Security Audit (Red Team)
- [x] Kein Weg an der Standort-Einschränkung vorbei: Firmenwahl-Cookie wird gegen Firmen aus Zugängen geprüft; Detailseite prüft Standort und Firma; Exporte nehmen den Bereich aus der Sitzung, nie aus der Anfrage
- [x] Fail-closed: unbekannter Standort, Standort ohne Firma, verwaister Zugang, leerer Bereich → kein Zugriff
- [x] Neue Tabelle und Funktion für Browser-Clients gesperrt (verifiziert)
- [x] Entzug kann nicht durch die Sicherheitsbremse verloren gehen (Ausnahme getestet, Gegenprobe)
- [x] Portal schreibt nichts nach Dataverse

### Bugs Found

#### BUG-1: Veralteter Kommentar in `src/lib/login-log/log-login.ts`
- **Severity:** Low
- **Beschreibung:** Der Kommentar sagt, ein Kontakt sei „mit mehreren Firmen verknüpft (dv_relationen)“. Seit PROJ-15 kommen die Firmen aus den Portalzugängen. Kein Verhaltensfehler, nur irreführend für spätere Entwickler
- **Priority:** Nice to have
- **Status:** ✅ Behoben (2026-10-09): Kommentar verweist jetzt auf die Portalzugänge (`access.ts`)

#### BUG-2: Gelöschter Standort bleibt sichtbar, wenn sein Löschen von der 20-%-Schwelle gebremst wird
- **Severity:** Low
- **Steps to Reproduce:**
  1. Firma mit 3 Standorten, Kunde hat Zugang zu allen
  2. In Dataverse einen Standort löschen (1 von 3 = 33 %)
  3. Firma synchronisieren
  4. Erwartet: Standort und seine Geräte sind im Portal weg
  5. Tatsächlich: Die Löschung der Standorte wird wegen der Schwelle übersprungen (mit Warn-Mail an den Betreiber); der Zugang zu diesem Standort liegt ausserhalb des Sync-Bereichs und bleibt; der Kunde sieht den gelöschten Standort mit dem letzten Datenstand weiter
- **Einordnung:** Kein Entzug durch einen Freigeber (der wirkt immer), sondern die bestehende Schwellen-Eigenschaft aus PROJ-1 (siehe Open Questions). Der Betreiber wird per Warn-Mail informiert; es sind Daten, auf die der Kunde zuvor berechtigt war
- **Priority:** Fix in next sprint, zusammen mit der offenen Frage zur Schwelle für kleine Firmen
- **Status:** ✅ Behoben (2026-10-09, auf Wunsch des Nutzers vor dem Deploy). `src/lib/sync/run-sync.ts`: Der Standorte-Schritt liefert jetzt auch die IDs, die vor dem Lauf im Bereich lagen (`existingIds`). Standorte, die Dataverse nicht mehr liefert, kommen zusätzlich in den Portal-Bereich des Zugangs-Schritts; ihre Zugänge werden dadurch als „fehlt“ gelöscht (ohne Schwelle), auch wenn die Standort-Zeile selbst wegen der Schwelle stehen bleibt. Der Kunde sieht den Standort danach nicht mehr. Scheitert der Standorte-Schritt, bleibt die Liste leer und es wird kein Zugang gelöscht (unverändert). Folge: Wechselt ein Standort die Firma, verliert ein Zugang zu ihm beim Sync der alten Firma seine Wirkung, bis die neue Firma synchronisiert ist (fail-closed). Geräte- und übrige Schritte unverändert
  - Neuer Test in `run-sync.test.ts` (Standort 1 von 3 gelöscht → Standort-Zeile bleibt wegen Schwelle, Zugang ist weg); Gegenprobe mit altem Bereich schlägt fehl
  - `npm test` 219/219, Lint, `tsc --noEmit` und Build grün

### Hinweise für die Inbetriebnahme
- **Wochenreport:** Seit Migration 0013 zählt die Login-Quote über die (noch leere) Zugangs-Tabelle. Bis zum Deploy und Sync der 3 betroffenen Firmen zeigt der Report „Keine Kunden mit Zugang“. Deploy daher vor Montag, 12.10.2026, 06:00 UTC
- **E2E-Testumgebung:** Auf Port 3000 lief der Entwicklungsserver des Admin-Tools; Playwright verwendet einen laufenden Server wieder (`reuseExistingServer`) und testete deshalb zuerst die falsche App (Fehlalarme). Mit einer temporären Konfiguration auf Port 3100 liefen alle Tests gegen das Portal. Kein Produkt-Bug; bei Bedarf eigener Port für das Portal oder `reuseExistingServer` abschalten

### Automatisierte Tests
- `npm test`: 218/218 grün (25 Dateien); nach den Bug-Fixes 219/219
- `npm run test:e2e`: 38/38 grün (Chromium + Mobile Safari, gegen das Portal auf Port 3100)
- Keine neue E2E-Suite: Der Unterschied zwischen Standorten zeigt sich erst nach einem echten Login; ohne Login ist alles bereits abgedeckt (alle geschützten Seiten und Exporte → `/login`)

### Summary
- **Acceptance Criteria:** 16/16 erfüllt (per Unit-Tests mit Gegenproben, Code-Review und Datenprüfung; Live-Login-Nachweis folgt beim Deploy)
- **Bugs Found:** 2 (0 critical, 0 high, 0 medium, 2 low), **beide behoben**
- **Security:** keine Findings
- **Production Ready:** **JA**, Status Approved. Deploy möglichst vor Montag (siehe Hinweis Wochenreport)

**Live-Test beim Deploy:** Im Admin-Tool bei der Firma mit 3 Standorten einem Testkontakt nur einen Standort freigeben → synchronisieren → im Portal prüfen, dass nur dieser Standort sichtbar ist (Übersicht, Detailseite eines anderen Standorts per Adresse, Exporte); dann den Zugang entziehen → synchronisieren → „Kein Zugang“.

## Deployment
- **Production URL:** https://obsi-hoferkundenportal.vercel.app
- **Deployed:** 2026-10-09 (automatisch via Vercel bei Push auf `main`, letzter Code-Commit `1d6a410`)
- **Migration:** `supabase/migrations/0013_portalzugaenge.sql`, vom Nutzer vor dem Push im Supabase SQL Editor ausgeführt und rein lesend verifiziert (Tabelle vorhanden, für Browser-Clients gesperrt; Login-Quoten-Funktion läuft)
- **Env-Variablen:** keine neuen
- **Verifiziert:**
  - Pre-Deployment: `npm test` 219/219, `npm run test:e2e` 38/38, Lint, `tsc --noEmit`, Build grün
  - Smoke-Test Produktion: `/login` → 200; `/dashboard` und `/api/uebersicht/export` ohne Sitzung → 307 auf `/login`
  - **Live durch den Nutzer** nach Sync der 3 Firmen mit Zugängen über das Admin-Tool: Login der bestehenden Kontakte wie bisher; Teil-Freigabe (ein Standort einer Firma mit 3 Standorten) zeigt nur diesen Standort; Entzug + Sync → „Kein Zugang“
- **Wirkung:** Harter Umstieg. Zugang und sichtbare Standorte kommen seit diesem Deployment ausschliesslich aus `bmvcc_portalzugang`; das Häkchen `bmvcc_kundenportal` wird vom Portal weder gelesen noch abgefragt
- **Nachgelagert:** Portal-Spalte `dv_kontakte.ist_portal_freigegeben` kann in einer späteren Migration entfernt werden (wird nicht mehr genutzt)
- **Rückmeldung an das Admin-Tool:** am 2026-10-09 vorbereitet (Text siehe Chat); das Admin-Tool kann `bmvcc_kundenportal` ab jetzt als Übergangsfeld behandeln
- **Tag:** `v1.11.0-PROJ-15`
