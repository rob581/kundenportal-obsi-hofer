# PROJ-15: Portal-Zugang pro Standort

## Status: Planned
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

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
