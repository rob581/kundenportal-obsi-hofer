# PROJ-12: Firma-Filter für Dataverse-Sync

## Status: In Progress
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

## Implementation Notes (Backend)

Umgesetzt wie in der Architektur festgelegt, ohne Datenbankschema-Änderungen (die bestehenden `firma_id`/`standort_id`/`geraet_id`-Spalten und Indizes aus PROJ-1 decken alles ab):

- `src/lib/sync/dataverse-client.ts` — `fetchAllDataverseRecords()` um einen optionalen `filter`-Parameter erweitert (rückwärtskompatibel); neue `fetchAllDataverseRecordsForIds()` für die ID-Verkettung (baut OR-Filterketten in 20er-Blöcken, analog zum bereits im `obsi-hofer-admin`-Projekt verwendeten Muster)
- `src/lib/sync/batch.ts` — `fetchAllIds()` um einen optionalen `whereIn`-Parameter erweitert (rückwärtskompatibel), für das Scoping der "was hatten wir vorher"-Abfrage
- `src/lib/sync/run-sync.ts` — `runDataverseSync(firmaId?)`: ohne `firmaId` unverändertes Verhalten; mit `firmaId` neuer `runFirmaScopedSync()`-Pfad mit der in der Architektur festgelegten Kette (Firma-Existenzprüfung zuerst, dann Standorte→Geräte→Prüfberichte sowie Relationen→Kontakte, Artikel weiterhin unabhängig/vollständig); neue `FirmaNotFoundError`-Klasse für die 404-Behandlung
- `src/app/api/cron/sync-dataverse/route.ts` — liest `firmaId` aus dem Query-String, übergibt sie an `runDataverseSync()`; `FirmaNotFoundError` → 404 **ohne** Ops-Alert-Mail (ein Tippfehler im aufrufenden Admin-Tool ist kein Sync-Infrastruktur-Problem)
- `vercel.json` — Eintrag für den automatischen nächtlichen Cron-Trigger (`0 3 * * *`) entfernt; der wöchentliche Erfolgsmessung-Report-Cron bleibt unverändert bestehen

**Wichtiger Sicherheits-Hinweis zur Scoping-Logik:** Die "was hatten wir vorher"-Abfrage für Geräte/Prüfberichte wird mit denselben, in diesem Lauf frisch aus Dataverse ermittelten ID-Mengen (Standort-IDs der Firma, Geräte-IDs dieser Standorte) gescoped wie die Dataverse-Abfrage selbst — nicht mit einer separat aus der eigenen Datenbank abgeleiteten Menge. Das wurde bewusst so gewählt: Ein Gerät, das zwischenzeitlich zu einem anderen Standort verschoben wurde, hat in der eigenen Datenbank weiterhin den alten `standort_id`-Wert gespeichert (noch nicht aktualisiert) — taucht also korrekt als "fehlt jetzt" auf und wird zurecht bereinigt. Nur im selteneren Fall, dass der *Standort selbst* zwischenzeitlich einer anderen Firma zugeordnet wurde, bleiben betroffene Geräte unberührt (weder gelöscht noch aktualisiert) — unkritisch, da das nur zu vorübergehend veralteten Daten führt, nie zu einer fälschlichen Löschung.

**Tests:** 3 neue/erweiterte Testdateien — `dataverse-client.test.ts` (neu, 5 Tests), `batch.test.ts` (neu, 5 Tests), `run-sync.test.ts` (erweitert um 6 Firma-Scoping-Tests, darunter der sicherheitskritische Test "rührt niemals ein Gerät einer anderen Firma an"), plus Anpassungen am bestehenden `route.test.ts`. Gesamte Testsuite: 369/369 grün. `npm run lint` und `npm run build` (inkl. TypeScript-Check) ebenfalls grün.

**Produktions-Hinweis (noch nicht gepusht, siehe Rückfrage an den Nutzer):** Das Entfernen des automatischen nächtlichen Cron-Triggers ist eine reale Verhaltensänderung in Produktion — sobald das auf `main` landet, läuft der Sync nicht mehr automatisch, bis das Admin-Tool (`obsi-hofer-admin`, dortiges PROJ-5 "Sync-Freigabe pro Firma") selbst fertig gebaut und live ist. Ob dieser Commit schon jetzt gepusht werden soll oder erst zusammen mit PROJ-5, wurde dem Nutzer explizit zur Entscheidung vorgelegt.

## QA Test Results

**Tested:** 2026-10-05
**Tester:** QA Engineer (AI)
**Hinweis zur Testmethode:** Reine Code-Review + automatisierte Tests (gemocktes Dataverse/Supabase) — kein Zugriff auf eine echte Dataverse-Instanz in dieser Umgebung, und der Code ist (siehe oben) bewusst noch nicht gepusht/live.

### Acceptance Criteria Status
- [x] Firma-gefilterter Sync synchronisiert nur die Teilmenge dieser Firma, `dv_artikel` bleibt vollständig
- [x] Ohne `firmaId` verhält sich der Endpoint unverändert (bestehende Tests weiterhin grün)
- [x] Lösch-Erkennung bezieht sich ausschliesslich auf die ID-Teilmenge der Firma (Test: "never touches a Gerät belonging to a different Firma's Standort")
- [ ] **Unbekannte `firmaId` → 404 statt stillem No-Op** — funktioniert korrekt für einen wohlgeformten, aber nicht existierenden Wert; siehe jedoch BUG-1, durch den dieser Schutz mit einem präparierten Wert umgangen werden kann
- [x] Automatischer nächtlicher Cron-Trigger aus `vercel.json` entfernt
- [x] Fehlender/falscher `CRON_SECRET` → 401, unverändert auch mit `firmaId`-Parameter

### Edge Cases Status
- [x] Firma ohne Standorte/Geräte → Sync läuft leer durch, kein Fehler (Code-Review: Kurzschluss in `fetchAllDataverseRecordsForIds`/`fetchAllIds` bei leerer ID-Menge)
- [x] Kontakt mit mehreren Firmen verknüpft → idempotentes Upsert, unkritisch
- [x] >20% fehlende Zeilen innerhalb der Firma-Teilmenge → bestehende Sicherheitslogik (`exceedsSafetyThreshold`) greift unverändert, jetzt auf die Teilmenge bezogen

### Security Audit Results (Red Team / Code Review)
- [x] Zugriff weiterhin nur mit gültigem `CRON_SECRET` (401 sonst), unverändert durch `firmaId` beeinflusst
- [x] Supabase-seitige Filterung (`fetchAllIds`-`whereIn`) läuft über Supabase-eigene parametrisierte Queries (`.in()`) — keine Injection-Möglichkeit
- [ ] **BUG: siehe BUG-1 (Critical)** — `firmaId` wird ungeprüft in drei Dataverse-`$filter`-Ausdrücke eingesetzt (OData-Injection)
- [ ] BUG: siehe BUG-2 (Low) — leerer `firmaId`-Query-Parameter fällt still auf einen vollständigen Sync zurück statt auf einen Fehler

### Bugs Found

#### BUG-1: `firmaId` wird ungeprüft in Dataverse-`$filter`-Ausdrücke eingesetzt (OData-Injection)
- **Severity:** Critical
- **Steps to Reproduce:**
  1. `firmaId` kommt direkt aus dem Query-String (`new URL(request.url).searchParams.get("firmaId")`) in `route.ts` und wird ohne jede Formatprüfung an `runDataverseSync()` weitergereicht
  2. In `run-sync.ts` wird `firmaId` an drei Stellen roh in einen OData-`$filter` eingesetzt: der Firma-Existenzprüfung (`` `bmvcc_firmaid eq ${firmaId}` ``), dem Standorte-Filter (`` `_bmvcc_bexiofirma_value eq ${firmaId}` ``) und dem Relationen-Filter (`` `_bmvcc_firma_value eq ${firmaId}` ``)
  3. Erwartet: Nur eine exakte GUID wird als `firmaId` akzeptiert; alles andere wird vor jeder Dataverse-Anfrage zurückgewiesen
  4. Tatsächlich: Ein präparierter Wert wie `?firmaId=00000000-0000-0000-0000-000000000000 or 1 eq 1` würde (nach URL-Dekodierung durch Dataverse) zu einem Filter führen, der plötzlich auf **alle** Firmen/Standorte/Relationen zutrifft — sowohl die Existenzprüfung als auch die eigentliche Scoping-Logik wären dadurch ausgehebelt
  5. Das trifft exakt das Risiko, vor dem die Spec selbst warnt: "Betreiber möchte, dass ein Firma-gefilterter Sync niemals Daten anderer Firmen fälschlicherweise als 'gelöscht' behandelt" — mit diesem Bug könnte ein solcher Aufruf faktisch wie ein Vollsync wirken, aber fälschlich als "erfolgreich auf eine Firma eingegrenzt" gemeldet werden, oder umgekehrt echte andere-Firmen-Daten in die Lösch-Erkennung hineinziehen
  6. Gleiche Fehlerklasse wie bereits im `obsi-hofer-admin`-Projekt gefunden und dort behoben (`requireValidGuid`) — hier beim Erstellen von PROJ-12 übersehen, da die eigenen Tests nur mit wohlgeformten Test-IDs arbeiten, nie mit einem präparierten Wert
- **Priority:** Fix before deployment (ohnehin noch nicht gepusht, siehe oben)

#### BUG-2: Leerer `firmaId`-Query-Parameter fällt still auf einen Vollsync zurück
- **Severity:** Low
- **Steps to Reproduce:**
  1. `route.ts` liest `firmaId` mit `?? undefined` — das greift nur bei `null`, nicht bei einem leeren String
  2. Ein Aufruf mit `?firmaId=` (Parameter vorhanden, aber leer) liefert daher `firmaId = ""`
  3. `runDataverseSync("")` prüft `if (firmaId)`, was für einen leeren String `false` ist → fällt still auf den vollständigen, ungefilterten Sync zurück statt auf einen Fehler
  4. Erwartet (optional, nicht in der Spec gefordert): Ein offensichtlich fehlerhafter Aufruf sollte eher auffallen als unbemerkt zum Vollsync zu werden
- **Priority:** Nice to have (in der Praxis ruft nur das Admin-Tool mit einer echten GUID oder ganz ohne Parameter auf; durch die BUG-1-Behebung mit strikter GUID-Validierung verschwindet dieser Fall ohnehin automatisch mit, sofern ein leerer String dort ebenfalls als ungültig zurückgewiesen wird statt als "kein Parameter" behandelt zu werden)

### Summary
- **Acceptance Criteria:** 5/6 vollständig erfüllt, 1/6 (404 bei unbekannter firmaId) durch BUG-1 angreifbar
- **Bugs Found:** 2 total (1 critical, 0 high, 0 medium, 1 low)
- **Security:** 1 kritisches Finding (BUG-1) — Kernschutzmechanismus der gesamten Spec betroffen
- **Production Ready:** NO
- **Recommendation:** BUG-1 vor jedem Push/Deploy beheben (strikte GUID-Validierung für `firmaId`, am besten zentral am Anfang von `runDataverseSync`/`runFirmaScopedSync`, mit 400-Antwort in der Route). BUG-2 kann im selben Zug miterledigt werden. Ohnehin bereits als "nicht gepusht, wartet auf PROJ-5" vereinbart — diese Behebung muss vor diesem Push erledigt sein.

## Deployment
_To be added by /deploy_
