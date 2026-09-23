# Product Requirements Document

## Vision
Self-Service-Kundenportal für die OBSI Hofer GmbH, über das Kunden jederzeit den aktuellen Status ihrer sicherheitsrelevanten Geräte sowie die zugehörigen Prüfberichte einsehen und als CSV exportieren können – als Ersatz für die heutige manuelle Aufbereitung in Excel und den Versand per E-Mail.

## Target Users
Bestehende Kunden der OBSI Hofer GmbH, die den Prüfstatus und die Prüfberichte ihrer Geräte einsehen wollen, ohne dafür bei OBSI Hofer nachfragen zu müssen. Zugang wird manuell freigeschaltet (keine Selbstregistrierung), da die Zuordnung über den bestehenden Dataverse-Account/Kontakt erfolgt.

## Core Features (Roadmap)

| Priority | Feature | Status |
|----------|---------|--------|
| P0 (MVP) | Dataverse-Sync-Service | Deployed |
| P0 (MVP) | Kunden-Login (Supabase Auth) | Deployed |
| P0 (MVP) | Geräte-Übersicht (eigene Geräte, Status) | Deployed |
| P0 (MVP) | Prüfberichte-Liste | Deployed |
| P0 (MVP) | Dashboard (Geräte pro Status, Total Prüfberichte, letzte Prüfung) | Deployed |
| P1 | Passkey-Login (zusätzlich zu E-Mail+Code) | Deployed |
| P2 | Kundenspezifische Spalten in der Geräte-Übersicht | Deployed |
| P1 | CSV-Export der Geräte-Übersicht | Deployed |
| P1 | Prüfberichte-Übersicht | Deployed |
| P1 | CSV-Export der Prüfberichte-Übersicht | Deployed |
| P2 | Erfolgsmessung Kundenportal (intern, nur SQL) | Planned |

## Success Metrics
- Reduktion der internen Zeit für manuelle Excel-Aufbereitung/Versand von Prüfberichten
- Kundenzufriedenheit (z.B. Feedback/Umfrage nach Launch)
- Aktive Nutzung: Anteil Kunden mit mind. 1 Login
- Anzahl CSV-Exports pro Monat

## Constraints
- Dataverse ist Source of Truth für alle Daten (Kunden, Geräte, Prüfberichte, Artikel) inkl. Relationen
- Architektur: periodischer Sync-Job Dataverse → Supabase/Postgres (kein Live-API-Call pro Request)
- Auth: Supabase Auth (E-Mail-Einmal-Code; Passkey/WebAuthn als spätere Option möglich) — Wechsel von ursprünglich Microsoft Entra External ID, siehe PROJ-2 Decision Log (2026-09-21). Kein besonderer Grund für die ursprüngliche Festlegung erinnerlich; aufgehoben, solange das Portal noch keine Produktivnutzer hat
- Kunden-Zuordnung: Login-E-Mail ↔ Dataverse-Kontakt/Account
- Portal ist read-only – keine Schreibrechte für Kunden, kein Zurückschreiben nach Dataverse
- Team: 1 Person (Nutzer selbst, hat Dataverse-Admin-Zugriff)
- Design: definiert in `docs/design-system.md` (freie Palette, nüchtern & vertrauenswürdig, Primärfarbe klares Stahlblau); auf allen bereits gebauten Seiten via `globals.css` angewendet

## Non-Goals
- Keine Selbstregistrierung neuer Kunden
- Keine automatischen Benachrichtigungen (z.B. E-Mail bei neuem Prüfbericht)
- Keine Mehrsprachigkeit (nur Deutsch)
- Keine native mobile App
- Kein Admin-Backend für interne Mitarbeiter
- Keine Bearbeitung/Erstellung von Daten durch Kunden

---

Use `/write-spec` to create detailed feature specifications for each item in the roadmap above.
