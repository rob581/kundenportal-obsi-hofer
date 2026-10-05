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
| ID-Verkettung (Firma→Standort→Gerät→Prüfbericht, Firma→Relation→Kontakt) statt Dataverse-Navigationsfilter über mehrere Beziehungsebenen | Dieselbe, bereits im `obsi-hofer-admin`-Projekt erprobte Technik; ein mehrstufiger Navigationsfilter ist für diese Tiefe nicht verlässlich verifiziert, ein Fehlschlag würde die sicherheitskritische Lösch-Erkennung verfälschen | 2026-10-05 |
| Feste Ausführungsreihenfolge nur im firma-gefilterten Modus (Standorte vor Geräten, Geräte vor Prüfberichten, Relationen vor Kontakten) | Jeder Schritt liefert die ID-Menge, die der nächste Schritt als Filter braucht; ohne `firmaId` bleiben alle Entitäten wie bisher unabhängig | 2026-10-05 |
| Lösch-Erkennung ("was hatten wir vorher") wird über den bereits gespeicherten eigenen Beziehungs-Stand gescoped, nicht über den aktuellen Dataverse-Abruf | Verhindert, dass ein zwischenzeitlich zu einer anderen Firma/Standort umgezogenes Gerät fälschlich als gelöscht markiert wird | 2026-10-05 |
| Firma-Existenzprüfung über den ersten Kettenschritt (kein Treffer → sofort 404) | Erfüllt die Spec-Anforderung, einen Tippfehler bei der firmaId nicht als stillen Leerlauf durchgehen zu lassen | 2026-10-05 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Component Structure
Kein UI-Feature — reine Erweiterung des bestehenden Sync-Endpoints. Struktur des Sync-Ablaufs:

```
/api/cron/sync-dataverse (bestehender Endpoint, erweitert)
+-- Ohne firmaId: bisheriges Verhalten unverändert (alle Jobs unabhängig, wie heute)
+-- Mit firmaId: fester Ablauf mit zwei Ketten
    +-- Kette 1: Firma → Standorte → Geräte → Prüfberichte
    |   (Firma-Existenz wird dabei geprüft: keine Standorte/kein Treffer für
    |    die firmaId selbst → 404 statt stillem Leerlauf)
    +-- Kette 2: Firma → Relationen → Kontakte
    +-- Artikel: unabhängig von beiden Ketten, immer vollständig (wie bisher)
```

### B) Data Model (plain language)
Kein neues Datenmodell — dieselben sieben Entitäten wie heute (Firmen, Kontakte, Artikel, Standorte, Geräte, Prüfberichte, Relationen). Wichtig für den Firma-Filter: **Geräte und Prüfberichte haben in Dataverse keinen direkten Bezug zu einer Firma** — ein Gerät gehört zu einem Standort, ein Prüfbericht zu einem Gerät. Ebenso haben Kontakte keinen direkten Firma-Bezug, sondern werden nur über eine Relation (Firma↔Kontakt) verknüpft. Ein Firma-gefilterter Sync muss diese Kette deshalb Schritt für Schritt nachvollziehen, sowohl beim Abfragen von Dataverse als auch beim Abgleichen mit dem bisherigen Stand in der eigenen Datenbank.

### C) Tech Decisions
- **ID-Verkettung statt Dataverse-Navigationsfilter über mehrere Ebenen:** Jeder Schritt der Kette (z.B. "Standorte dieser Firma") liefert eine Liste von IDs, die der nächste Schritt als Filter verwendet (z.B. "Geräte an diesen Standorten"). Eine Alternative wäre ein einziger Datenbankfilter über den gesamten Beziehungspfad gewesen — dafür gibt es aber keine verlässlich getestete Grundlage bei einer dreistufigen Kette (Prüfbericht→Gerät→Standort→Firma), und ein Fehlschlag hier würde direkt die Lösch-Erkennung verfälschen. Die Verkettung ist dieselbe, bereits erprobte Technik wie im `obsi-hofer-admin`-Projekt (dort: Geräte eines Standorts, Prüfberichte eines Geräts).
- **Feste Ausführungsreihenfolge nur im firma-gefilterten Modus:** Ohne `firmaId` bleiben alle Entitäten wie bisher unabhängig voneinander (Reihenfolge spielt keine Rolle). Mit `firmaId` müssen Standorte vor Geräten, Geräte vor Prüfberichten und Relationen vor Kontakten laufen, da jeder Schritt die ID-Liste des vorherigen braucht.
- **Abgleich mit dem bisherigen Stand (Lösch-Erkennung) wird ebenfalls über dieselbe Beziehungskette eingeschränkt**, nicht nur die Dataverse-Abfrage: "Was hatten wir vorher?" wird für Geräte z.B. über "an Standorten dieser Firma" bestimmt, für Prüfberichte über "an Geräten dieser Firma" — beides anhand des *eigenen, bereits gespeicherten* Standort-/Geräte-Bezugs, unabhängig vom aktuellen Dataverse-Abruf. Das verhindert, dass ein zwischenzeitlich umgezogenes Gerät (anderer Standort/andere Firma) fälschlich als "gelöscht" markiert wird, nur weil es in diesem Lauf nicht mehr auftaucht.
- **Artikel bleiben unabhängig von beiden Ketten, immer vollständig** — bereits in der Spec festgelegt, keine neue Entscheidung.
- **Firma-Existenzprüfung über den ersten Kettenschritt:** Liefert die Firma-Abfrage selbst keinen Treffer für die übergebene `firmaId`, wird sofort mit 404 abgebrochen, bevor weitere Schritte versucht werden.

### D) Dependencies
Keine neuen Pakete — reine Erweiterung der bestehenden Sync-Bausteine (`fetchAllDataverseRecords`, `fetchAllIds`, `computeMissingIds`).

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
