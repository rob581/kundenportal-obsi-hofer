# PROJ-13: Kontakt-Freigabe für Kundenportal-Zugang

## Status: Planned
**Created:** 2026-10-06
**Last Updated:** 2026-10-07

## Dependencies
- Requires: PROJ-1 (Dataverse-Sync-Service): Das Freigabe-Häkchen muss mit den Kontakten synchronisiert werden
- Requires: PROJ-2 (Kunden-Login): Die bestehende Zugriffsprüfung (aktiver Kontakt + Zuordnung zu einer Firma) wird um das Häkchen erweitert
- Requires: PROJ-12 (Firma-Filter für Dataverse-Sync): Freigabe und Entzug kommen ausschliesslich über den firma-gefilterten Sync ins Portal
- **Cross-Repo-Abhängigkeit:** `obsi-hofer-admin` PROJ-8 („Kundenportal-Zugang pro Kontakt“, deployed). Dort setzt bzw. entfernt ein Freigeber das Häkchen `bmvcc_kundenportal` am Kontakt in Dataverse. PROJ-13 ist die Gegenseite im Portal. Die Synchronisation löst `obsi-hofer-admin` PROJ-5 aus.

## User Stories
- Als OBSI Hofer GmbH möchte ich, dass nur ausdrücklich freigegebene Kontakte Zugang zum Kundenportal erhalten, damit nicht jeder aktive Kontakt aus Bexio automatisch Kundendaten einsehen kann.
- Als Freigeber (im Admin-Tool) möchte ich, dass ein Kontakt nach dem Setzen des Häkchens und dem Sync seiner Firma Zugang zum Portal hat, damit ich Kunden gezielt freischalten kann.
- Als Freigeber möchte ich, dass ein Kontakt nach dem Entfernen des Häkchens und dem nächsten Sync seiner Firma keinen Zugang mehr hat, auch in einer bereits laufenden Sitzung, damit ein Zugang z. B. nach einem Stellenwechsel zuverlässig endet.
- Als freigegebener Kunde möchte ich mich wie bisher per E-Mail-Code oder Passkey anmelden und die Daten aller meiner Firmen sehen, ohne dass sich für mich etwas ändert.
- Als nicht freigegebener Kontakt möchte ich beim Login dieselbe klare „Kein Zugang“-Meldung mit Kontaktmöglichkeit sehen wie bisher, damit ich weiss, an wen ich mich wenden kann.

## Out of Scope
- Setzen und Entfernen des Häkchens: erfolgt im Admin-Tool (`obsi-hofer-admin` PROJ-8), nie im Portal (Portal bleibt read-only)
- Auslösen des Syncs: `obsi-hofer-admin` PROJ-5
- Einladungs- oder Benachrichtigungs-E-Mails an freigegebene Kontakte: PRD-Non-Goal „keine automatischen Benachrichtigungen“
- Übergangsfrist für bisher eingeloggte, nicht freigegebene Kontakte: bewusst harter Umstieg, siehe Decision Log
- Eigene, spezifischere Meldung für „aktiv, aber nicht freigegeben“: es bleibt die generische „Kein Zugang“-Meldung (PROJ-2)
- Firmen-Auswahl auf Firmen beschränken, die seit PROJ-12 über das Admin-Tool synchronisiert wurden: siehe Decision Log (Mehrfirmen-Kontakte)
- Bereinigung von Daten nicht freigegebener Firmen, die noch aus dem früheren Vollsync stammen: nicht Teil dieses Features, siehe Open Questions
- Auswertung der Anzahl freigegebener Kontakte im Erfolgsmessungs-Report (PROJ-11)
- Rollen oder abgestufte Rechte pro Kontakt: weiterhin sehen alle zugelassenen Kontakte einer Firma dieselben Daten (PROJ-2)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Kontakt hat in Dataverse das Häkchen „Kundenportal“, wenn der Sync seiner Firma läuft, dann ist der Freigabe-Status dieses Kontakts danach im Portal bekannt
- [ ] Angenommen ein Kontakt ist aktiv, hat das Häkchen und ist mindestens einer Firma zugeordnet, wenn er sich per E-Mail-Code oder Passkey anmeldet, dann erhält er Zugang wie bisher (eine Firma: direkt zur Übersicht; mehrere: Firmen-Auswahl)
- [ ] Angenommen ein Kontakt ist aktiv und einer Firma zugeordnet, hat aber kein Häkchen, wenn er sich anmeldet, dann sieht er dieselbe generische „Kein Zugang“-Meldung wie ein unbekannter oder inaktiver Kontakt und es werden keine Kundendaten geladen
- [ ] Angenommen ein Kontakt hat das Häkchen, ist aber inaktiv, wenn er sich anmeldet, dann sieht er die generische „Kein Zugang“-Meldung
- [ ] Angenommen ein freigegebener Kontakt ist eingeloggt und das Häkchen wird im Admin-Tool entfernt, wenn danach der Sync einer seiner Firmen läuft, dann hat er beim nächsten Seitenaufruf keinen Zugang mehr (auch in der laufenden Sitzung), inklusive CSV-Exporte
- [ ] Angenommen ein nicht freigegebener Kontakt erhält im Admin-Tool das Häkchen, wenn danach der Sync einer seiner Firmen läuft, dann kann er sich anmelden und erhält Zugang
- [ ] Angenommen das Häkchen wurde geändert, aber noch kein Sync ist gelaufen, wenn sich der Kontakt anmeldet, dann gilt im Portal weiterhin der zuletzt synchronisierte Stand
- [ ] Angenommen ein Kontakt wurde noch nie mit seinem Freigabe-Status synchronisiert (z. B. nur Daten aus dem früheren Vollsync), wenn er sich anmeldet, dann gilt er als nicht freigegeben
- [ ] Angenommen die Prüfung erfolgt, wenn ein Kunde Daten aufruft (Seiten oder Exporte), dann wird das Häkchen serverseitig geprüft, nie nur in der Oberfläche

## Edge Cases
- **Kontakt mehrerer Firmen:** Das Häkchen ist eine Eigenschaft des Kontakts und gilt für alle seine Firmen. Nach dem Sync von Firma A sieht der Kontakt auch Firma B. Deren Daten können noch aus dem früheren Vollsync stammen und veraltet sein. Fremddaten sieht er dabei nicht, nur eigene. Hingenommen und dokumentiert. Das Admin-Tool weist mit „gilt auch für weitere Firmen“ darauf hin (aktuell 11 Kontakte).
- **Entzug, aber nur eine der Firmen wird synchronisiert:** Der Sync von Firma A aktualisiert den Kontakt und damit den Entzug für alle seine Firmen, da es derselbe Kontakt-Datensatz ist.
- **Kontakt wird aus der Firma entfernt (Relation gelöscht), Häkchen bleibt gesetzt:** Nach dem Sync der Firma fehlt die Zuordnung. Bei keiner weiteren Firma: „Kein Zugang“. Bei weiteren Firmen: die Firma verschwindet aus der Auswahl (bestehendes Verhalten PROJ-2).
- **Freigegebener Kontakt ohne E-Mail-Adresse** (Häkchen nachträglich behalten, E-Mail entfernt): Ein Login ist ohne E-Mail nicht möglich. Keine Sonderbehandlung nötig.
- **Bereits registrierter Passkey eines nun nicht mehr freigegebenen Kontakts:** Die Passkey-Anmeldung selbst kann gelingen, danach greift dieselbe Zugriffsprüfung und zeigt „Kein Zugang“.
- **Kontakt gerade auf der Firmen-Auswahl, während der Entzug wirksam wird:** Die Auswahl einer Firma wird serverseitig erneut geprüft und abgelehnt.
- **Harter Umstieg beim Deploy:** Ab Inbetriebnahme hat niemand Zugang, dessen Häkchen nicht synchronisiert ist, auch die bisherigen Testkontakte nicht. Vor dem Deploy den eigenen Testkontakt im Admin-Tool freigeben und Cloudcab GmbH synchronisieren.

## Technical Requirements (optional)
- Security: Die Freigabe wird ausschliesslich serverseitig gegen die synchronisierten Daten geprüft, an derselben zentralen Stelle wie Aktiv-Status und Firmen-Zuordnung (gilt damit für Seiten, Firmen-Auswahl, Login-Ablauf und CSV-Exporte gleichermassen)
- Security: Ein fehlender oder unbekannter Freigabe-Wert gilt immer als „nicht freigegeben“ (fail-closed)
- Keine Änderung an Dataverse durch das Portal (read-only bleibt)

## Open Questions
- [ ] Sollen Daten von Firmen, die noch aus dem früheren Vollsync in Supabase liegen, aber nie über das Admin-Tool freigegeben wurden, bereinigt werden? Durch PROJ-13 sind sie für Kunden nicht mehr erreichbar, solange kein freigegebener Kontakt dazugehört. Sie liegen aber weiterhin in der Portal-Datenbank. Bei Bedarf als eigenes Feature.

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Zugang nur bei: Kontakt aktiv **und** Häkchen „Kundenportal“ gesetzt **und** mindestens einer Firma zugeordnet | Das Häkchen ist die ausdrückliche Freigabe-Entscheidung aus dem Admin-Tool. Der Aktiv-Status bleibt zusätzlich nötig, damit ein deaktivierter Kontakt mit vergessenem Häkchen keinen Zugang behält | 2026-10-07 |
| Ersetzt die Selbstbedienungs-Regel aus PROJ-2 („jeder aktive, zugeordnete Kontakt erhält beim ersten Login automatisch Zugang“) | Passt zur PRD-Vorgabe „Zugang wird manuell freigeschaltet“. Die Freigabe erfolgt jetzt gezielt pro Kontakt im Admin-Tool | 2026-10-07 |
| Harter Umstieg ohne Übergangsfrist | Das Portal hat noch keine echten Kunden (nur Testkontakte), es verliert also niemand Zugang. Eine Übergangsregel wäre Zusatzaufwand ohne Nutzen | 2026-10-07 |
| Nicht freigegebene Kontakte sehen dieselbe generische „Kein Zugang“-Meldung | Konsistent mit PROJ-2: von aussen soll nicht erkennbar sein, ob eine E-Mail-Adresse bei OBSI Hofer bekannt ist | 2026-10-07 |
| Entzug wirkt nach dem nächsten Sync einer Firma des Kontakts beim nächsten Seitenaufruf, auch in laufenden Sitzungen | Der Zugang wird ohnehin bei jedem Seitenaufruf neu geprüft (PROJ-2). Ein Entzug soll nicht bis zum nächsten Login warten müssen | 2026-10-07 |
| Mehrfirmen-Kontakte sehen nach Freigabe alle ihre Firmen, auch wenn eine davon noch nicht über das Admin-Tool synchronisiert wurde | Es sind ausschliesslich eigene Firmen des Kontakts, keine Fremddaten. Eine Einschränkung auf „seit PROJ-12 synchronisierte Firmen“ wäre zusätzlicher Umfang für aktuell 11 Kontakte. Das Admin-Tool weist bereits darauf hin | 2026-10-07 |
| Kein oder unbekannter Freigabe-Status gilt als „nicht freigegeben“ | Fail-closed: Kontakte, deren Firma noch nie über das Admin-Tool synchronisiert wurde, erhalten keinen Zugang | 2026-10-07 |

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
