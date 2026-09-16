# PROJ-1: Dataverse-Sync-Service

## Status: Planned
**Created:** 2026-09-15
**Last Updated:** 2026-09-16

## Dependencies
- None

## User Stories
- Als Kunde möchte ich, dass meine Geräte- und Prüfberichtsdaten im Portal aktuell sind, sobald sich etwas in Dataverse ändert, damit ich mich auf die angezeigten Informationen verlassen kann.
- Als OBSI Hofer AG möchte ich, dass Änderungen in Dataverse automatisch ins Portal übernommen werden, ohne manuellen Exportschritt.
- Als OBSI Hofer AG (Admin) möchte ich bei einem endgültig fehlgeschlagenen Sync benachrichtigt werden, damit ich den betroffenen Datensatz manuell nachziehen kann.

## Out of Scope
- Polling-basierter/zeitgesteuerter Sync — ersetzt durch ereignisgesteuerten Push via Power Automate
- Wiederkehrender/automatischer Backfill — nur einmaliger, manuell angestossener Erstimport
- Bidirektionaler Sync (Schreiben vom Portal zurück nach Dataverse) — Portal ist read-only (siehe PRD)
- Konfliktbehandlung bei gleichzeitigen Änderungen — Dataverse ist immer Source of Truth, eingehende Daten überschreiben den Datenbankstand ohne Merge-Logik
- Echtzeit-Benachrichtigung an Kunden bei neuen Daten — Non-Goal laut PRD, evtl. späteres Feature
- Login/Zugriffssteuerung — siehe PROJ-2
- Anzeige der Daten im Portal — siehe PROJ-3, PROJ-4, PROJ-5

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Gerät, Prüfbericht, Kunde/Account oder Artikel wird in Dataverse erstellt oder geändert, wenn der zugehörige Power-Automate-Flow auslöst, dann wird der vollständige aktuelle Datensatz inkl. Fremdschlüssel per authentifiziertem Webhook-Aufruf an den Sync-Endpoint gesendet und dort per Upsert gespeichert
- [ ] Angenommen ein Prüfbericht wird in Dataverse gelöscht, wenn der zugehörige Lösch-Flow auslöst, dann wird der Prüfbericht in der Datenbank als gelöscht markiert (Soft-Delete), nicht physisch entfernt
- [ ] Angenommen ein Gerät, Kunde/Account oder Artikel wird in Dataverse gelöscht, wenn der zugehörige Lösch-Flow auslöst, dann wird der entsprechende Datensatz in der Datenbank endgültig entfernt (Hard-Delete)
- [ ] Angenommen ein Webhook-Aufruf enthält keinen oder einen falschen API-Key, wenn der Sync-Endpoint den Request empfängt, dann wird der Request mit HTTP 401 abgelehnt und es werden keine Daten verändert
- [ ] Angenommen der Sync-Endpoint ist temporär nicht erreichbar, wenn Power Automate einen Aufruf sendet, dann wiederholt Power Automate den Aufruf automatisch über die Standard-Retry-Logik; schlägt dies endgültig fehl, wird der Verantwortliche per E-Mail benachrichtigt
- [ ] Angenommen der initiale Backfill wird ausgeführt, wenn das Backfill-Skript läuft, dann werden alle bestehenden Kunden/Accounts, Geräte, Prüfberichte und Artikel inkl. Relationen einmalig in die Datenbank übernommen
- [ ] Angenommen ein Datensatz wird per Sync empfangen und existiert bereits in der Datenbank, wenn der Upsert verarbeitet wird, dann wird der bestehende Datensatz aktualisiert statt dupliziert

## Edge Cases
- Zwei Änderungen am selben Datensatz treffen kurz hintereinander ein (Race Condition) → Last-Write-Wins, da bei jedem Trigger der vollständige Datensatz übertragen wird
- Derselbe Trigger wird doppelt gesendet (z.B. Power-Automate-Retry nach einem Aufruf, der eigentlich erfolgreich war) → unkritisch, da Upsert idempotent ist
- Ein Prüfbericht wird synchronisiert, bevor das zugehörige Gerät in der Datenbank existiert (Reihenfolge der Flows nicht garantiert) → siehe Open Questions, technische Lösung in `/architecture`
- Ein Kunde/Account oder Gerät wird hart gelöscht, obwohl noch abhängige Geräte/Prüfberichte referenzieren → siehe Open Questions, technische Lösung in `/architecture`
- Backfill-Skript wird nach dem Go-Live versehentlich ein zweites Mal ausgeführt → muss idempotent sein (gleiches Upsert-Verhalten wie laufender Sync)

## Technical Requirements (optional)
- Sicherheit: Authentifizierung eingehender Webhook-Aufrufe via Shared Secret/API-Key im HTTP-Header
- Datenaktualität: near-real-time, begrenzt durch Power-Automate-Ausführungszeit (kein fixes SLA in v1)

## Open Questions
- [ ] Wie soll die Sync-Verarbeitung mit "verwaisten" Referenzen umgehen (Prüfbericht trifft vor zugehörigem Gerät ein, oder übergeordneter Datensatz wird hart gelöscht während Kinder-Datensätze noch existieren)? — für `/architecture`

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Datenabgrenzung erfolgt auf Account-Ebene (Firma = Kunde), nicht pro einzelnem Kontakt | Geräte gehören typischerweise einer Firma, nicht einer Einzelperson; jeder Kontakt mit Login sieht alle Geräte/Prüfberichte seines Accounts | 2026-09-15 |
| Sync erfolgt ereignisgesteuert via Power Automate (Push bei Datenänderung), nicht als pollender Scheduled Job | Power Automate ist bereits als Steuerungsmechanismus vorgesehen; ermöglicht near-real-time Updates ohne unnötige Polling-Last auf Dataverse | 2026-09-15 |
| Pro Entität (Gerät, Prüfbericht, Kunde/Account, Artikel) löst jede Änderung einen eigenen Flow aus | Bestätigt durch Nutzer — granularste und einfachste Umsetzung in Power Automate | 2026-09-16 |
| Authentifizierung via Shared Secret/API-Key im Header | Einfach in Power Automate konfigurierbar, kein OAuth-Flow nötig | 2026-09-16 |
| Erstbefüllung (Backfill) erfolgt einmalig manuell via Dataverse Web API, nicht über Power Automate | Power Automate triggert nur zukünftige Änderungen; ein einmaliges Backfill-Skript ist einfacher als bestehende Datensätze künstlich per Flow "anzustossen" | 2026-09-16 |
| Fehlerbehandlung nutzt Power Automates eingebaute Retry-Logik + E-Mail-Benachrichtigung bei endgültigem Fehlschlag | Ausreichend robust für MVP-Umfang; eigene Dead-Letter-Queue wäre Overengineering | 2026-09-16 |
| Löschungen lösen einen separaten Flow pro Entität aus; Prüfberichte werden Soft-Deleted, andere Entitäten Hard-Deleted | Prüfberichte sind sicherheitsrelevante Nachweise und sollen nachvollziehbar bleiben; andere Entitäten benötigen das nicht | 2026-09-16 |
| Bei jedem Trigger wird der vollständige Datensatz (nicht nur Delta) übertragen | Einfacher in Power Automate zu bauen, macht den Sync-Endpoint robuster gegen verlorene Events (reines Upsert, keine Feld-Merge-Logik nötig) | 2026-09-16 |

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
