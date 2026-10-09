# PROJ-16: Sync pro Standort

## Status: Approved
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
| Standort-Lauf als Variante des bestehenden Firmen-Ablaufs (gleiche Schritte, engerer Bereich), kein zweiter, separater Ablauf | Ein Ablauf, eine Lösch-Logik: der Standort-Lauf erbt automatisch alle bisherigen Absicherungen (GUID-Prüfung, Fehler-Isolation pro Schritt, Zugänge ohne Schwelle, Soft-Delete der Prüfberichte). Zwei getrennte Abläufe würden mit der Zeit auseinanderlaufen | 2026-10-09 |
| Alle Prüfungen (beide GUIDs, Firma existiert, Standort existiert **und** gehört in Dataverse zur Firma) laufen **vor** dem ersten Schreibvorgang | Ein abgelehnter Aufruf darf nichts verändern (Kriterium). Heute wird die Firma direkt nach ihrer Existenzprüfung geschrieben; die Standort-Prüfung kommt deshalb davor | 2026-10-09 |
| Der „Bereich“ jedes Schritts wird im Standort-Lauf auf den einen Standort verengt: Standorte = nur dieser; Zugänge und Geräte = nur die dieses Standorts; Prüfberichte = nur die dieser Geräte | Die Lösch-Erkennung vergleicht immer nur innerhalb des Bereichs; was ausserhalb liegt (andere Standorte), wird weder gelesen noch gelöscht. Das ist dieselbe Technik, mit der PROJ-12 andere Firmen schützt | 2026-10-09 |
| Relationen-Schritt entfällt im Standort-Lauf; Kontakte kommen nur aus den Zugängen dieses Standorts | Product Decision; Relationen hängen an der Firma | 2026-10-09 |
| Mindestmenge 10 als Ergänzung der bestehenden 20-%-Regel an der einen zentralen Stelle, die für alle Schritte und Läufe entscheidet | Wirkt einheitlich für Firmen- und Standort-Läufe; Zugänge bleiben über ihre bestehende Ausnahme ganz ohne Schwelle | 2026-10-09 |
| `scope` wird vom Sync-Ergebnis selbst geliefert (nicht nachträglich im Endpoint ergänzt) | Die Angabe beschreibt, was der Sync tatsächlich gefiltert hat; käme sie nur aus den Anfrageparametern, würde sie auch einen wirkungslosen Filter bestätigen — genau das soll das Admin-Tool erkennen können | 2026-10-09 |
| Fehlerbilder wie bei `firmaId`: ungültige `standortId` → 400, Standort nicht gefunden/andere Firma → 404, jeweils ohne Ops-Mail | Konsistent mit PROJ-12; ein falscher Aufruf aus dem Admin-Tool ist kein Infrastruktur-Problem | 2026-10-09 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Component Structure
Keine Oberfläche. Erweitert wird der bestehende Sync-Endpoint und sein Ablauf:

```
/api/cron/sync-dataverse?firmaId=…[&standortId=…]   (Auth: CRON_SECRET, unverändert)
+-- Prüfungen vor jedem Schreiben
|   +-- firmaId und (falls vorhanden) standortId sind GUIDs      -> sonst 400
|   +-- Firma existiert in Dataverse                             -> sonst 404
|   +-- Standort existiert und gehört in Dataverse zur Firma     -> sonst 404
|
+-- Ablauf (gleiche Schritte wie heute, Bereich je nach Lauf)
    +-- Firma (Stammdaten)                          Firma-Lauf | Standort-Lauf
    +-- Standorte ............................. alle der Firma | nur dieser
    +-- Portalzugänge (ohne Schwelle) ......... ihrer Standorte| nur zu diesem
    +-- Geräte ................................ ihrer Standorte| nur dieses Standorts
    +-- Prüfberichte .......................... dieser Geräte  | dieser Geräte
    +-- Relationen ............................ der Firma      | entfällt
    +-- Kontakte .............. aus Relationen + Zugängen      | nur aus den Zugängen
    +-- Artikel ............................... alle           | alle
|
+-- Antwort: bisherige Zusammenfassung + scope { firmaId, standortId | null }
```

### B) Data Model (plain language)
Keine neuen Tabellen, keine Migration. Unverändert gespeichert werden Firma, Standorte, Geräte, Prüfberichte, Portalzugänge, Kontakte, Artikel; der Standort-Lauf schreibt nur einen kleineren Ausschnitt davon.

**Lösch-Regel (alle Läufe):** Pro Schritt wird verglichen, was vorher im Bereich bekannt war und was Dataverse jetzt liefert. Fehlendes wird gelöscht (Prüfberichte: als gelöscht markiert), ausser es waren **mehr als 10** Einträge bekannt **und** es fehlen **mehr als 20 %** — dann wird das Löschen übersprungen und eine Warnung gemeldet. Zugänge werden immer gelöscht.

### C) Tech Decisions (für PM erklärt)
- **Ein Ablauf statt zwei:** Der Standort-Lauf ist derselbe Ablauf wie der Firmen-Lauf, nur mit kleinerem Ausschnitt. So gelten alle bisherigen Sicherheiten automatisch, und spätere Änderungen wirken auf beide Läufe.
- **Erst prüfen, dann schreiben:** Ein falscher Aufruf verändert nichts, weil alle Prüfungen vor dem ersten Schreiben stattfinden.
- **Andere Standorte sind unsichtbar für den Lauf:** Der Standort-Lauf vergleicht und löscht nur innerhalb dieses Standorts — was zu anderen Standorten gehört, liegt ausserhalb und wird nicht angefasst.
- **Ehrliche Rückmeldung:** Die Angabe, wofür übertragen wurde, kommt aus dem Sync selbst, nicht aus der Anfrage. Wirkt der Filter einmal nicht, merkt es das Admin-Tool.

**Inbetriebnahme:** Keine Migration, keine neuen Umgebungsvariablen. Deploy → kurzer Test eines Standort-Laufs (z. B. per Admin-Tool mit noch ausgeschaltetem Schalter nicht möglich, daher manuell per Aufruf mit `CRON_SECRET`, oder nach Absprache Schalter für einen Test setzen) → Rückmeldung an das Admin-Tool, das dann `KUNDENPORTAL_STANDORT_SYNC_AKTIV=true` setzt.

### D) Dependencies
- Keine neuen Pakete
- Keine Migration

## Implementation Notes (Backend)

Umgesetzt wie im Tech Design. Keine Migration, keine neuen Pakete, keine Oberfläche.

- `src/lib/sync/run-sync.ts`: `runDataverseSync(firmaId, standortId?)`. Neue Fehlerklassen `InvalidStandortIdError` (GUID-Prüfung, auch leerer Wert) und `StandortNotFoundError`. Prüfungsreihenfolge: GUIDs → Firma existiert → Standort existiert **und** gehört in Dataverse zur Firma (ein Filter auf Standort-ID und Firma) — alles vor dem ersten Schreibvorgang. Im Standort-Lauf: Standorte-Schritt mit diesem Filter und Portal-Bereich „nur diese Standort-ID“ (nicht „Standorte der Firma“, damit ein Standort beim Firmenwechsel umgeschrieben wird); Zugänge, Geräte und Prüfberichte folgen automatisch der dann nur noch einen Standort-ID; Relationen-Schritt entfällt; Kontakte nur aus den Zugängen. Ergebnis enthält neu `scope` (`firmaId`, `standortId` bzw. `null`), vom Sync selbst gesetzt
- `src/lib/sync/reconcile.ts`: `DELETE_SAFETY_MIN_ROWS = 10`; die 20-%-Schwelle greift erst bei mehr als 10 vorher bekannten Zeilen. Gilt für alle Schritte und Läufe; Zugänge bleiben über `ignoreDeleteThreshold` ganz ohne Schwelle
- `src/app/api/cron/sync-dataverse/route.ts`: liest optional `standortId` (vorhanden, aber leer → wird weitergegeben und als ungültig abgelehnt); `StandortNotFoundError` → 404, `InvalidStandortIdError` → 400, jeweils ohne Ops-Mail; Antwort enthält `scope` aus dem Sync-Ergebnis

**Tests**
- `run-sync.test.ts` +8 (Standort-Lauf): nur A synchronisiert, verschwundenes Gerät von A gelöscht (dank Mindestmenge), B unberührt; entzogener Zugang zu A weg, Zugang desselben Kontakts zu B bleibt; Kontakte aus Zugängen, Relationen unberührt (kein Abruf); `scope` + `standorte.fetched = 1`, Artikel wie bisher; Firmen-Lauf meldet `standortId: null` und alle Standorte; ungültige/leere `standortId` ohne jeden Dataverse-Abruf abgelehnt; fremder Standort → `StandortNotFoundError`, nichts geschrieben (auch nicht die Firma); Firmenwechsel: Standort-Lauf bei der neuen Firma schreibt den Standort um
- Zwei bestehende Schwellen-Tests auf Mengen über der Mindestmenge angehoben (20 Geräte bzw. 12 Standorte), damit sie weiter die 20-%-Regel prüfen
- `reconcile.test.ts` +2 (Mindestmenge, Grenze 10/11); `route.test.ts` +5 (Weitergabe + `scope`, leere `standortId`, 404/400 ohne Ops-Mail, 401 auch mit `standortId`)
- Gegenproben: ohne verengten Standort-Bereich, ohne Standort-Prüfung und ohne Mindestmenge schlagen jeweils die zugehörigen Tests fehl
- `npm test` 243/243, Lint, `tsc --noEmit` und Build grün

## QA Test Results

**Tested:** 2026-10-09
**Tester:** QA Engineer (AI)
**Testmethode:** Code-Review, Unit- und E2E-Suiten, rein lesende Prüfung des neuen Standort-Filters gegen das echte Dataverse. Kein Sync gegen Produktion vor dem Deploy (ein Sync schreibt in die Produktionsdatenbank); Live-Nachweis beim `/deploy` per direktem Aufruf mit `CRON_SECRET`.

### Dataverse (rein lesend, echte Daten)
- Genau der Filter des Syncs (Standort-ID **und** Firma) wird akzeptiert: richtige Firma → 1 Treffer, falsche Firma → 0, unbekannte Standort-ID → 0; der gemappte Standort trägt die richtige Firma
- Wirkung des engeren Bereichs an einer echten Firma mit 3 Standorten: Standort-Lauf liest 4 Geräte statt 207 für die ganze Firma

### Acceptance Criteria Status
**Aufruf und Prüfungen**
- [x] Gültige `firmaId` + `standortId` → Standort-Lauf: `run-sync.test.ts`, `route.test.ts`
- [x] Ohne `standortId` exakt wie bisher: alle bestehenden Firma-Lauf-Tests unverändert grün; `scope.standortId` = `null`
- [x] Leere oder Nicht-GUID-`standortId` → 400, kein Dataverse-Aufruf: `run-sync.test.ts`, `route.test.ts`
- [x] Standort fehlt oder gehört zu anderer Firma → 404, nichts verändert (auch die Firma nicht): `run-sync.test.ts` + echter Dataverse-Filter (0 Treffer)
- [x] Firma fehlt → 404 (unverändert, bestehende Tests)
- [x] Ohne/mit falschem `CRON_SECRET` → 401, auch mit `standortId`: `route.test.ts`

**Umfang eines Standort-Laufs**
- [x] Firma, Standort A, Geräte von A, Prüfberichte, Zugänge zu A, Kontakte mit Zugang, Artikel: `run-sync.test.ts`
- [x] Standort B bleibt unverändert (auch trotz anderer Daten in Dataverse): `run-sync.test.ts`; Gegenprobe ohne verengten Bereich schlägt fehl
- [x] Gelöschtes Gerät von A → entfernt, B unberührt: `run-sync.test.ts`
- [x] Gelöschter Prüfbericht von A → als gelöscht markiert: gleiche Prüfbericht-Logik wie bisher, Bereich = Geräte von A (Code-Review)
- [x] Entzogener Zugang zu A weg, Zugang zu B bleibt: `run-sync.test.ts`
- [x] Kontakt mit Zugang ohne Relation vorhanden: `run-sync.test.ts`
- [x] Relationen unverändert, kein Abruf: `run-sync.test.ts`

**Rückmeldung**
- [x] `scope` mit `firmaId`/`standortId` (bzw. `null`): `run-sync.test.ts`, `route.test.ts`
- [x] `standorte.fetched = 1`: `run-sync.test.ts`

**Lösch-Schwelle**
- [x] Bis 10 bekannte Einträge wird gelöscht, auch über 20 %: `reconcile.test.ts`, `run-sync.test.ts` (Gegenprobe)
- [x] Ab 11 gilt die 20-%-Regel: `reconcile.test.ts`, angehobene Schwellen-Tests (20 Geräte, 12 Standorte)

**Firmenwechsel**
- [x] Standort-Lauf bei der neuen Firma schreibt den Standort um: `run-sync.test.ts` + echter Filter liefert die neue Firma

### Edge Cases Status
- [x] Standort ohne Geräte/Zugänge: leerer Bereich, vorher bekannte werden entfernt (Mindestmenge)
- [x] Gerät wechselt von A zu B: Lauf A entfernt es aus A, Lauf B fügt es wieder hinzu (Code-Review, gleiche Logik wie bei Firmenwechseln von Geräten)
- [x] Kontakt mit Zugang zu A und B: Zugang zu B bleibt (Test)
- [x] Alter Firmen-Bezug nach Firmenwechsel: Lauf mit alter Firma → 404 (Filter verlangt die Firma)
- [x] Grosse Mengen: 20-%-Regel ab 11 Einträgen unverändert wirksam (Test)
- [x] Zugänge immer ohne Schwelle (bestehende Ausnahme, Tests aus PROJ-15 grün)
- [x] Alte Portal-Version mit `standortId`: Parameter würde ignoriert, `scope` fehlte → vom Admin-Tool erkennbar (deshalb Deploy vor dem Schalter)

**Zusätzlich beobachtet (kein Bug, bewusste Folge der Mindestmenge):** Bei kleinen Mengen gibt es keinen Schutz mehr gegen einen leeren, aber fehlerfreien Dataverse-Abruf. Liefert Dataverse z. B. für eine Firma mit 3 Standorten fälschlich keinen, werden die 3 Standorte und ihre Zugänge im Portal entfernt (Kunden verlieren den Zugang bis zum nächsten Lauf; fail-closed, keine Fremddaten). Fehlgeschlagene Abrufe brechen dagegen weiterhin mit Fehler ab, ohne zu löschen. Entspricht der Product Decision; offene Frage zur Grösse der Mindestmenge bleibt bestehen.

### Security Audit (Red Team)
- [x] `standortId` wird vor jeder Verwendung in einem Dataverse-Filter als GUID geprüft; Injektionsversuch („1 eq 1 or 1 eq 1“) abgelehnt ohne Dataverse-Aufruf
- [x] Fremder Standort kann nicht in eine andere Firma „gezogen“ werden: Filter verlangt Standort **und** Firma in Dataverse
- [x] Auth unverändert (`CRON_SECRET`), auch mit `standortId`
- [x] Abgelehnte Aufrufe ohne Ops-Mail und ohne Schreibvorgang

### Bugs Found

#### BUG-1: Warn-Mail und Log nennen bei einem Standort-Lauf nur die Firma
- **Severity:** Low
- **Steps to Reproduce:** Standort-Lauf auslösen, bei dem ein Schritt scheitert oder die 20-%-Regel greift → Ops-Mail „Dataverse-Sync: Probleme beim Sync für Firma <firmaId>“; Log-Zeile „Firma-Sync (<firmaId>)“
- **Erwartet:** Bei einem Standort-Lauf ist auch der Standort erkennbar (z. B. „… für Firma X, Standort Y“), damit der Betreiber weiss, welcher Lauf betroffen war
- **Priority:** Nice to have

### Automatisierte Tests
- `npm test`: 243/243 grün
- `npm run test:e2e`: 38/38 grün (Portal auf Port 3100; Port 3000 belegt der Dev-Server des Admin-Tools)
- Keine neue E2E-Suite: Endpoint ohne Oberfläche, vollständig über Route- und Sync-Tests abgedeckt

### Summary
- **Acceptance Criteria:** 19/19 erfüllt (Unit-Tests mit Gegenproben, Code-Review, echter Dataverse-Filter)
- **Bugs Found:** 1 (0 critical, 0 high, 0 medium, 1 low)
- **Security:** keine Findings
- **Production Ready:** **JA**, Status Approved

## Deployment
_To be added by /deploy_
