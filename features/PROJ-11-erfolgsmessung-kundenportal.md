# PROJ-11: Erfolgsmessung Kundenportal

## Status: Architected
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

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
