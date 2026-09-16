# Product Requirements Document

## Vision
Self-Service-Kundenportal für die OBSI Hofer GmbH, über das Kunden jederzeit den aktuellen Status ihrer sicherheitsrelevanten Geräte sowie die zugehörigen Prüfberichte einsehen und als PDF herunterladen können – als Ersatz für die heutige manuelle Aufbereitung in Excel und den Versand per E-Mail.

## Target Users
Bestehende Kunden der OBSI Hofer GmbH, die den Prüfstatus und die Prüfberichte ihrer Geräte einsehen wollen, ohne dafür bei OBSI Hofer nachfragen zu müssen. Zugang wird manuell freigeschaltet (keine Selbstregistrierung), da die Zuordnung über den bestehenden Dataverse-Account/Kontakt erfolgt.

## Core Features (Roadmap)

| Priority | Feature | Status |
|----------|---------|--------|
| P0 (MVP) | Dataverse-Sync-Service | Planned |
| P0 (MVP) | Kunden-Login (Microsoft Entra External ID) | Planned |
| P0 (MVP) | Geräte-Übersicht (eigene Geräte, Status) | Planned |
| P0 (MVP) | Prüfberichte-Liste & PDF-Download | Planned |
| P0 (MVP) | Dashboard (Geräte pro Status, Total Prüfberichte, letzte Prüfung) | Planned |

## Success Metrics
- Reduktion der internen Zeit für manuelle Excel-Aufbereitung/Versand von Prüfberichten
- Kundenzufriedenheit (z.B. Feedback/Umfrage nach Launch)
- Aktive Nutzung: Anteil Kunden mit mind. 1 Login
- Anzahl PDF-Downloads pro Monat

## Constraints
- Dataverse ist Source of Truth für alle Daten (Kunden, Geräte, Prüfberichte, Artikel) inkl. Relationen
- Architektur: periodischer Sync-Job Dataverse → Supabase/Postgres (kein Live-API-Call pro Request)
- Auth: Microsoft Entra External ID (nicht Supabase Auth)
- Kunden-Zuordnung: Login-E-Mail ↔ Dataverse-Kontakt/Account
- Portal ist read-only – keine Schreibrechte für Kunden, kein Zurückschreiben nach Dataverse
- Offen: genauer PDF-Speicherort in Dataverse (Notes vs. SharePoint) – vom Nutzer (Dataverse-Admin) selbst zu klären, sobald PROJ-4 spezifiziert wird
- Team: 1 Person (Nutzer selbst, hat Dataverse-Admin-Zugriff)
- Design: wird separat mit Claude Design (`/design`) erstellt, bis dahin Tailwind/shadcn-Defaults

## Non-Goals
- Keine Selbstregistrierung neuer Kunden
- Keine automatischen Benachrichtigungen (z.B. E-Mail bei neuem Prüfbericht)
- Keine Mehrsprachigkeit (nur Deutsch)
- Keine native mobile App
- Kein Admin-Backend für interne Mitarbeiter
- Keine Bearbeitung/Erstellung von Daten durch Kunden

---

Use `/write-spec` to create detailed feature specifications for each item in the roadmap above.
