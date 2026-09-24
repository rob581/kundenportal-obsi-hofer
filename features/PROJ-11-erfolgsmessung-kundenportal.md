# PROJ-11: Erfolgsmessung Kundenportal

## Status: Deployed
**Created:** 2026-09-23
**Last Updated:** 2026-09-23 (Refinement: wöchentlicher E-Mail-Report ergänzt)

## Dependencies
- Requires: PROJ-1 (Dataverse-Sync-Service) — Datenbasis `dv_kontakte`/`dv_relationen`/`dv_firmen`
- Requires: PROJ-2 (Kunden-Login) — Supabase Auth (`auth.users.last_sign_in_at`)
- Requires: PROJ-8 (CSV-Export der Geräte-Übersicht) — Export-Route erhält Logging-Hook
- Requires: PROJ-10 (CSV-Export der Prüfberichte-Übersicht) — Export-Route erhält Logging-Hook

## User Stories
- Als Betreiber des Kundenportals (OBSI Hofer GmbH) möchte ich sehen, welcher Anteil meiner Kunden sich mindestens einmal eingeloggt hat, damit ich den Erfolg der Portal-Einführung messen kann.
- Als Betreiber möchte ich sehen, wie viele CSV-Exports pro Monat stattfinden, damit ich die aktive Nutzung der Reporting-Funktion beurteilen kann.
- Als Betreiber möchte ich diese Zahlen per einfacher SQL-Abfrage abrufen können, ohne dass dafür eine eigene Oberfläche gebaut/gewartet werden muss (siehe PRD Non-Goal "Kein Admin-Backend für interne Mitarbeiter").
- Als Betreiber möchte ich diesen Report zusätzlich einmal wöchentlich automatisch per E-Mail an mich selbst zugeschickt bekommen, damit ich nicht aktiv daran denken muss, ihn manuell abzurufen (Nachtrag 2026-09-23).
- Als Betreiber möchte ich im Report sehen, *welche* Kunden sich eingeloggt haben (nicht nur die aggregierte Quote), damit ich gezielt bei den Firmen nachfassen kann, die das Portal noch nicht nutzen (siehe Marketingkonzept Phase 4 "Nachfassen") (Nachtrag 2026-09-23).
- Als Betreiber möchte ich zusätzlich sehen, *wie oft* sich jede Firma eingeloggt hat (nicht nur ja/nein), um die Nutzungsintensität einschätzen zu können (Nachtrag 2026-09-23, zweiter Refinement-Durchgang).

## Out of Scope
- Admin-Backend/UI für die Kennzahlen — bewusst nicht gebaut, siehe PRD Non-Goal "Kein Admin-Backend für interne Mitarbeiter"; Zahlen werden per SQL im Supabase SQL Editor oder im wöchentlichen E-Mail-Report abgerufen, nie über eine eigene Oberfläche
- Tracking pro einzelnem Kontakt/E-Mail — nur firmenweit aggregiert (siehe Product Decisions)
- Rückwirkende Login-Zahlen vor Einführung der Zählung — bewusst kein Backfill, auch nicht über Supabase's internes Audit-Log (`auth.audit_log_entries`), auf ausdrücklichen Nutzerwunsch ("benötige keine vergangenen Daten") nicht weiter untersucht (Nachtrag 2026-09-23)
- ~~Automatisierte Reports/E-Mail-Digest der Kennzahlen~~ — **Nachtrag 2026-09-23: doch umgesetzt**, siehe neue Acceptance Criteria AC-9 bis AC-13 und Decision Log. Das PRD-Non-Goal "keine automatischen Benachrichtigungen" bezieht sich auf Benachrichtigungen *an Kunden* (Beispiel dort: "E-Mail bei neuem Prüfbericht") — eine interne Betreiber-Mail an OBSI Hofer selbst fällt nicht darunter, gleiche Kategorie wie die bereits bestehende PROJ-1-Sync-Erfolgs-Mail
- Automatische Benachrichtigungen an Kunden jeglicher Art — bleibt klar ausgeschlossen (PRD Non-Goal), betrifft aber nicht den in diesem Refinement ergänzten internen Report
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

**Nachtrag 2026-09-23 — wöchentlicher E-Mail-Report:**

- [ ] Angenommen es ist Montag 06:00 Uhr (UTC), wenn der Cron-Job auslöst, dann wird eine E-Mail mit dem Erfolgsmessungs-Report an die konfigurierte Betreiber-Adresse verschickt
- [ ] Angenommen der Report wird erzeugt, wenn er die Login-Auswertung enthält, dann listet er jede Firma mit mindestens einem aktiven Kontakt einzeln mit Namen und Login-Status auf (nicht nur die aggregierte Quote), plus die aggregierte Quote als Zusammenfassung
- [ ] Angenommen der Report wird erzeugt, wenn er die Export-Auswertung enthält, dann zeigt er die Anzahl Exports pro Monat, aufgeschlüsselt nach `entity`-Typ (identisch zur manuellen SQL-Abfrage aus `supabase/queries/erfolgsmessung.sql`)
- [ ] Angenommen der Cron-Endpoint wird ohne oder mit falschem `CRON_SECRET` aufgerufen, wenn die Anfrage ankommt, dann wird sie mit 401 abgelehnt und kein Report erzeugt (identisches Muster zu `/api/cron/sync-dataverse`)
- [ ] Angenommen die Report-Erzeugung schlägt fehl (z.B. DB-Fehler), wenn der Cron-Job das bemerkt, dann wird stattdessen eine Fehler-Mail verschickt (identisches Muster zum bestehenden Sync-Cron), keine unbehandelte Exception
- [ ] Angenommen es existieren aktuell keine Firmen mit aktivem Kontakt, wenn der Report erzeugt wird, dann zeigt er das als "keine Kunden mit Zugang" an, statt mit einem Fehler abzubrechen

**Nachtrag 2026-09-23 (zweiter Refinement-Durchgang) — Login-Zählung pro Firma:**

- [ ] Angenommen ein Kunde meldet sich per E-Mail+Code erfolgreich an, wenn der Code verifiziert wurde und Zugriff besteht, dann wird für jede mit dem Kontakt verknüpfte Firma ein Eintrag in `login_log` geschrieben
- [ ] Angenommen ein Kunde meldet sich per Passkey erfolgreich an, wenn die WebAuthn-Prüfung erfolgreich war, dann wird ebenfalls ein `login_log`-Eintrag für jede verknüpfte Firma geschrieben (über den neuen Endpoint `POST /api/auth/log-login`, da der Passkey-Login keinen eigenen Server Action hat)
- [ ] Angenommen die Anmeldung schlägt fehl (falscher Code, kein Zugriff, abgebrochene Passkey-Zeremonie), wenn das passiert, dann wird kein `login_log`-Eintrag geschrieben
- [ ] Angenommen der `login_log`-Insert schlägt fehl, wenn das während einer Anmeldung passiert, dann wird die Anmeldung/Weiterleitung trotzdem normal abgeschlossen (Logging blockiert nie die Kernfunktion, gleiches Prinzip wie bei `export_log`)
- [ ] Angenommen `POST /api/auth/log-login` wird ohne gültige Session aufgerufen, wenn die Anfrage ankommt, dann wird sie mit 401 abgelehnt, ohne Login-Log-Eintrag
- [ ] Angenommen der wöchentliche Report wird erzeugt, wenn er die Login-Zählung enthält, dann listet er jede Firma mit mindestens einem erfassten Login samt Anzahl auf, absteigend sortiert
- [ ] Angenommen es liegen noch keine erfassten Logins vor (z.B. direkt nach dem Deployment), wenn der Report erzeugt wird, dann zeigt er dafür einen expliziten Leer-Zustand statt eine leere Liste

## Edge Cases
- Firma ohne aktiven Kontakt (nie Zugang vergeben) → zählt nicht in der Login-Quoten-Basis
- Firma mit mehreren Kontakten, nur einer hat sich je eingeloggt → Firma zählt als "mind. 1 Login" (Aggregation auf Firma-Ebene)
- Kontakt wird nachträglich deaktiviert → Login-Quoten-Basis ist ein Snapshot der *aktuell* aktiven Kontakte zum Abfragezeitpunkt, nicht historisch
- Sehr viele Exporte in kurzer Zeit (Skript/Bot) → kein zusätzliches Rate-Limiting in diesem Feature, Sicherheit läuft weiterhin über den bestehenden Auth-Check der Export-Routen
- Export-Route wird ohne gültige Session aufgerufen → wird bereits vor Erreichen der Logging-Logik mit 401/Redirect abgefangen (bestehendes Verhalten aus PROJ-8/PROJ-10), kein Log-Eintrag
- Report-Erzeugung: keine Exports im aktuellen/in einem Monat → zeigt `0` statt die Zeile wegzulassen oder abzustürzen
- Report-Erzeugung: `RESEND_API_KEY`/`ALERT_EMAIL_TO` nicht gesetzt → identisches Fail-open-Verhalten wie beim bestehenden Sync-Cron (nur `console.error`, kein Absturz)
- Mit wachsender Nutzungsdauer wächst die Exports-pro-Monat-Tabelle im Report unbegrenzt (jeden Monat eine neue Zeile) — für die absehbare Zukunft kein Problem, siehe Open Questions
- Ein Kontakt mit mehreren verknüpften Firmen loggt sich ein → zählt als ein Login für *jede* verknüpfte Firma, nicht nur für die später ausgewählte (identische Semantik zur bestehenden Login-Quote)
- `login_log`-Insert schlägt fehl (z.B. Tabelle fehlt, weil Migration 0010 noch nicht ausgeführt wurde) → Anmeldung funktioniert trotzdem normal, nur ohne Zählung (best-effort, wie bei `export_log`)
- Passkey-Anmeldung wird vom Nutzer abgebrochen (WebAuthn-Dialog geschlossen) → `signInWithPasskey()` liefert einen Fehler, `POST /api/auth/log-login` wird gar nicht erst aufgerufen

## Technical Requirements (optional)
- Security: `export_log` hat RLS aktiviert, aber bewusst keine Policies — Schreiben ausschliesslich über den Service-Role-Client (umgeht RLS), Lesen nur direkt im Supabase SQL Editor durch den Projektinhaber
- Performance: Der Logging-Insert darf die Export-Antwortzeit nicht spürbar verlängern und darf den Download bei einem eigenen Fehler nicht verhindern (best-effort, siehe Acceptance Criteria)
- Security (Nachtrag): die neue Datenbank-Funktion für die Login-Auswertung ist per `revoke`/`grant` ausschliesslich für die Service-Role ausführbar, genau wie RLS für Tabellen — kein anonymer/authentifizierter Client kann sie aufrufen, selbst wenn sie über PostgREST als RPC-Endpoint gelistet wird
- Security (Nachtrag): der neue Cron-Endpoint nutzt denselben `CRON_SECRET`-Schutz wie `/api/cron/sync-dataverse`
- Security (Nachtrag 2, Login-Zählung): `POST /api/auth/log-login` ist der **erste schreibende, kundenseitig erreichbare Endpoint** des Projekts (PROJ-8/PROJ-10 sind rein lesend) — schreibt aber ausschliesslich einen Log-Eintrag zur eigenen, serverseitig aufgelösten `firmaIds`-Liste, keine vom Client übergebenen Werte fliessen in die Datenbank ein, daher keine Injection-/Spoofing-Fläche

## Open Questions
- [ ] Soll bei künftigem Wachstum von `export_log` eine Aufbewahrungsfrist/Archivierung eingeführt werden? Aktuell keine — bei Bedarf in `/refine PROJ-11` nachziehen
- [ ] Soll die Login-Quoten-Basis rückwirkend historisiert werden (z.B. "Quote zum Ende jedes Monats"), oder reicht ein reiner Ist-Zustand-Snapshot? Aktuell nur Ist-Zustand vorgesehen
- [ ] Soll die Exports-pro-Monat-Tabelle im wöchentlichen Report irgendwann auf die letzten N Monate begrenzt werden, damit die Mail nicht unbegrenzt wächst? Aktuell keine Begrenzung, bei Bedarf später nachziehen (Nachtrag 2026-09-23)
- [x] **Bug (Nachtrag 2026-09-23, dritter Durchgang):** `erfolgsmessung_login_status()` zeigte für mind. eine Firma (StWZ Energie AG) `hat_login = false`, obwohl `login_log` einen echten Login für diese Firma erfasst hatte → **Root Cause war kein PROJ-11-Bug**, sondern ein externes PROJ-2-Problem: zwei fehlerhafte Supabase-Auth-E-Mail-Vorlagen (fehlender `{{ .Token }}` im "Confirm signup"-Template bzw. `{{ .Token }}` fälschlich im `href` des "Magic Link"-Templates) plus eine auf `localhost` zeigende Site URL verhinderten, dass betroffene Kontakte ihre Anmeldung sauber abschliessen konnten — siehe PROJ-2 Implementation Notes, "Produktions-Incident behoben (2026-09-24)". Nach der Dashboard-Korrektur zeigt der reale Wochenreport (2026-09-24) konsistente Daten: dieselben 4 Firmen erscheinen sowohl in der Login-Quote als auch in "Logins pro Firma". Kein Code-Fix in PROJ-11 nötig, nur Nutzer-Verifikation

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
| Wöchentlicher E-Mail-Report an den Betreiber wird doch umgesetzt (ursprünglich Out of Scope) | PRD Non-Goal "keine automatischen Benachrichtigungen" bezieht sich auf Benachrichtigungen an Kunden, nicht auf eine interne Betreiber-Mail — gleiche Kategorie wie die bereits bestehende PROJ-1-Sync-Erfolgs-Mail | 2026-09-23 |
| Report listet jede Firma einzeln mit Login-Status auf, nicht nur die aggregierte Quote | Nutzer möchte gezielt nachfassen können, welche Kunden das Portal noch nicht nutzen (Marketingkonzept Phase 4) | 2026-09-23 |
| Report wird wöchentlich Montag 06:00 Uhr (UTC) verschickt | Zahlen vom Wochenende sind eingerechnet, bevor der Betreiber in die Woche startet; direkt nach dem nächtlichen 03:00-Uhr-Sync-Cron, ohne mit ihm zu kollidieren | 2026-09-23 |
| "Noch nicht eingeloggt"-Zeile nachträglich wieder aus dem Report entfernt | Nutzerwunsch nach dem ersten echten Test-E-Mail-Versand: nur die "Eingeloggt"-Liste war gewünscht | 2026-09-23 |
| Neue `login_log`-Tabelle für eine echte Login-**Zählung** pro Firma, zusätzlich zur bestehenden Login-Quote (ja/nein) | Supabase speichert in `auth.users` nur den letzten Login-Zeitpunkt, keinen Zähler — für "wie oft hat sich Firma X eingeloggt" reicht das nicht | 2026-09-23 |
| Kein Backfill für `login_log`, auch nicht aus Supabase's `auth.audit_log_entries` | Ausdrücklicher Nutzerwunsch ("benötige keine vergangenen Daten") — spart die Untersuchung eines internen, nicht offiziell dokumentierten Supabase-Systems | 2026-09-23 |
| Login-Zählung hakt sich in beide bestehenden Login-Wege ein: `verifyLoginCode` (Server Action, E-Mail+Code) direkt serverseitig, Passkey-Login über einen neuen Endpoint `POST /api/auth/log-login` (da dieser Weg komplett clientseitig läuft und keinen eigenen Server Action hat) | Beide Anmeldewege müssen gleichermassen gezählt werden, sonst wäre die Zahl systematisch unvollständig | 2026-09-23 |
| Login zählt für **jede** mit dem Kontakt verknüpfte Firma, nicht nur für die später ausgewählte | Konsistent mit der bestehenden Login-Quote-Semantik, die ebenfalls firmenweit unabhängig von der Firmenauswahl auswertet | 2026-09-23 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Export-Ereignisse als eigener Datenbank-Eintrag statt aus Server-Logs ablesen | Server-Logs sind auf der aktuellen Hosting-Stufe nur ca. 30 Minuten einsehbar und nicht strukturiert auswertbar; ein DB-Eintrag bleibt dauerhaft und ist jederzeit abfragbar | 2026-09-23 |
| Login-Quote wird aus bereits vorhandenen Daten (Zugangsdaten + vom Login-System ohnehin gespeichertem letzten Login) abgeleitet, nicht separat mitgezählt | Vermeidet doppelte Datenhaltung und eine zusätzliche Fehlerquelle | 2026-09-23 |
| Keine eigene Oberfläche für die Kennzahlen, nur fertige Datenbank-Abfragen | Passt zur PRD-Vorgabe "kein internes Admin-Backend"; für ein 1-Personen-Team lohnt sich Bau/Wartung eines eigenen Auswertungs-Bildschirms nicht | 2026-09-23 |
| Erfassung des Export-Ereignisses darf den eigentlichen Download nie verhindern (best-effort) | CSV-Export ist die Kernfunktion; die Zählung ist ein "nice to know" und darf sie nie gefährden | 2026-09-23 |
| Keine neuen Pakete/Abhängigkeiten | Nutzt ausschliesslich die bestehende Datenbank und die bestehenden Export-Routen (PROJ-8, PROJ-10) | 2026-09-23 |
| Login-Auswertung als Datenbank-Funktion (`security definer`, Execute-Recht nur für `service_role`) statt View | Der App-seitige Supabase-Client spricht nur mit PostgREST, das `auth.users` nicht direkt erreicht — eine Funktion kann serverseitig trotzdem darauf zugreifen und liefert nur die berechneten Zeilen zurück (Firma + Login-Status), keine rohen `auth.users`-Daten. Execute-Rechte für `anon`/`authenticated` werden entzogen, exakt das gleiche Durchsetzungsprinzip wie RLS bei Tabellen | 2026-09-23 |
| Exports-pro-Monat weiterhin ohne eigene Datenbank-Funktion, Gruppierung im Anwendungscode | `export_log` ist über den bestehenden Service-Role-Client direkt lesbar (kein `auth`-Zugriff nötig); ein zweites DB-Objekt wäre unnötige zusätzliche Angriffsfläche für eine triviale Gruppierung | 2026-09-23 |
| `sendSyncAlertEmail` wird zu einer generischen `sendOpsEmail` verallgemeinert (reine Umbenennung/Verschiebung, kein Verhaltensunterschied) | Wird jetzt von zwei Cron-Jobs genutzt (Sync + wöchentlicher Report), der sync-spezifische Name wäre irreführend geworden | 2026-09-23 |
| Neuer Cron-Eintrag in `vercel.json` (`0 6 * * 1`), eigener Endpoint `/api/cron/erfolgsmessung-report`, gleicher `CRON_SECRET`-Schutz wie der bestehende Sync-Cron | Konsistent mit dem einzigen bereits etablierten Cron-Muster im Projekt, kein neues Sicherheitskonzept nötig | 2026-09-23 |

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

### Nachtrag 2026-09-23: Wöchentlicher E-Mail-Report

**Komponentenstruktur:** weiterhin keine UI. Neu ist ein zeitgesteuerter Hintergrund-Job (Cron), der einmal wöchentlich läuft und eine E-Mail verschickt — genau wie der bereits bestehende nächtliche Sync-Job.

**Datenmodell:** keine neue dauerhafte Speicherung. Der Report liest bei jedem Lauf frisch aus den bereits vorhandenen Daten (Zugangsdaten + Login-Zeitpunkte + `export_log`) und verschickt das Ergebnis direkt als E-Mail-Text, ohne es selbst zu speichern.

**Tech-Entscheidung (Begründung):** Ein Teil der Berechnung (wer hat sich eingeloggt) braucht Zugriff auf Informationen, die normalerweise nur im Supabase SQL Editor erreichbar sind, nicht über den normalen Programm-Zugriffsweg. Dafür wird eine kleine, eng zugeschnittene Datenbank-Funktion angelegt, die ausschliesslich vom Server aus aufgerufen werden kann — für niemand sonst erreichbar, exakt nach demselben Sicherheitsprinzip wie der bestehende Datenzugriffsschutz im Projekt.

Siehe Decision Log für die vollständige Begründung je Einzelentscheidung.

## Implementation Notes (Backend)

- Neue Migration `supabase/migrations/0008_export_log.sql`: Tabelle `export_log` (`id bigint identity`, `firma_id text`, `entity text` mit Check-Constraint `'geraete' | 'pruefberichte'`, `created_at timestamptz default now()`), Indizes auf `created_at` und `firma_id`. RLS aktiviert, bewusst ohne jegliche Policy — identisches Muster zu `portal_firma_einstellungen` (Migration 0006): nur der Service-Role-Client (Server, umgeht RLS) schreibt, gelesen wird nur manuell im SQL Editor. **Muss vom Nutzer im Supabase SQL Editor ausgeführt werden** (gleiches Vorgehen wie alle bisherigen Migrationen in diesem Projekt).
- Neues Modul `src/lib/export-log/log-export.ts`: `logExportEvent(firmaId, entity)` — schreibt einen Eintrag über den bestehenden Service-Role-Client (`getSupabaseAdmin`). Fängt jeden Fehler (Supabase-Fehler wie auch geworfene Exceptions, z.B. fehlende Env-Vars) selbst ab und loggt ihn nur nach `console.error` — die Funktion wirft nie, entsprechend der Product Decision "Logging darf den Export nie blockieren".
- Beide bestehenden Export-Routen (`src/app/api/uebersicht/export/route.ts`, `src/app/api/pruefberichte/export/route.ts`) rufen `logExportEvent` direkt vor dem Zurückgeben der erfolgreichen CSV-Response auf — nicht im `catch`-Block, damit bei einem Fehler *vor* der CSV-Erzeugung kein Eintrag entsteht (siehe Acceptance Criteria).
- Keine neuen Views/Functions in der Datenbank angelegt (bewusste Abweichung von der ursprünglichen Architektur-Idee einer SQL-View): ein neues Objekt im `public`-Schema könnte über die PostgREST-API erreichbar werden, insbesondere die Login-Quote-Abfrage, die `auth.users` joint. Stattdessen liegen beide Abfragen als reine SQL-Textdatei unter `supabase/queries/erfolgsmessung.sql`, zum manuellen Kopieren in den SQL Editor.
- Kein neuer API-Endpoint, keine neue Env-Variable — nutzt ausschliesslich den bereits vorhandenen `getSupabaseAdmin()`-Client.
- 10 neue Tests: 3 in `log-export.test.ts` (Insert mit korrekten Werten, Supabase-Fehler wird abgefangen, geworfene Exception wird abgefangen — jeweils ohne dass die Funktion selbst wirft), je 2 in den beiden Export-Route-Tests (Log-Aufruf mit korrekter `firma_id`/`entity` bei Erfolg, kein Log-Aufruf bei einem 500er) — insgesamt 150 Tests grün.
- `npx tsc --noEmit`, `npx eslint`, `npx vitest run` und `npm run build` laufen fehlerfrei durch.

**Nachtrag 2026-09-23 — wöchentlicher E-Mail-Report:**

- Neue Migration `supabase/migrations/0009_erfolgsmessung_login_status.sql`: Funktion `erfolgsmessung_login_status()` (`security definer`, `set search_path = public, auth`), liefert pro Firma mit mind. einem aktiven Kontakt Name + Login-Status. Execute-Recht per `revoke`/`grant` ausschliesslich für `service_role` — identisches Durchsetzungsprinzip wie RLS bei Tabellen (siehe `export_log`). **Muss ebenfalls vom Nutzer im Supabase SQL Editor ausgeführt werden.**
- `sendSyncAlertEmail` (bisher `src/lib/sync/notify.ts`, PROJ-1) verallgemeinert zu `sendOpsEmail` in `src/lib/notify/send-email.ts` — reine Umbenennung/Verschiebung (identisches Verhalten), da jetzt von zwei Cron-Jobs genutzt. `sync-dataverse/route.ts` und dessen Test entsprechend angepasst, alte Datei gelöscht (keine Re-Export-Kompatibilitätsschicht, da nur zwei interne Aufrufstellen).
- Neues Modul `src/lib/erfolgsmessung/report.ts`: `getLoginStatus()` ruft die neue DB-Funktion per `.rpc(...)` auf und mappt auf camelCase; `getExportsProMonat()` liest `export_log` roh über den bestehenden Service-Role-Client und gruppiert nach Monat/`entity` in JS (kein zweites DB-Objekt für eine triviale Gruppierung); `buildErfolgsmessungReport()` formatiert beides zu einem Plain-Text-E-Mail-Body (Firmen einzeln mit Login-Status aufgelistet, nicht nur die Quote — Nutzerwunsch).
- Neuer Route Handler `src/app/api/cron/erfolgsmessung-report/route.ts` (`GET`): identisches Auth-/Fehler-Muster wie `/api/cron/sync-dataverse` (inkl. der dortigen QA-BUG-1-Fix-Lektion: Auth-Check im selben `try/catch`), erzeugt den Report und verschickt ihn per `sendOpsEmail`; bei jedem Fehler geht stattdessen eine Fehler-Mail raus, kein unbehandelter Absturz.
- Neuer Cron-Eintrag in `vercel.json`: `0 6 * * 1` (montags 06:00 UTC), direkt nach dem bestehenden nächtlichen Sync-Cron.
- Keine neue Env-Variable — nutzt ausschliesslich `CRON_SECRET`, `RESEND_API_KEY`, `ALERT_EMAIL_TO` (alle bereits für PROJ-1 dokumentiert).
- 12 neue Tests: 7 in `report.test.ts` (Mapping, Gruppierung inkl. leerem Ergebnis, Fehlerfälle, formatierter Report inkl. Leer-Zustand), 4 in `erfolgsmessung-report/route.test.ts` (401 ohne/mit falschem Secret, Erfolg, Fehler inkl. fehlendes `CRON_SECRET`) sowie die angepassten `sync-dataverse/route.test.ts`-Mocks — insgesamt 162 Tests grün.
- `npx tsc --noEmit`, `npx eslint`, `npx vitest run` und `npm run build` laufen fehlerfrei durch.

**Nachtrag 2026-09-23 (zweiter Refinement-Durchgang) — Login-Zählung pro Firma:**

- Neue Migration `supabase/migrations/0010_login_log.sql`: Tabelle `login_log` (`id bigint identity`, `firma_id text`, `created_at timestamptz default now()`), Indizes auf `created_at`/`firma_id`, RLS aktiviert ohne Policies — identisches Muster zu `export_log`. **Muss ebenfalls vom Nutzer im Supabase SQL Editor ausgeführt werden.**
- Neues Modul `src/lib/login-log/log-login.ts`: `logLoginEvent(firmaIds: string[])` — schreibt einen Eintrag pro Firma-ID in einem einzigen Batch-Insert, identisches best-effort-Verhalten wie `logExportEvent` (fängt jeden Fehler ab, wirft nie). No-op bei leerer `firmaIds`-Liste.
- **E-Mail+Code-Login** (`src/app/login/actions.ts`, `verifyLoginCode`): ruft `logLoginEvent(access.firmaIds)` nach erfolgreicher Zugriffsprüfung auf, vor dem Redirect.
- **Passkey-Login** (`src/components/login-form.tsx`, `handlePasskeyLogin`): läuft komplett clientseitig über `supabase.auth.signInWithPasskey()`, hat keinen eigenen Server Action — deshalb neuer Route Handler `POST /api/auth/log-login` (`src/app/api/auth/log-login/route.ts`), der Session/Zugriff selbst prüft (identisches Muster zu den Export-Routen, liegt ausserhalb von `(protected)/layout.tsx`) und dann `logLoginEvent` aufruft. Der Client ruft ihn per `fetch(..., { method: "POST" })` nach erfolgreichem `signInWithPasskey()` auf, Fehler werden bewusst ignoriert (best-effort, blockiert nie die Weiterleitung). **Dies ist der erste schreibende, kundenseitig erreichbare Endpoint des Projekts** — schreibt aber ausschliesslich serverseitig aufgelöste `firmaIds`, keine Client-Eingabe fliesst in die Datenbank ein.
- `src/lib/erfolgsmessung/report.ts` um `getLoginsProFirma()` erweitert: liest `login_log` roh, zählt in JS pro `firma_id`, löst Namen über die bereits bestehende `getFirmenNamen()` aus `src/lib/auth/access.ts` auf (keine Duplikation). `buildErfolgsmessungReport()` um einen neuen Abschnitt "=== Logins pro Firma ===" ergänzt (absteigend nach Anzahl sortiert), inkl. explizitem Leer-Zustand.
- Kein Playwright-Test für den Passkey-Teil möglich (gleiche Einschränkung wie PROJ-6: eine echte WebAuthn-Zeremonie lässt sich in Playwright ohne virtuellen Authenticator nicht automatisieren) — die eigentliche `fetch`-Aufruf-Logik ist stattdessen über den Route-Handler-Test abgedeckt, der volle End-to-End-Pfad muss manuell mit einem echten Gerät verifiziert werden.
- Kein neuer API-Endpoint für Zod-Validierung nötig — `POST /api/auth/log-login` nimmt keinen Body entgegen, alle Werte kommen aus der Session.
- 11 neue/geänderte Tests: 4 in `log-login.test.ts` (Batch-Insert, No-op bei leerem Array, Supabase-Fehler abgefangen, Exception abgefangen), 3 in `log-login/route.test.ts` (401, 403, Erfolg mit korrekten `firmaIds`), 2 zusätzliche Assertions in `actions.test.ts` (Log-Aufruf bei Erfolg, kein Aufruf bei Fehler/kein Zugriff), 5 neue/angepasste in `report.test.ts` (`getLoginsProFirma` inkl. Namensauflösung, leerem Ergebnis, fehlendem Namen, Fehlerfall; Report-Text-Erweiterung) — insgesamt 173 Tests grün.
- `npx tsc --noEmit`, `npx eslint`, `npx vitest run` und `npm run build` laufen fehlerfrei durch.

**Nachtrag 2026-09-23 (dritter Refinement-Durchgang) — CSV-Exports pro Firma + offener Login-Quote-Bug:**

- Nutzerfeedback nach dem ersten echten Wochenreport: (1) Login-Quote und "Eingeloggt"-Liste sind für mind. eine Firma (StWZ Energie AG) nachweislich falsch — `login_log` hatte einen Login erfasst, `erfolgsmessung_login_status()` (auth.users-Join) zeigte `hat_login = false`. **Root Cause noch nicht gefunden** (Diagnose-Abfragen beim Nutzer angefordert, siehe Open Questions) — im Gegensatz zum ersten 0/274-Vorfall ist eine reine Testreihenfolge diesmal ausgeschlossen, da beide Abfragen innerhalb desselben `Promise.all(...)`-Laufs praktisch gleichzeitig ausgeführt werden. (2) Nutzerwunsch: CSV-Exports zusätzlich pro Firma anzeigen, nicht nur pro Monat.
- `src/lib/erfolgsmessung/report.ts` refaktoriert: gemeinsame `countByFirma()`-Hilfsfunktion extrahiert (vorher in `getLoginsProFirma` dupliziert), `LoginCountRow` zu generischem `FirmaCountRow` umbenannt, da jetzt auch für Exports genutzt. Neue `fetchExportLogRows()` liest `export_log` einmal mit `firma_id, entity, created_at` — sowohl `getExportsProMonat()` als auch die neue `getExportsProFirma()` werten dieselben Rohdaten aus (kein zusätzlicher DB-Roundtrip für die neue Sicht). Report um neuen Abschnitt "=== CSV-Exports pro Firma ===" ergänzt (gleiches Format/Sortierung wie "Logins pro Firma").
- 6 neue/angepasste Tests in `report.test.ts` (`getExportsProFirma` inkl. leerem Ergebnis, `buildErfolgsmessungReport`-Erweiterung) — insgesamt 175 Tests grün.
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

---

## QA Test Results — Nachtrag: Wöchentlicher E-Mail-Report (2026-09-23)

**Tested:** 2026-09-23
**App URL:** N/A — kein UI, siehe Tech Design
**Tester:** QA Engineer (AI)

> Migration 0009 wurde laut Nutzer bereits im Supabase SQL Editor ausgeführt. Ein echter Cron-Lauf gegen die Produktions-/Entwicklungsdatenbank wurde von hier aus trotzdem nicht ausgelöst — das würde reale Kundendaten (`auth.users`) verarbeiten und eine echte E-Mail verschicken. Verifiziert wurde stattdessen per Vitest (mit gemockter DB/E-Mail) und Code-Review der SQL-Funktion gegen das reale Schema. **Empfehlung:** einmal manuell `curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/erfolgsmessung-report` gegen die echte Umgebung aufrufen und die tatsächlich ankommende E-Mail gegenprüfen, bevor der erste automatische Montags-Lauf ansteht.

### Acceptance Criteria Status

#### Wöchentliche Mail wird verschickt
- [x] `erfolgsmessung-report/route.test.ts` ("sends the report by email and returns 200 on success")
- [x] Cron-Zeitpunkt (`vercel.json`: `"0 6 * * 1"`) per Code-Review geprüft — entspricht Montag 06:00 UTC

#### Report listet Firmen einzeln mit Login-Status, plus aggregierte Quote
- [x] `report.test.ts` ("lists Firmen by login status and the exports breakdown") — prüft sowohl die Quote (`1/2 Firmen (50%)`) als auch die Einzelaufstellung ("Eingeloggt: Firma A" / "Noch nicht eingeloggt: Firma B")

#### Report zeigt Exports pro Monat nach `entity`
- [x] `report.test.ts` ("groups export_log rows by month and entity") — korrekte Gruppierung, korrekte Sortierung (neuester Monat zuerst)

#### Cron-Endpoint durch `CRON_SECRET` geschützt
- [x] `erfolgsmessung-report/route.test.ts` (401 ohne Secret, 401 mit falschem Secret) — identisches Muster zu `/api/cron/sync-dataverse`

#### Fehler bei der Report-Erzeugung löst Fehler-Mail statt Absturz aus
- [x] `erfolgsmessung-report/route.test.ts` ("sends an alert email and returns 500...") sowie der Fall eines fehlenden `CRON_SECRET` (identische Lektion wie die dortige QA-BUG-1-Fix aus PROJ-1)

#### Keine Kunden mit Zugang → sauberer Leer-Zustand statt Fehler
- [x] `report.test.ts` ("shows an explicit empty state instead of an empty list when there are no Kunden")

#### Datenbank-Funktion ist gegen den echten Zugriffsweg abgesichert
- [x] Code-Review: `revoke all ... from public, anon, authenticated` + `grant execute ... to service_role` — gleiches Durchsetzungsprinzip wie RLS, unabhängig davon, ob PostgREST die Funktion als RPC-Endpoint auflistet
- [x] `set search_path = public, auth` gesetzt — verhindert die bekannte Search-Path-Injection-Schwachstelle bei `security definer`-Funktionen
- [ ] Nicht live gegen die echte Datenbank verifiziert (siehe Hinweis oben) — bitte einmal echt aufrufen und prüfen, dass ein normaler (nicht Service-Role-)Aufruf tatsächlich abgelehnt wird

### Security Audit Results
- [x] `security definer` korrekt mit explizitem `search_path` kombiniert (sonst reale Rechteausweitungs-Schwachstelle)
- [x] Execute-Recht ausschliesslich für `service_role`, entzogen für `public`/`anon`/`authenticated`
- [x] Funktion gibt nur aggregierte/berechnete Werte zurück (Firma-Name + Bool), keine rohen `auth.users`-Zeilen (keine E-Mail-Adressen, keine sonstigen Kontodaten) — selbst bei einem hypothetischen Fehlkonfigurations-Fall wäre der Datenverlust minimal
- [x] `sendOpsEmail`-Umbenennung ist verhaltensneutral (per Regressionstests von `sync-dataverse` bestätigt) — kein neues Risiko durch die Umbenennung selbst
- [ ] **BUG-2 gefunden (Low, siehe unten):** `getExportsProMonat()` liest `export_log` ohne `.limit()`

### Bugs Found

#### BUG-2: `getExportsProMonat()` liest die komplette `export_log`-Tabelle ohne Begrenzung
- **Severity:** Low
- **Steps to Reproduce:**
  1. `src/lib/erfolgsmessung/report.ts` ansehen: `getSupabaseAdmin().from("export_log").select("entity, created_at")` hat kein `.limit(...)`
  2. Verstösst gegen die Backend-Regel "Use `.limit()` on all list queries" (`.claude/rules/backend.md`)
- **Kontext:** Aktuell unkritisch — `export_log` ist neu und wächst langsam (ein Eintrag pro CSV-Export). Bereits als Open Question in der Spec vermerkt ("Soll die Exports-pro-Monat-Tabelle auf die letzten N Monate begrenzt werden?"), aber noch nicht umgesetzt
- **Priority:** Nice to have — vor spürbarem Wachstum der Tabelle nachziehen (z.B. nur die letzten 24 Monate laden), kein Grund für einen Deployment-Aufschub

### Summary
- **Acceptance Criteria:** 6/7 vollständig automatisiert bestätigt, 1 (Absicherung der DB-Funktion) nur per Code-Review — bitte einmal live gegenprüfen (siehe Hinweis oben)
- **Bugs Found:** 1 total (0 critical, 0 high, 0 medium, 1 low) — zusätzlich weiterhin BUG-1 aus dem vorherigen QA-Durchgang offen (Medium, unverändert, nicht durch diesen Nachtrag verursacht)
- **Security:** Pass — `security definer` korrekt mit `search_path` abgesichert, Execute-Rechte korrekt eingeschränkt, keine rohen `auth.users`-Daten im Ergebnis
- **Production Ready:** YES
- **Recommendation:** Status auf "Approved" setzen und deployen. Nach dem Deploy einmal manuell den Cron-Endpoint aufrufen und die echte E-Mail gegenprüfen, bevor der erste automatische Montags-Lauf ansteht. BUG-2 (`.limit()` ergänzen) und das weiterhin offene BUG-1 bei Gelegenheit mitnehmen.

---

## QA Test Results — Nachtrag: Login-Zählung pro Firma (2026-09-23)

**Tested:** 2026-09-23
**App URL:** http://localhost:3000 (E2E-Regression) / N/A für die Zähl-Logik selbst (kein UI)
**Tester:** QA Engineer (AI)

> Der Passkey-Teil (echte WebAuthn-Zeremonie) lässt sich wie bei PROJ-6 nicht automatisiert testen — gleiche Einschränkung, siehe `tests/PROJ-6-passkey-login.spec.ts`. Automatisiert geprüft: die neue Zähl-Logik selbst (Vitest), beide Login-Wege bis zum Aufruf von `logLoginEvent` (Vitest, gemockt), sowie eine volle Regression der bestehenden Playwright-Suite (alle 38 E2E-Tests, inkl. PROJ-2/PROJ-6 Login-Flows) — keine Beeinträchtigung durch die Änderungen an `verifyLoginCode`/`login-form.tsx`.

### Acceptance Criteria Status

#### E-Mail+Code-Login schreibt einen `login_log`-Eintrag pro verknüpfter Firma
- [x] `actions.test.ts` ("redirects to /dashboard when the code is valid and the contact has access") — `logLoginEvent` mit `["f1"]` aufgerufen

#### Passkey-Login schreibt ebenfalls einen Eintrag (über den neuen Endpoint)
- [x] `log-login/route.test.ts` ("logs the login event for all of the contact's Firmen on success")
- [ ] Client-seitiger Aufruf aus `login-form.tsx` selbst nicht automatisiert testbar (siehe Hinweis oben) — beim nächsten echten Passkey-Login-Test durch den Nutzer bitte den neuen `login_log`-Eintrag im SQL Editor gegenprüfen

#### Fehlgeschlagene Anmeldung schreibt keinen Eintrag
- [x] `actions.test.ts` ("returns an error for an invalid code..." und "redirects to /kein-zugang...") — `logLoginEventMock` jeweils nicht aufgerufen
- [x] `log-login/route.test.ts` (401 ohne Session, 403 ohne Zugriff) — `logLoginEventMock` jeweils nicht aufgerufen

#### Ein fehlschlagender `login_log`-Insert blockiert die Anmeldung nicht
- [x] `log-login.test.ts` bestätigt, dass `logLoginEvent` bei einem Supabase-Fehler **und** bei einer geworfenen Exception niemals wirft — identisches, bereits bewährtes Muster wie `logExportEvent`

#### `POST /api/auth/log-login` ohne gültige Session wird abgelehnt
- [x] `log-login/route.test.ts` (401)

#### Wöchentlicher Report enthält die neue Login-Zählung, inkl. Leer-Zustand
- [x] `report.test.ts` ("lists Firmen by login status, login counts, and the exports breakdown" und "shows an explicit empty state...")

### Security Audit Results
- [x] `POST /api/auth/log-login` liest keinerlei Client-Eingabe (kein Request-Body, keine Query-Parameter) — `firmaIds` stammen ausschliesslich aus der serverseitig aufgelösten Session; kein Spoofing eines fremden Firma-Eintrags möglich
- [x] Auth-Check (401/403) identisch zum bereits geprüften Muster der Export-Routen (PROJ-8)
- [x] `login_log` hat RLS aktiviert, keine Policies — identisches Muster zu `export_log`, nur Service-Role schreibt
- [x] Regressionstest bestätigt: bestehende Login-Sicherheit (Redirects ohne Session, WebAuthn-Erkennung) unverändert
- [ ] **BUG-3 gefunden (Low, siehe unten):** `POST /api/auth/log-login` prüft nur eine gültige Session, nicht dass gerade wirklich ein Passkey-Login stattgefunden hat

### Bugs Found

#### BUG-3: `POST /api/auth/log-login` kann von jeder eingeloggten Session beliebig oft aufgerufen werden
- **Severity:** Low
- **Steps to Reproduce:**
  1. Als eingeloggter Kunde (egal ob per E-Mail+Code oder Passkey) den Endpoint direkt per `fetch`/`curl` mit der eigenen Session mehrfach aufrufen
  2. Erwartet: Nur ein echter, gerade stattgefundener Login-Vorgang sollte gezählt werden
  3. Tatsächlich: Der Endpoint prüft nur "ist die Session gültig", nicht "ist gerade wirklich eine Passkey-Anmeldung abgeschlossen worden" — ein Kunde könnte die eigene Firma künstlich "aktiver" aussehen lassen
- **Kontext:** Rein interne Vanity-Kennzahl ohne Zugriffs-/Sicherheitsrelevanz (kein Einfluss auf Berechtigungen, keine anderen Kunden betroffen) — exakt dasselbe bereits akzeptierte Risiko wie bei `export_log` (siehe dortige Edge Cases: "Sehr viele Exporte in kurzer Zeit (Skript/Bot) → kein zusätzliches Rate-Limiting")
- **Priority:** Nice to have — falls die Zahl später wichtiger wird (z.B. für Abrechnung), Rate-Limiting/Dedup nachziehen; aktuell kein Deployment-Blocker

### Summary
- **Acceptance Criteria:** 6/7 vollständig automatisiert bestätigt, 1 (Passkey-Client-Aufruf) nur manuell verifizierbar (wie bei PROJ-6)
- **Bugs Found:** 1 total (0 critical, 0 high, 0 medium, 1 low) — zusätzlich weiterhin BUG-1 (Medium) und BUG-2 (Low) aus vorherigen QA-Durchgängen offen, beide unverändert und nicht durch diesen Nachtrag verursacht
- **Security:** Pass — kein Spoofing möglich, einzige Einschränkung ist die bewusst akzeptierte fehlende Rate-Begrenzung (BUG-3, gleiche Kategorie wie bereits akzeptiert bei `export_log`)
- **Regression:** Pass — volle Vitest-Suite (173 Tests) und volle Playwright-Suite (38 Tests, alle Browser) grün
- **Production Ready:** YES
- **Recommendation:** Status auf "Approved" setzen und deployen. Nach dem nächsten echten Passkey-Login einmal den `login_log`-Eintrag im SQL Editor gegenprüfen. BUG-1/BUG-2/BUG-3 gesammelt bei einer der nächsten Gelegenheiten mitnehmen, keiner davon blockiert das Deployment.

## Deployment
- **Production URL:** https://obsi-hoferkundenportal.vercel.app
- **Deployed:** 2026-09-23 (automatisch via Vercel bei Push auf `main`, alle PROJ-11-Commits liefen bereits vor diesem `/deploy`-Schritt live)
- **Migrationen:** `supabase/migrations/0008_export_log.sql` und `0009_erfolgsmessung_login_status.sql` — beide vom Nutzer im Supabase SQL Editor ausgeführt (bestätigt)
- **Verifiziert:** `npm run build`/`npm run lint` lokal fehlerfrei vor jedem Push; keine neuen Env-Variablen (nutzt bestehende `CRON_SECRET`, `RESEND_API_KEY`, `ALERT_EMAIL_TO`). Der neue wöchentliche Cron (`0 6 * * 1`) in `vercel.json` greift ab dem nächsten Montag; empfohlen (siehe QA), vorher einmal manuell `curl -H "Authorization: Bearer $CRON_SECRET" https://obsi-hoferkundenportal.vercel.app/api/cron/erfolgsmessung-report` aufzurufen und die tatsächlich ankommende E-Mail zu prüfen — steht beim Nutzer noch aus
- **Tag:** `v1.7.0-PROJ-11`

**Nachträglich geändert (2026-09-23, Nutzerwunsch nach dem ersten manuellen Test-Cron-Lauf):** Zeile "Noch nicht eingeloggt: ..." aus dem Report-Text entfernt (`formatLoginQuoteSection` in `src/lib/erfolgsmessung/report.ts`) — der Nutzer wollte nur sehen, welche Kunden sich bereits eingeloggt haben, nicht zusätzlich die Gegenliste. Aggregierte Quote und die "Eingeloggt: ..."-Zeile bleiben unverändert. `report.test.ts` entsprechend angepasst, alle 162 Tests weiterhin grün.

**Nachtrag 2026-09-23 (zweiter Refinement-Durchgang) — Login-Zählung pro Firma:**
- **Deployed:** 2026-09-23 (automatisch via Vercel bei Push auf `main`, alle Commits liefen bereits vor diesem `/deploy`-Schritt live)
- **Migration:** `supabase/migrations/0010_login_log.sql` — vom Nutzer im Supabase SQL Editor ausgeführt (bestätigt)
- **Verifiziert:** `npm run build`/`npm run lint` lokal fehlerfrei; volle Vitest-Suite (173 Tests) und volle Playwright-Suite (38 Tests, alle Browser) grün vor dem Deploy, keine neuen Env-Variablen. Live-Verifikation des neuen `login_log`-Eintrags nach einem echten Passkey-Login steht beim Nutzer noch aus (siehe QA-Empfehlung)
- **Tag:** `v1.7.1-PROJ-11`

**Nachtrag 2026-09-23 (dritter Refinement-Durchgang) — CSV-Exports pro Firma:**
- **Deployed:** 2026-09-23 (automatisch via Vercel bei Push auf `main`)
- **Live verifiziert (2026-09-24):** echter Wochenreport zeigt konsistente Daten über alle vier Sektionen — Login-Quote (4/275), Logins pro Firma, CSV-Exports pro Monat und CSV-Exports pro Firma stimmen erwartungsgemäss überein (siehe Open Questions: der zuvor beobachtete Login-Quote-Bug war ein externes PROJ-2-Problem, nicht PROJ-11, und ist inzwischen behoben)
- Keine neue Migration, kein neuer Endpoint — reine Report-Text-Erweiterung
