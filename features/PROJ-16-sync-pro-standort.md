# PROJ-16: Sync pro Standort

## Status: Planned
**Created:** 2026-10-09
**Last Updated:** 2026-10-09

## Dependencies
- Requires: PROJ-12 (Firma-Filter für Dataverse-Sync): erweitert den bestehenden Firma-Sync um einen optionalen Standort-Filter
- Requires: PROJ-15 (Portal-Zugang pro Standort): Portalzugänge werden auch im Standort-Lauf übertragen und bereinigt
- Betrifft: PROJ-1 (20-%-Lösch-Schwelle wird um eine Mindestmenge ergänzt, gilt für alle Läufe)
- **Cross-Repo-Abhängigkeit:** `obsi-hofer-admin` PROJ-12 („Sync-Freigabe und -Verlauf pro Standort“). Das Admin-Tool schickt `standortId` erst, wenn dort der Schalter `KUNDENPORTAL_STANDORT_SYNC_AKTIV=true` gesetzt ist; der wird nach unserer Rückmeldung zum Deploy gesetzt. Auftrag vom 2026-10-09

## User Stories
- Als Freigeber (Admin-Tool) möchte ich einen einzelnen Standort ins Kundenportal übertragen, sobald dessen Prüfungen fertig sind, ohne halbfertige Daten anderer Standorte derselben Firma mitzuschicken.
- Als Freigeber möchte ich, dass ein Standort-Lauf alle übrigen Standorte der Firma im Portal unverändert lässt, auch deren Löschungen und Zugänge.
- Als Freigeber möchte ich, dass in Dataverse gelöschte Geräte, Prüfberichte und Zugänge dieses Standorts nach dem Standort-Lauf auch im Portal verschwinden.
- Als Admin-Tool möchte ich in der Antwort sehen, für welche Firma und welchen Standort tatsächlich übertragen wurde, damit ich einen Lauf ohne wirksamen Standort-Filter erkenne.
- Als Freigeber möchte ich, dass ein versehentlich falscher Standort (andere Firma, nicht vorhanden) abgelehnt wird, ohne dass etwas übertragen wird.
- Als Betreiber möchte ich, dass Löschungen bei kleinen Mengen (wenige Geräte eines Standorts oder einer kleinen Firma) zuverlässig übernommen werden, ohne den Schutz gegen kaputte Abrufe bei grossen Mengen zu verlieren.

## Out of Scope
- Relationen Kontakt–Firma im Standort-Lauf: werden nicht übertragen, der nächste Firmen-Lauf aktualisiert sie (siehe Decision Log)
- Entfernen eines in Dataverse gelöschten Standorts per Standort-Lauf: Standort-Lauf wird abgelehnt; der nächste Firmen-Lauf räumt ihn weg
- Mehrere Standorte in einem Aufruf: pro Aufruf genau ein Standort; mehrere Standorte = mehrere Aufrufe
- Kontaktdaten von Kontakten, deren Zugang zu diesem Standort entzogen wurde: ihr Zugang endet durch das Löschen des Zugangs, die Kontaktdaten aktualisiert der nächste Lauf, bei dem sie noch einen Zugang haben
- Oberfläche im Portal: keine
- Verlauf der Läufe: liegt im Admin-Tool (dortiges PROJ-12)
- Sperren gleichzeitiger Läufe (Locking): wie bisher nicht vorgesehen (PROJ-12 Open Questions)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Aufruf und Prüfungen**
- [ ] Angenommen der Sync-Endpoint wird mit gültigem `CRON_SECRET`, `firmaId` und `standortId` aufgerufen, wenn der Standort in Dataverse existiert und zur Firma gehört, dann wird ein Standort-Lauf ausgeführt
- [ ] Angenommen der Endpoint wird ohne `standortId` aufgerufen, wenn der Sync läuft, dann verhält er sich exakt wie bisher (ganze Firma, PROJ-12/PROJ-15)
- [ ] Angenommen `standortId` ist leer oder keine GUID, wenn die Anfrage ankommt, dann wird sie mit 400 und verständlicher Meldung abgelehnt und nichts übertragen
- [ ] Angenommen der Standort existiert in Dataverse nicht oder gehört dort zu einer anderen Firma, wenn die Anfrage ankommt, dann wird sie mit 404 und verständlicher Meldung abgelehnt und im Portal nichts verändert
- [ ] Angenommen die Firma selbst existiert nicht, wenn die Anfrage ankommt, dann wie bisher 404 (PROJ-12)
- [ ] Angenommen die Anfrage hat kein oder ein falsches `CRON_SECRET`, wenn sie ankommt, dann 401 (wie bisher), auch mit `standortId`

**Umfang eines Standort-Laufs**
- [ ] Angenommen ein Standort-Lauf für Standort A läuft, wenn er fertig ist, dann sind die Firma (Stammdaten), Standort A, die Geräte von A, deren Prüfberichte, die Portalzugänge zu A, die Kontakte mit Zugang zu A und alle Artikel aktualisiert
- [ ] Angenommen die Firma hat neben A einen Standort B, wenn der Standort-Lauf für A läuft, dann bleiben Standort B, seine Geräte, Prüfberichte und Zugänge im Portal unverändert, auch wenn sie in Dataverse inzwischen gelöscht oder geändert wurden
- [ ] Angenommen ein Gerät von A wurde in Dataverse gelöscht, wenn der Standort-Lauf für A läuft, dann ist es danach im Portal entfernt; Geräte von B bleiben unberührt
- [ ] Angenommen ein Prüfbericht eines Geräts von A wurde in Dataverse gelöscht, wenn der Standort-Lauf für A läuft, dann ist er danach im Portal als gelöscht markiert (wie bisher)
- [ ] Angenommen ein Zugang zu A wurde in Dataverse entzogen, wenn der Standort-Lauf für A läuft, dann ist er danach im Portal entfernt (ohne Lösch-Schwelle, wie PROJ-15); Zugänge desselben Kontakts zu B bleiben
- [ ] Angenommen ein Kontakt hat einen Zugang zu A, aber keine Relation zur Firma, wenn der Standort-Lauf für A läuft, dann ist der Kontakt danach im Portal vorhanden
- [ ] Angenommen ein Standort-Lauf läuft, wenn er fertig ist, dann sind die Relationen Kontakt–Firma unverändert

**Rückmeldung**
- [ ] Angenommen ein Lauf ist erfolgreich, wenn die Antwort zurückkommt, dann enthält das JSON zusätzlich `scope` mit `firmaId` und `standortId` (bei einem Firmen-Lauf `standortId: null`)
- [ ] Angenommen ein Standort-Lauf ist erfolgreich, wenn die Antwort zurückkommt, dann meldet der Eintrag `standorte` in `entities` `fetched: 1`

**Lösch-Schwelle (alle Läufe)**
- [ ] Angenommen vor einem Lauf waren in einem Bereich (z. B. Geräte eines Standorts) höchstens 10 Einträge bekannt, wenn davon welche in Dataverse fehlen, dann werden sie gelöscht, auch wenn das mehr als 20 % sind
- [ ] Angenommen vor einem Lauf waren mehr als 10 Einträge bekannt, wenn mehr als 20 % davon fehlen, dann wird das Löschen wie bisher übersprungen und eine Warnung gemeldet

**Firmenwechsel eines Standorts**
- [ ] Angenommen ein Standort wurde in Dataverse einer anderen Firma zugeordnet, wenn ein Standort-Lauf mit der neuen Firma und diesem Standort läuft, dann gehört der Standort im Portal danach zur neuen Firma und Zugänge zu ihm wirken wieder

## Edge Cases
- **Standort ohne Geräte:** Lauf geht leer durch, kein Fehler; vorher bekannte Geräte von A werden entfernt (Mindestmenge greift)
- **Standort ohne Zugänge:** kein Fehler; vorher bekannte Zugänge zu A werden entfernt
- **Gerät wechselt von A zu B:** Standort-Lauf A entfernt es aus A (es fehlt dort); erscheint bei B erst nach dem Lauf für B oder einem Firmen-Lauf. Bis dahin ist es im Portal nicht sichtbar (fail-closed)
- **Kontakt mit Zugang zu A und B:** Standort-Lauf A aktualisiert den Kontakt (gemeinsamer Datensatz); seine Zugänge zu B bleiben
- **Standort-Lauf mit der alten Firma nach einem Firmenwechsel:** abgelehnt (404), nichts verändert
- **Grosse Mengen:** z. B. Standort mit 200 Geräten, davon fehlen 50 (25 %) → Löschen übersprungen + Warnung (Schutz gegen kaputte Abrufe bleibt)
- **Grenzfall Mindestmenge:** genau 10 bekannte Einträge → Mindestmenge greift noch (gelöscht wird); ab 11 gilt die 20-%-Schwelle
- **Zugänge:** weiterhin immer ohne Schwelle (PROJ-15), unabhängig von der Mindestmenge
- **Admin-Tool schickt `standortId`, Portal noch alte Version:** Der alte Endpoint ignoriert den Parameter und überträgt die ganze Firma; die fehlende `scope.standortId` in der Antwort zeigt das dem Admin-Tool an (deshalb erst Deploy, dann Schalter)

## Technical Requirements (optional)
- Security: identische Auth wie bisher (`CRON_SECRET`); `standortId` wird wie `firmaId` vor jeder Verwendung in einem Dataverse-Filter als GUID geprüft (vgl. PROJ-12 QA BUG-1)
- Ein abgelehnter Aufruf (400/404) verändert nichts und löst keine Ops-Mail aus (wie bei falscher `firmaId`)
- Portal bleibt read-only gegenüber Dataverse

## Open Questions
- [ ] Ist 10 die richtige Mindestmenge? Gewählt als Grösse, bei der ein Teil-Abruf unwahrscheinlich unbemerkt bliebe; nach einigen Wochen Betrieb anhand der Warn-Mails prüfen

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Priorität P1, vor PROJ-14 | Das Admin-Tool wartet darauf; Freigeber sollen fertige Standorte einzeln übertragen können | 2026-10-09 |
| Optionaler Parameter `standortId` zusätzlich zur Pflicht-`firmaId`; ohne ihn exakt das bisherige Verhalten | Auftrag des Admin-Tools; Firmen ohne Standort und Gesamt-Läufe bleiben möglich | 2026-10-09 |
| Lösch-Schwelle erhält eine Mindestmenge: erst ab mehr als 10 vorher bekannten Einträgen greift die 20-%-Regel; gilt für Standort- und Firmen-Läufe | Bei einzelnen Standorten (und kleinen Firmen) würde sonst schon das Löschen weniger Geräte übersprungen. Grosse Mengen bleiben gegen kaputte Abrufe geschützt. Schliesst die offene Frage aus PROJ-15 | 2026-10-09 |
| Relationen Kontakt–Firma werden im Standort-Lauf nicht übertragen | Seit PROJ-15 für den Zugang nicht nötig; sie hängen an der Firma, nicht am Standort; „alles andere bleibt unverändert“ | 2026-10-09 |
| Ungültiger Standort (nicht vorhanden oder andere Firma) → 404, nichts verändert; kein Entfernen gelöschter Standorte per Standort-Lauf | Kein Risiko, durch einen falschen Aufruf etwas zu löschen; der Firmen-Lauf räumt gelöschte Standorte weg | 2026-10-09 |
| Kontakte im Standort-Lauf = Kontakte mit aktuellem Zugang zu diesem Standort | „Soweit für den Zugang nötig“ (Auftrag): wer seinen Zugang verliert, verliert ihn durch das Löschen des Zugangs, seine Kontaktdaten müssen dafür nicht angefasst werden | 2026-10-09 |
| Antwort enthält `scope` (`firmaId`, `standortId` bzw. `null`); `standorte.fetched` ist bei einem Standort-Lauf 1 | Zweite Absicherung im Admin-Tool: ein Lauf ohne wirksamen Standort-Filter fällt sofort auf | 2026-10-09 |
| Firmenwechsel: ein Standort-Lauf bei der neuen Firma genügt | Er schreibt den Standort mit der neuen Firma ins Portal, damit greifen dessen Zugänge wieder (Antwort auf die Frage des Admin-Tools) | 2026-10-09 |

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
