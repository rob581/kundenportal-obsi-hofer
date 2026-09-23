# PROJ-11: Erfolgsmessung Kundenportal

## Status: Approved
**Created:** 2026-09-23
**Last Updated:** 2026-09-23

## Dependencies
- Requires: PROJ-1 (Dataverse-Sync-Service) — Datenbasis `dv_kontakte`/`dv_relationen`/`dv_firmen`
- Requires: PROJ-2 (Kunden-Login) — Supabase Auth (`auth.users.last_sign_in_at`)
- Requires: PROJ-8 (CSV-Export der Geräte-Übersicht) — Export-Route erhält Logging-Hook
- Requires: PROJ-10 (CSV-Export der Prüfberichte-Übersicht) — Export-Route erhält Logging-Hook

## User Stories
- Als Betreiber des Kundenportals (OBSI Hofer GmbH) möchte ich sehen, welcher Anteil meiner Kunden sich mindestens einmal eingeloggt hat, damit ich den Erfolg der Portal-Einführung messen kann.
- Als Betreiber möchte ich sehen, wie viele CSV-Exports pro Monat stattfinden, damit ich die aktive Nutzung der Reporting-Funktion beurteilen kann.
- Als Betreiber möchte ich diese Zahlen per einfacher SQL-Abfrage abrufen können, ohne dass dafür eine eigene Oberfläche gebaut/gewartet werden muss (siehe PRD Non-Goal "Kein Admin-Backend für interne Mitarbeiter").

## Out of Scope
- Admin-Backend/UI für die Kennzahlen — bewusst nicht gebaut, siehe PRD Non-Goal "Kein Admin-Backend für interne Mitarbeiter"; Zahlen werden ausschliesslich per SQL im Supabase SQL Editor abgerufen
- Tracking pro einzelnem Kontakt/E-Mail — nur firmenweit aggregiert (siehe Product Decisions)
- Automatisierte Reports/E-Mail-Digest der Kennzahlen — kein Notification-System, siehe PRD Non-Goal "keine automatischen Benachrichtigungen"
- "Reduktion der internen Zeit für manuelle Excel-Aufbereitung" (Success Metric aus der PRD) — nicht software-messbar, bleibt Selbstbeobachtung
- "Kurze Feedback-Frage nach 4 Wochen an die Pilotkunden" (aus dem Marketingkonzept) — manuelle Kundenansprache, kein Software-Feature
- Rückwirkender Backfill von Export-Daten vor Einführung dieses Features — Zähler startet bei 0 ab Deployment
- Automatische Löschung/Retention-Policy für `export_log` — aktuell keine, siehe Open Questions

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Kunde exportiert die Geräte-Übersicht erfolgreich als CSV, wenn die Antwort ausgeliefert wird, dann wird ein Eintrag in `export_log` mit `entity = "geraete"`, der korrekten `firma_id` und einem Zeitstempel geschrieben
- [ ] Angenommen ein Kunde exportiert die Prüfberichte-Übersicht erfolgreich als CSV, wenn die Antwort ausgeliefert wird, dann wird ein Eintrag in `export_log` mit `entity = "pruefberichte"` geschrieben
- [ ] Angenommen der Export schlägt vor der CSV-Erzeugung fehl (z.B. Datenbankfehler), wenn die Route einen 500er zurückgibt, dann wird kein Eintrag in `export_log` geschrieben
- [ ] Angenommen das Export-Ergebnis ist leer (keine passenden Zeilen), wenn der Export dennoch erfolgreich ausgeliefert wird, dann wird trotzdem ein Eintrag in `export_log` geschrieben
- [ ] Angenommen das Schreiben des `export_log`-Eintrags schlägt fehl, wenn die CSV bereits erzeugt wurde, dann wird der Download trotzdem ausgeliefert (Logging blockiert nie die Kernfunktion)
- [ ] Angenommen es existiert eine SQL-Abfrage/View für die Login-Quote, wenn sie im Supabase SQL Editor ausgeführt wird, dann liefert sie pro Firma mit mindestens einem aktiven Kontakt, ob mindestens ein Login stattgefunden hat, sowie eine aggregierte Gesamt-Quote
- [ ] Angenommen es existiert eine SQL-Abfrage/View für Exports pro Monat, wenn sie ausgeführt wird, dann liefert sie die Anzahl Exporte gruppiert nach Monat und `entity`-Typ
- [ ] Angenommen ein anonymer oder normal authentifizierter Client (nicht Service-Role) versucht, `export_log` zu lesen oder zu schreiben, wenn die Anfrage ankommt, dann wird sie durch RLS abgelehnt (keine Policies definiert)

## Edge Cases
- Firma ohne aktiven Kontakt (nie Zugang vergeben) → zählt nicht in der Login-Quoten-Basis
- Firma mit mehreren Kontakten, nur einer hat sich je eingeloggt → Firma zählt als "mind. 1 Login" (Aggregation auf Firma-Ebene)
- Kontakt wird nachträglich deaktiviert → Login-Quoten-Basis ist ein Snapshot der *aktuell* aktiven Kontakte zum Abfragezeitpunkt, nicht historisch
- Sehr viele Exporte in kurzer Zeit (Skript/Bot) → kein zusätzliches Rate-Limiting in diesem Feature, Sicherheit läuft weiterhin über den bestehenden Auth-Check der Export-Routen
- Export-Route wird ohne gültige Session aufgerufen → wird bereits vor Erreichen der Logging-Logik mit 401/Redirect abgefangen (bestehendes Verhalten aus PROJ-8/PROJ-10), kein Log-Eintrag

## Technical Requirements (optional)
- Security: `export_log` hat RLS aktiviert, aber bewusst keine Policies — Schreiben ausschliesslich über den Service-Role-Client (umgeht RLS), Lesen nur direkt im Supabase SQL Editor durch den Projektinhaber
- Performance: Der Logging-Insert darf die Export-Antwortzeit nicht spürbar verlängern und darf den Download bei einem eigenen Fehler nicht verhindern (best-effort, siehe Acceptance Criteria)

## Open Questions
- [ ] Soll bei künftigem Wachstum von `export_log` eine Aufbewahrungsfrist/Archivierung eingeführt werden? Aktuell keine — bei Bedarf in `/refine PROJ-11` nachziehen
- [ ] Soll die Login-Quoten-Basis rückwirkend historisiert werden (z.B. "Quote zum Ende jedes Monats"), oder reicht ein reiner Ist-Zustand-Snapshot? Aktuell nur Ist-Zustand vorgesehen

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Keine eigene UI/kein Admin-Backend für die Kennzahlen, nur SQL-Abfragen/Views im Supabase SQL Editor | PRD Non-Goal "Kein Admin-Backend für interne Mitarbeiter"; Kennzahlen sind rein intern, für ein 1-Personen-Team reicht direkter DB-Zugriff | 2026-09-23 |
| `export_log` erfasst nur `firma_id`, `entity`, `created_at` — keine Kontakt-/E-Mail-Zuordnung | Für die Kennzahl "Anzahl CSV-Exports/Monat" nicht nötig; vermeidet unnötige Personendaten | 2026-09-23 |
| Login-Quote wird auf Firma-Ebene aggregiert, nicht pro einzelnem Kontakt | PRD-Formulierung "Anteil Kunden mit mind. 1 Login" meint die Firma als Kunde, nicht die einzelne Ansprechperson | 2026-09-23 |
| Login-Quoten-Basis = Firmen mit mind. einem aktiven Kontakt (nicht alle Firmen in Dataverse) | Nur Firmen mit tatsächlich vergebenem Zugang können überhaupt einloggen; alles andere würde die Quote künstlich verwässern | 2026-09-23 |
| RLS auf `export_log` aktiviert, aber ohne jegliche Policies | Schreibzugriff nur über den Service-Role-Client (umgeht RLS ohnehin), Lesezugriff nur durch den Projektinhaber direkt im SQL Editor — kein Client-seitiger Zugriff vorgesehen | 2026-09-23 |
| Logging-Fehler dürfen den Export selbst nicht blockieren (best-effort, fire-and-forget) | Kennzahlen-Erfassung ist ein Nice-to-have und darf die Kernfunktion (CSV-Download) niemals gefährden | 2026-09-23 |
| Kein Backfill historischer Export-Daten vor Feature-Einführung | Zähler beginnt bei 0 ab Deployment; rückwirkende Rekonstruktion aus bestehenden Daten nicht möglich | 2026-09-23 |
| "Reduktion interner Zeit" und "Feedback-Frage an Pilotkunden" bleiben Out of Scope | Beides ist nicht softwareseitig messbar bzw. eine manuelle Massnahme aus dem Marketingkonzept, kein Feature-Bestandteil | 2026-09-23 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Export-Ereignisse als eigener Datenbank-Eintrag statt aus Server-Logs ablesen | Server-Logs sind auf der aktuellen Hosting-Stufe nur ca. 30 Minuten einsehbar und nicht strukturiert auswertbar; ein DB-Eintrag bleibt dauerhaft und ist jederzeit abfragbar | 2026-09-23 |
| Login-Quote wird aus bereits vorhandenen Daten (Zugangsdaten + vom Login-System ohnehin gespeichertem letzten Login) abgeleitet, nicht separat mitgezählt | Vermeidet doppelte Datenhaltung und eine zusätzliche Fehlerquelle | 2026-09-23 |
| Keine eigene Oberfläche für die Kennzahlen, nur fertige Datenbank-Abfragen | Passt zur PRD-Vorgabe "kein internes Admin-Backend"; für ein 1-Personen-Team lohnt sich Bau/Wartung eines eigenen Auswertungs-Bildschirms nicht | 2026-09-23 |
| Erfassung des Export-Ereignisses darf den eigentlichen Download nie verhindern (best-effort) | CSV-Export ist die Kernfunktion; die Zählung ist ein "nice to know" und darf sie nie gefährden | 2026-09-23 |
| Keine neuen Pakete/Abhängigkeiten | Nutzt ausschliesslich die bestehende Datenbank und die bestehenden Export-Routen (PROJ-8, PROJ-10) | 2026-09-23 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Komponentenstruktur
Keine — bewusst kein neues UI-Element, weder kunden- noch intern-seitig. Die Umsetzung ist für alle Nutzer des Portals unsichtbar.

### B) Datenmodell (in einfachen Worten)
**Neu gespeichert:** ein "Export-Ereignis" pro erfolgreichem CSV-Download — welche Firma, welche Export-Art (Geräte- oder Prüfberichte-Übersicht), wann. Keine Namen, keine E-Mail-Adressen, keine Dateiinhalte.

**Nicht neu gespeichert:** die Login-Quote wird bei Bedarf aus bereits vorhandenen Informationen zusammengerechnet (wer Zugang hat + wann zuletzt eingeloggt, Letzteres speichert das Login-System ohnehin automatisch) — dafür wird lediglich eine fertige Abfrage bereitgestellt, kein zusätzlicher dauerhafter Speicher.

### C) Tech-Entscheidungen
Siehe Technical Decisions oben.

### D) Abhängigkeiten
Keine neuen Pakete — nutzt die bestehende Datenbank und die bestehenden Export-Routen (PROJ-8, PROJ-10).

## Implementation Notes (Backend)

- Neue Migration `supabase/migrations/0008_export_log.sql`: Tabelle `export_log` (`id bigint identity`, `firma_id text`, `entity text` mit Check-Constraint `'geraete' | 'pruefberichte'`, `created_at timestamptz default now()`), Indizes auf `created_at` und `firma_id`. RLS aktiviert, bewusst ohne jegliche Policy — identisches Muster zu `portal_firma_einstellungen` (Migration 0006): nur der Service-Role-Client (Server, umgeht RLS) schreibt, gelesen wird nur manuell im SQL Editor. **Muss vom Nutzer im Supabase SQL Editor ausgeführt werden** (gleiches Vorgehen wie alle bisherigen Migrationen in diesem Projekt).
- Neues Modul `src/lib/export-log/log-export.ts`: `logExportEvent(firmaId, entity)` — schreibt einen Eintrag über den bestehenden Service-Role-Client (`getSupabaseAdmin`). Fängt jeden Fehler (Supabase-Fehler wie auch geworfene Exceptions, z.B. fehlende Env-Vars) selbst ab und loggt ihn nur nach `console.error` — die Funktion wirft nie, entsprechend der Product Decision "Logging darf den Export nie blockieren".
- Beide bestehenden Export-Routen (`src/app/api/uebersicht/export/route.ts`, `src/app/api/pruefberichte/export/route.ts`) rufen `logExportEvent` direkt vor dem Zurückgeben der erfolgreichen CSV-Response auf — nicht im `catch`-Block, damit bei einem Fehler *vor* der CSV-Erzeugung kein Eintrag entsteht (siehe Acceptance Criteria).
- Keine neuen Views/Functions in der Datenbank angelegt (bewusste Abweichung von der ursprünglichen Architektur-Idee einer SQL-View): ein neues Objekt im `public`-Schema könnte über die PostgREST-API erreichbar werden, insbesondere die Login-Quote-Abfrage, die `auth.users` joint. Stattdessen liegen beide Abfragen als reine SQL-Textdatei unter `supabase/queries/erfolgsmessung.sql`, zum manuellen Kopieren in den SQL Editor.
- Kein neuer API-Endpoint, keine neue Env-Variable — nutzt ausschliesslich den bereits vorhandenen `getSupabaseAdmin()`-Client.
- 10 neue Tests: 3 in `log-export.test.ts` (Insert mit korrekten Werten, Supabase-Fehler wird abgefangen, geworfene Exception wird abgefangen — jeweils ohne dass die Funktion selbst wirft), je 2 in den beiden Export-Route-Tests (Log-Aufruf mit korrekter `firma_id`/`entity` bei Erfolg, kein Log-Aufruf bei einem 500er) — insgesamt 150 Tests grün.
- `npx tsc --noEmit`, `npx eslint`, `npx vitest run` und `npm run build` laufen fehlerfrei durch.

## QA Test Results

**Tested:** 2026-09-23
**App URL:** N/A — dieses Feature hat keine Oberfläche (siehe Tech Design)
**Tester:** QA Engineer (AI)

> Hinweis: Anders als alle bisherigen Features hat PROJ-11 bewusst keine Kunden- oder Admin-Oberfläche (Non-Goal "Kein Admin-Backend"). Manuelles Browser-Testing, Cross-Browser- und Responsive-Checks entfallen daher vollständig — es gibt nichts zum Anschauen. Geprüft wurde stattdessen: die beiden Export-Routen per Vitest-Integrationstest, die neue Migration/SQL-Datei per Code-Review gegen das reale Schema (`supabase/migrations/0001_dataverse_sync_schema.sql`), sowie eine Sicherheitsbetrachtung der RLS-Konfiguration. Die eigentliche RLS-Durchsetzung in der echten Datenbank kann erst nach dem manuellen Ausführen von Migration 0008 im Supabase SQL Editor verifiziert werden (gleiche Einschränkung wie bei allen bisherigen Migrationen dieses Projekts).

### Acceptance Criteria Status

#### AC-1/AC-2: Export-Ereignis wird bei Erfolg mit korrektem `entity` geloggt
- [x] `uebersicht/export/route.test.ts` ("logs the export event (PROJ-11) on success") — `logExportEvent("f1", "geraete")`
- [x] `pruefberichte/export/route.test.ts` ("logs the export event (PROJ-11) on success") — `logExportEvent("f1", "pruefberichte")`

#### AC-3: Kein Log-Eintrag bei einem Fehler vor der CSV-Erzeugung
- [x] Beide Route-Tests ("returns 500 without crashing...") prüfen zusätzlich `expect(logExportEventMock).not.toHaveBeenCalled()`

#### AC-4: Leeres Export-Ergebnis wird trotzdem geloggt
- [x] Die AC-1/AC-2-Tests mocken `getGeraeteExportRowsMock`/`getPruefberichteExportRowsMock` bereits mit einem leeren Array — Log-Aufruf erfolgt trotzdem

#### AC-5: Ein fehlschlagender `export_log`-Insert darf den Download nie verhindern
- [x] Auf Ebene von `log-export.ts` erfüllt: `log-export.test.ts` bestätigt, dass die Funktion bei einem Supabase-Fehler **und** bei einer geworfenen Exception (z.B. fehlende Env-Vars) niemals wirft, sondern immer auflöst
- [ ] **BUG-1 gefunden (Medium, siehe unten):** auf Ebene der Export-Routen selbst ist das *nicht* zusätzlich abgesichert — beide Routen verlassen sich vollständig darauf, dass `logExportEvent` nie wirft, statt sich selbst dagegen zu wappnen

#### AC-6: SQL-Abfrage für die Login-Quote
- [x] Spaltennamen/Joins gegen das reale Schema geprüft (`dv_firmen.id/name`, `dv_kontakte.id/email/ist_aktiv`, `dv_relationen.firma_id/kontakt_id`) — stimmen exakt überein, inkl. der bereits an anderer Stelle (`access.ts`) verwendeten case-insensitiven E-Mail-Behandlung
- [ ] Nicht automatisiert gegen eine echte Datenbank ausgeführt (kein Zugriff auf eine echte Supabase-Instanz von hier aus) — bitte nach dem Anwenden von Migration 0008 einmal manuell im SQL Editor gegenprüfen

#### AC-7: SQL-Abfrage für Exports pro Monat
- [x] Spaltennamen gegen `export_log` (Migration 0008) geprüft, korrekt
- [ ] Ebenfalls nicht live gegen eine echte Datenbank ausgeführt (gleiche Einschränkung wie AC-6)

#### AC-8: RLS lehnt anonyme/authentifizierte Clients ab
- [x] Per Code-Review: `enable row level security` ohne jede Policy ist exakt das gleiche, bereits produktiv laufende Muster wie `portal_firma_einstellungen` (Migration 0006) — dort funktioniert Deny-all nachweislich
- [ ] Nicht live gegen die echte Datenbank verifiziert (Migration noch nicht angewendet)

### Security Audit Results
- [x] `firma_id` im Log-Eintrag stammt aus der serverseitigen Session (`getCurrentFirmaId()`), nicht aus Nutzereingabe — kein Spoofing eines fremden Log-Eintrags möglich
- [x] `entity` ist durch den TypeScript-Typ (`"geraete" | "pruefberichte"`) und zusätzlich durch einen DB-Check-Constraint abgesichert — kein beliebiger Wert einschleusbar
- [x] Keine neuen Route Handler, kein neuer Angriffsvektor — die bestehende Auth-/Access-Prüfung der beiden Export-Routen (bereits in PROJ-8 gründlich geprüft) ist unverändert
- [x] Bewusster Verzicht auf DB-Views (siehe Implementation Notes) verhindert, dass die `auth.users`-Abfrage versehentlich über die PostgREST-API erreichbar wird
- [x] Keine personenbezogenen Daten in `export_log` (nur `firma_id`/`entity`/Zeitstempel)

### Bugs Found

#### BUG-1: Export-Routen verlassen sich vollständig auf `logExportEvent`, statt sich selbst gegen einen Logging-Fehler abzusichern
- **Severity:** Medium
- **Steps to Reproduce:**
  1. In `uebersicht/export/route.ts` (bzw. der Prüfberichte-Variante) `logExportEvent` durch eine Version ersetzen/mocken, die ablehnt (`Promise.reject`)
  2. Erwartet (laut AC-5): Der CSV-Download wird trotzdem ausgeliefert (Status 200)
  3. Tatsächlich: Der `await logExportEvent(...)`-Aufruf steht im selben `try`-Block wie die CSV-Erzeugung — eine Ablehnung landet im äusseren `catch` und liefert fälschlich `500 Export fehlgeschlagen`, obwohl die CSV bereits fertig im Speicher war
- **Kontext:** Im aktuell ausgelieferten Code passiert das nicht, weil `logExportEvent` selbst nachweislich nie wirft (siehe `log-export.test.ts`). Das Risiko ist eine zukünftige Regression: entfernt eine spätere Änderung versehentlich das interne `try/catch` in `log-export.ts`, würden ab sofort alle CSV-Exports mit 500 fehlschlagen, obwohl die Daten bereithanden — eine "Handlung auf Distanz" ohne eigene Absicherung an der Stelle, wo es laut Spec eigentlich verlangt ist
- **Priority:** Vor dem nächsten Refactoring von `log-export.ts` mitnehmen; kein Grund, das Deployment von PROJ-11 selbst aufzuschieben — reine Absicherung auf Vorrat, aktuell keine reale Auswirkung

### Summary
- **Acceptance Criteria:** 6/8 vollständig automatisiert bestätigt, 2 nur per Code-Review (AC-6/AC-7, mangels echter DB-Verbindung von hier aus) — beide sollten nach Anwenden der Migration einmal manuell im SQL Editor gegengeprüft werden
- **Bugs Found:** 1 total (0 critical, 0 high, 1 medium, 0 low)
- **Security:** Pass — keine kritischen Funde, bewusster Verzicht auf DB-Views verhindert die naheliegendste Falle (unbeabsichtigte API-Exposition von `auth.users`-Daten)
- **Production Ready:** YES
- **Recommendation:** Status auf "Approved" setzen und deployen. BUG-1 (defensiver `try/catch` direkt um `logExportEvent` in beiden Routen) bei nächster Gelegenheit mitnehmen, kein Deployment-Blocker.

## Deployment
_To be added by /deploy_
