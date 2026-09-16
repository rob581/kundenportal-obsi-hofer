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
- [x] Wie soll die Sync-Verarbeitung mit "verwaisten" Referenzen umgehen (Prüfbericht trifft vor zugehörigem Gerät ein, oder übergeordneter Datensatz wird hart gelöscht während Kinder-Datensätze noch existieren)? → Gelöst durch lockere (nicht strikt erzwungene) Fremdschlüssel in der Sync-Datenbank, siehe Tech Design (2026-09-16)
- [ ] Genauer PDF-Speicherort für Prüfberichte (Notes/Attachments vs. sonstiges) — `bmvcc_Pruefbericht` hat `IsDocumentManagementEnabled = 0` (kein SharePoint), es existiert kein Datei-/Bild-Feld unter den Attributen → sehr wahrscheinlich Dataverse Notes/Attachments (Annotationen), aber vom Nutzer noch in Dataverse zu verifizieren. Relevant für PROJ-4.

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
| Kunden-Zuordnung für Geräte läuft über `bmvcc_equipmentrecord.bmvcc_Standort` → `bmvcc_organizationlocation.bmvcc_BexioFirma` → `bmvcc_firma` | Geräte haben keinen direkten Lookup auf Firma, nur ein unzuverlässiges Textfeld (`bmvcc_KundenID`); der Standort-Lookup ist die einzige echte Dataverse-Relation dorthin | 2026-09-16 |
| Login-Zuordnung (Kontakt → Kunde) läuft über die Junction-Entität `bmvcc_relation` (Firma↔Person mit Rolle), nicht über `bmvcc_Kontakt.bmvcc_parent_account` | Ein Kontakt kann laut Datenmodell zu mehreren Firmen gehören; `bmvcc_relation` bildet das korrekt ab, das einfache Parent-Lookup nicht | 2026-09-16 |
| Gerätestatus wird aus `bmvcc_equipmentrecord.bmvcc_Betriebsmittelstatus` übernommen (feste Werteliste laut Nutzer, auch wenn das Feld technisch nvarchar ist) | Wird für die Dashboard-Gruppierung "Anzahl Geräte pro Status" (PROJ-5) benötigt | 2026-09-16 |
| "Letzte Prüfung" wird direkt aus `bmvcc_equipmentrecord.bmvcc_Letztepruefung` gelesen, nicht aus den Prüfberichten abgeleitet | Feld existiert bereits direkt am Gerät und ist die einfachste, konsistente Quelle für PROJ-5 | 2026-09-16 |
| Die bestehende `cr5d2_Dashboard`/`cr5d2_DashboardStatistik`-Entität wird NICHT mitsynchronisiert | Laut Nutzer ein unabhängiges internes Tool ohne Bezug zu unserem Kundenportal-Dashboard | 2026-09-16 |
| Fremdschlüssel in der Sync-Datenbank sind lose (nullable), nicht strikt referenziell erzwungen | Löst das Problem nicht garantierter Reihenfolge beim Sync (z.B. Prüfbericht vor Gerät); volle Konsistenz stellt sich beim nächsten Event oder Backfill her | 2026-09-16 |
| Next.js API-Routen als Sync-/Delete-Endpoints, Supabase/Postgres als Spiegel-Datenbank | Bereits Teil des Templates/Stacks, kein separates Backend-Hosting nötig | 2026-09-16 |
| Authentifizierung eingehender Power-Automate-Aufrufe via einzelnem Shared-Secret/API-Key im Header | Einfach in Power Automate konfigurierbar, ausreichend für Ein-Personen-Team | 2026-09-16 |
| Backfill-Skript nutzt `@azure/msal-node` zur Authentifizierung gegen die Dataverse Web API | Einzige zusätzliche Abhängigkeit, nur für den einmaligen Erstimport benötigt | 2026-09-16 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Datenfluss (kein UI — reines Infrastruktur-Feature)

```
Dataverse
  └─ Power Automate Flow "Erstellt/Geändert" (je 1x pro Entität:
     Firma, Kontakt, Standort, Gerät, Prüfbericht, Artikel, Relation)
        └─ HTTP POST an Sync-Endpoint (mit API-Key im Header)
  └─ Power Automate Flow "Gelöscht" (je 1x pro Entität)
        └─ HTTP POST an Delete-Endpoint (mit API-Key im Header)

Next.js API-Routen ("Sync-Endpoints")
  └─ Prüfen API-Key → bei Fehler: 401, keine Änderung
  └─ Upsert bzw. Löschen (Soft/Hard) in der Datenbank, per Dataverse-ID

Datenbank (Supabase/Postgres) — gespiegelte Tabellen
  └─ Wird von PROJ-2 (Login-Zuordnung) und PROJ-3/4/5 (Anzeige) gelesen — nie direkt von Dataverse

Backfill-Skript (einmalig, manuell gestartet)
  └─ Liest bestehende Daten direkt aus der Dataverse Web API (via @azure/msal-node)
  └─ Nutzt denselben Upsert-Mechanismus wie der laufende Sync
```

### Datenmodell (auf Basis der echten Dataverse-Solution `bmvcc`)

- **Kunden (aus `bmvcc_firma`):** Dataverse-ID, Firmenname, Adresse, E-Mail, Telefon, Website
- **Kontakte (aus `bmvcc_Kontakt`):** Dataverse-ID, Name, E-Mail (`bmvcc_mail` — Basis für Login-Zuordnung in PROJ-2), Telefon
- **Firma↔Kontakt-Zuordnung (aus `bmvcc_relation`):** Dataverse-ID, Kontakt-Referenz, Firma-Referenz, Rolle — ein Kontakt kann zu mehreren Firmen gehören
- **Standorte (aus `bmvcc_organizationlocation`):** Dataverse-ID, Bezeichnung, zugehörige Firma — Bindeglied zwischen Gerät und Kunde
- **Geräte (aus `bmvcc_equipmentrecord`):** Dataverse-ID, Gerätename, Seriennummer, Status (`bmvcc_Betriebsmittelstatus`), Datum letzte Prüfung (`bmvcc_Letztepruefung`), Standort-Referenz (→ Firma), Artikel-Referenz
- **Prüfberichte (aus `bmvcc_Pruefbericht`):** Dataverse-ID, Geräte-Referenz (`bmvcc_Gearaet`), Prüfdatum (`bmvcc_inspectiondate`), Ergebnis (`bmvcc_inspectionresult`), Prüfer, Archiviert-Kennzeichen, "gelöscht"-Kennzeichen (Soft-Delete, zusätzlich zu Dataverse' eigenem `bmvcc_isarchived`); PDF-Referenz folgt in PROJ-4
- **Artikel (aus `bmvcc_Artikel`):** Dataverse-ID, Bezeichnung, Artikelnummer, Norm/Standard, Hersteller

Jede Tabelle speichert die jeweilige Dataverse-ID als eindeutigen Schlüssel für den Upsert. Fremdschlüssel (z.B. Gerät → Standort, Standort → Firma) sind lose/nullable, damit die Reihenfolge eintreffender Sync-Events keine Rolle spielt.

### Technische Entscheidungen (Begründung)
Siehe Decision Log → Technical Decisions oben.

### Abhängigkeiten (Packages)
- `@supabase/supabase-js` — bereits im Template vorhanden (aktuell deaktiviert), wird aktiviert
- `zod` — bereits vorhanden, validiert eingehende Webhook-Payloads
- `@azure/msal-node` — neu, nur fürs Backfill-Skript benötigt

### Bekannte Datenqualitäts-Hinweise für `/backend`
- `bmvcc_equipmentrecord.bmvcc_KundenID` (Text) existiert parallel zur Standort-Relation — wird für den Sync ignoriert, könnte aber als Diagnose-Feld nützlich sein, falls ein Gerät keinen Standort hat
- `bmvcc_equipmentrecord.bmvcc_artikel_id` (int) und `cre77_artikel` (Lookup) referenzieren beide einen Artikel — vermutlich Altfeld vs. aktuelles Feld; `/backend` sollte klären, welches aktiv genutzt wird

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
