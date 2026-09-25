# PROJ-12: Firma-Filter für Dataverse-Sync

## Status: Planned
**Created:** 2026-09-25
**Last Updated:** 2026-09-25

## Dependencies
- Requires: PROJ-1 (Dataverse-Sync-Service) — erweitert den bestehenden Sync-Endpoint

## User Stories
- Als aufrufendes System (das neue interne Admin-Tool `obsi-hofer-admin`, separates Repo) möchte ich den Sync für eine einzelne Firma auslösen können, damit nicht bei jeder Freigabe das gesamte Datenmodell synchronisiert werden muss.
- Als Betreiber möchte ich weiterhin die Möglichkeit haben, manuell einen vollständigen Sync auszulösen (z.B. für Notfälle/Ersteinrichtung), auch nachdem der automatische nächtliche Trigger entfernt wurde.
- Als Betreiber möchte ich, dass ein Firma-gefilterter Sync niemals Daten anderer Firmen fälschlicherweise als "gelöscht" behandelt, damit keine Datenverluste durch eine fehlerhafte Scoping-Logik entstehen.

## Out of Scope
- UI/Trigger-Mechanismus im Admin-Tool selbst — liegt im separaten `obsi-hofer-admin`-Repo (dortiges PROJ-5, "Sync-Freigabe pro Firma")
- Neue Authentifizierungsmechanismen — reine Wiederverwendung des bestehenden `CRON_SECRET`
- Änderungen an der Artikel-Synchronisation (`dv_artikel`) — bleibt unverändert, immer vollständig (firmenübergreifende Stammdaten, kleine Datenmenge, siehe Product Decisions)
- Sync-Verlauf/-Historie pro Firma — das ist PROJ-6 im Admin-Tool-Projekt (eigene Datenhaltung dort), nicht Teil dieser Spec
- Verhindern gleichzeitiger Firma-Syncs (Locking) — siehe Open Questions

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen der Endpoint wird mit einem gültigen `firmaId`-Query-Parameter aufgerufen, wenn der Sync läuft, dann werden nur Firmen/Standorte/Geräte/Prüfberichte/Kontakte/Relationen dieser einen Firma synchronisiert, `dv_artikel` weiterhin vollständig
- [ ] Angenommen der Endpoint wird ohne `firmaId`-Parameter aufgerufen, wenn der Sync läuft, dann verhält er sich wie bisher (vollständige Synchronisation aller Entitäten)
- [ ] Angenommen ein Firma-gefilterter Sync läuft, wenn die Lösch-Erkennung (`computeMissingIds`/Sicherheits-Schwellenwert) greift, dann bezieht sie sich ausschliesslich auf zuvor bekannte IDs dieser einen Firma, nie auf Datensätze anderer Firmen
- [ ] Angenommen die übergebene `firmaId` existiert nicht in Dataverse, wenn der Sync aufgerufen wird, dann wird ein Fehler (404) zurückgegeben statt eines stillen No-Ops
- [ ] Angenommen der automatische nächtliche Cron-Trigger wird entfernt, wenn `vercel.json` geprüft wird, dann existiert dort kein Eintrag mehr für `/api/cron/sync-dataverse`
- [ ] Angenommen der Endpoint wird ohne oder mit falschem `CRON_SECRET` aufgerufen (mit oder ohne `firmaId`), wenn die Anfrage ankommt, dann wird sie mit 401 abgelehnt

## Edge Cases
- Firma hat keine Standorte/Geräte (z.B. brandneuer Kunde) → Sync läuft leer für diese Firma durch, kein Fehler
- Ein Kontakt ist mit mehreren Firmen verknüpft → wird bei jeder betroffenen Firma-Sync erneut upgesertet, unkritisch (idempotent)
- Zwei Firma-Syncs laufen zeitlich überlappend (z.B. zwei Freigaben kurz hintereinander) → kein Lock-Mechanismus in dieser Spec vorgesehen, Upserts sind idempotent; theoretisches Race-Condition-Risiko bei der Lösch-Erkennung siehe Open Questions
- Firma existiert, aber >20% ihrer bisher bekannten Geräte fehlen im aktuellen Abruf → bestehende Sicherheitslogik (Löschung überspringen, Warnung) gilt weiterhin, jetzt bezogen auf die Firma-Teilmenge statt auf die Gesamtmenge

## Technical Requirements (optional)
- Security: identische Auth wie bisher (`CRON_SECRET`), kein neuer Angriffsvektor
- Performance: pro Firma deutlich weniger Datenvolumen als der bisherige Vollsync, kürzere Laufzeit erwartet — `maxDuration` kann bei Bedarf nach realen Messungen reduziert werden

## Open Questions
- [ ] Sollen gleichzeitige Firma-Syncs (Race Condition bei der Lösch-Erkennung) explizit verhindert werden (z.B. einfacher Lock pro Firma), oder reicht die geringe Wahrscheinlichkeit bei einem internen Tool mit wenigen Nutzern als Risiko aus? Aktuell nicht adressiert, bei Bedarf in `/refine PROJ-12` nachziehen

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Vollsync-Fähigkeit (kein `firmaId`) bleibt erhalten, nur der automatische Cron-Trigger entfällt | Nützlich für Notfälle/Ersteinrichtung, weniger riskant als den Vollsync komplett zu entfernen | 2026-09-25 |
| Firma-gefilterter Sync nutzt denselben `CRON_SECRET` wie bisher | Keine neue Auth-Mechanik nötig — beide Aufrufer (früher Vercel Cron, künftig das Admin-Tool) sind gleichermassen vertrauenswürdige interne Systeme | 2026-09-25 |
| Unbekannte `firmaId` liefert einen Fehler statt eines stillen No-Ops | Verhindert, dass ein Tippfehler im Admin-Tool unbemerkt bleibt | 2026-09-25 |
| `dv_artikel` bleibt bei jedem Firma-Sync vollständig synchronisiert, nicht gefiltert | Firmenübergreifende Stammdaten mit kleiner Datenmenge — Filterung würde nur Komplexität ohne spürbaren Nutzen bringen | 2026-09-25 |
| Lösch-Erkennung muss beim Firma-Sync auf die ID-Teilmenge dieser Firma beschränkt werden | Kritischer Korrektheits-Fix — sonst würden andere Firmen bei jedem gefilterten Sync fälschlich als "komplett gelöscht" erkannt und ihre Geräte/Prüfberichte gelöscht/soft-deleted | 2026-09-25 |

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
