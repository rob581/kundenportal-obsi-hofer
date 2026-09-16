# PROJ-2: Kunden-Login (Entra External ID)

## Status: Planned
**Created:** 2026-09-16
**Last Updated:** 2026-09-16

## Dependencies
- Requires: PROJ-1 (Dataverse-Sync-Service) — für den Abgleich der E-Mail-Adresse gegen synchronisierte Kontakt-/Relation-/Firma-Daten

## User Stories
- Als Kunde möchte ich mich mit meiner Geschäfts-E-Mail über Microsoft Entra External ID registrieren/anmelden, damit ich Zugriff auf meine Geräte- und Prüfberichtsdaten erhalte.
- Als Kunde mit mehreren zugeordneten Firmen möchte ich zwischen diesen wechseln können, damit ich jeweils nur die für mich relevanten Daten sehe.
- Als Kunde ohne gültige Zuordnung möchte ich eine klare Meldung mit Kontaktmöglichkeit sehen, damit ich weiss, wie ich Zugang bekomme.
- Als OBSI Hofer AG möchte ich, dass nur Kunden mit einer aktiven, gültigen Kontakt-Zuordnung in Dataverse Zugriff auf Daten erhalten, damit keine Fremd- oder veralteten Daten offengelegt werden.
- Als Kunde möchte ich mich abmelden können, damit ich meine Sitzung sicher beenden kann.

## Out of Scope
- Eigene Konto-Verwaltung (Passwort ändern, Profil bearbeiten) — wird vollständig über die Standard-UI von Entra External ID abgedeckt
- Sofortige Sperrung einer laufenden Sitzung bei Entzug des Zugriffs — die Zuordnung wird nur beim (nächsten) Login geprüft
- Automatisiertes Ticket-/Support-System bei "Kein Zugang" — nur statischer Kontakthinweis
- Admin-Verwaltung der Kontakt-Zuordnung im Portal — erfolgt weiterhin ausschliesslich in Dataverse
- Rollenbasierte Rechte innerhalb einer Firma (z.B. Kontakt X sieht weniger als Kontakt Y derselben Firma) — alle aktiven Kontakte einer Firma sehen dieselben Daten dieser Firma
- Eigene MFA-Konfiguration/-Logik — es werden die Standard-Sicherheitseinstellungen von Entra External ID verwendet

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Kunde ist noch nicht registriert, wenn er sich mit seiner Geschäfts-E-Mail über Entra External ID registriert und die E-Mail-Adresse verifiziert, dann wird geprüft, ob diese E-Mail (unabhängig von Gross-/Kleinschreibung) einem synchronisierten, **aktiven** Kontakt entspricht
- [ ] Angenommen die E-Mail eines Kunden entspricht einem aktiven Kontakt mit genau einer zugeordneten Firma, wenn der Login erfolgreich ist, dann wird der Kunde direkt zur Übersicht dieser Firma weitergeleitet
- [ ] Angenommen die E-Mail eines Kunden entspricht einem aktiven Kontakt mit mehreren zugeordneten Firmen, wenn der Login erfolgreich ist, dann sieht der Kunde eine Firmen-Auswahl, bevor er auf Geräte/Prüfberichte zugreifen kann
- [ ] Angenommen die E-Mail eines Kunden entspricht keinem bekannten Kontakt oder einem inaktiven Kontakt, wenn der Login-Vorgang abgeschlossen ist, dann wird dieselbe generische "Kein Zugang"-Meldung mit Kontaktmöglichkeit angezeigt und keine Kundendaten werden geladen
- [ ] Angenommen ein Kunde ist eingeloggt, wenn er auf "Abmelden" klickt, dann wird seine Sitzung beendet und er landet auf der Login-Seite
- [ ] Angenommen ein Kunde wählt in der Firmen-Auswahl eine Firma, wenn er zur Übersicht wechselt, dann werden auf allen folgenden Seiten (Geräte, Prüfberichte, Dashboard) ausschliesslich Daten dieser Firma angezeigt
- [ ] Angenommen die Kontakt-Zuordnung oder der Aktiv-Status eines Kunden ändert sich in Dataverse, wenn der Kunde sich das nächste Mal einloggt, dann spiegelt sein Zugriff den aktuellen Stand wider

## Edge Cases
- Der Kontakt existiert bereits in Dataverse, wurde aber vom PROJ-1-Sync noch nicht übernommen (Race Condition) → wird wie "kein Zugang" behandelt, mit Hinweis, es später erneut zu versuchen
- Die zugeordnete Firma wurde in Dataverse gelöscht/deaktiviert → Zugriff auf diese Firma entfällt (bei nur einer Firma: "kein Zugang"; bei mehreren: sie verschwindet aus der Auswahl)
- Ein Kontakt wird von "aktiv" auf "inaktiv" gesetzt, während er gerade eingeloggt ist → keine sofortige Auswirkung auf die laufende Sitzung (siehe Out of Scope), erst beim nächsten Login
- E-Mail-Abgleich erfolgt unabhängig von Gross-/Kleinschreibung
- Ein Kunde mit mehreren Firmen meldet sich erneut an → es wird bei jedem Login erneut die Firmen-Auswahl gezeigt, keine gespeicherte "zuletzt verwendete Firma"

## Technical Requirements (optional)
- Sicherheit: Zugriffsprüfung ausschliesslich serverseitig gegen synchronisierte Dataverse-Daten (Kontakt-Status + Relation zu Firma), nie rein clientseitig
- Auth-Provider: Microsoft Entra External ID

## Open Questions
- [x] Gibt es Rollen in `bmvcc_relation.bmvcc_role_description`, die keinen Zugriff mehr rechtfertigen (z.B. "ehemalig")? → Gelöst: `bmvcc_Kontakt` hat ein eigenes Status-Feld (aktiv/inaktiv); massgeblich für Zugriff ist dieser Status, nicht die Rollenbeschreibung (2026-09-16)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Self-Service-Anmeldung über Entra External ID statt manueller Einzel-Einladung | Kein manueller Aufwand pro neuem Kunden für ein Ein-Personen-Team; Datenzugriff bleibt trotzdem strikt auf bekannte, aktive Kontakte beschränkt | 2026-09-16 |
| Bei mehreren zugeordneten Firmen wählt der Kunde nach Login aktiv eine Firma aus (kein kombinierter Multi-Firmen-Blick) | Vermeidet Vermischung von Daten unterschiedlicher Kundenbeziehungen; einfachere Anzeige-Logik für PROJ-3/4/5 | 2026-09-16 |
| Zuordnung/Status wird bei jedem Login neu geprüft, nicht dauerhaft in einem Portal-Konto gespeichert | Änderungen in Dataverse wirken sich automatisch beim nächsten Login aus, ohne zusätzlichen Abgleichsmechanismus während einer laufenden Sitzung | 2026-09-16 |
| Zugriffsvoraussetzung ist der Aktiv-Status des Kontakts (`bmvcc_Kontakt`-Statusfeld), nicht die Rollenbeschreibung in `bmvcc_relation` | Klareres, bereits vorhandenes Signal in Dataverse für "nicht mehr aktuell" | 2026-09-16 |
| "Kein Zugang" zeigt für unbekannte UND inaktive Kontakte dieselbe generische Meldung | Verhindert, dass von aussen erkennbar ist, ob eine E-Mail-Adresse existiert(e) oder nur deaktiviert wurde | 2026-09-16 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| NextAuth.js (Auth.js) mit Microsoft-Entra-External-ID-Provider | Standard-Lösung im Next.js-Ökosystem für OIDC-Logins, übernimmt Redirects, Token-Prüfung und sichere Session-Cookies | 2026-09-16 |
| Zugriffsprüfung (Kontakt aktiv? + Relation zu Firma) läuft als eigener Schritt direkt nach dem Entra-Login, bevor eine gültige Portal-Sitzung entsteht | Trennt "bei Microsoft angemeldet" klar von "hat Zugriff auf Kundendaten" | 2026-09-16 |
| Keine eigene "Portal-Benutzer"-Tabelle — Kontakt/Firmen-Zuordnung wird bei jedem Login frisch aus den PROJ-1-Tabellen ermittelt und nur in der Session gehalten | Passt zur Produktentscheidung "Zuordnung wird bei jedem Login neu geprüft"; vermeidet eine zusätzliche, potenziell veraltende Tabelle | 2026-09-16 |
| Alle Seiten außer Login/"Kein Zugang" sind serverseitig geschützt (nicht nur im Frontend versteckt) | Verhindert Datenzugriff durch reines URL-Aufrufen ohne gültige Sitzung | 2026-09-16 |
| Speicherort der PROJ-1-Spiegeldaten bleibt Supabase/Postgres (nicht Azure Database for PostgreSQL) | Erneut abgewogen: geringerer Setup-Aufwand und bereits im Template vorbereitet, trotz fehlender Schweizer Supabase-Region — akzeptierter Kompromiss für ein Ein-Personen-Team, bestätigt PROJ-1 | 2026-09-16 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponenten-Struktur

```
App (mit Auth-Schutz)
├── Login-Seite
│   └── "Mit Entra External ID anmelden" → leitet zur gehosteten Entra-Anmeldeseite weiter
├── Nach erfolgreichem Entra-Login: serverseitige Zugriffsprüfung
│   ├── Kein aktiver, passender Kontakt gefunden
│   │   └── "Kein Zugang"-Seite (Meldung + Kontakt-Link + "Abmelden/andere E-Mail versuchen")
│   ├── Genau eine zugeordnete Firma
│   │   └── direkte Weiterleitung zur Firma-Übersicht (PROJ-3/4/5)
│   └── Mehrere zugeordnete Firmen
│       └── Firmen-Auswahl-Seite (Liste zum Anklicken)
└── Navigation (eingeloggter Zustand)
    └── "Abmelden"-Button
```

### Datenmodell (in Textform)

Es wird keine eigene "Portal-Benutzer"-Tabelle angelegt. Bei jedem Login läuft dieser Ablauf:
1. Die verifizierte E-Mail aus dem Entra-Token wird gegen die (aus PROJ-1 gespiegelten) Kontakt-Daten abgeglichen (Status muss aktiv sein)
2. Ist der Kontakt aktiv, werden über die Relation-Tabelle alle zugeordneten Firmen ermittelt
3. Kontakt-ID + Liste der Firmen + aktuell gewählte Firma werden nur für die Dauer der Sitzung gespeichert (Session), nicht dauerhaft in der Datenbank

### Technische Entscheidungen (Begründung)
Siehe Decision Log → Technical Decisions oben.

### Abhängigkeiten (Packages)
- `next-auth` — Authentifizierung inkl. Entra-External-ID-Anbindung
- `@supabase/supabase-js` — bereits vorhanden (PROJ-1), für den Abgleich gegen Kontakt/Relation/Firma

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
