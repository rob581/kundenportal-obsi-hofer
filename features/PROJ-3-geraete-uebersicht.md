# PROJ-3: Geräte-Übersicht

## Status: Planned
**Created:** 2026-09-17
**Last Updated:** 2026-09-17

## Dependencies
- Requires: PROJ-1 (Dataverse-Sync-Service) — liefert die Geräte-, Standort- und Firmen-Daten
- Requires: PROJ-2 (Kunden-Login) — liefert die aktuell ausgewählte Firma, auf die die Geräteliste eingeschränkt wird

## User Stories
- Als Kunde möchte ich alle Geräte meiner Firma in einer Liste sehen, damit ich einen Überblick über deren Status habe.
- Als Kunde möchte ich die Liste nach Status filtern können, damit ich schnell Geräte mit Handlungsbedarf finde.
- Als Kunde möchte ich nach Gerätename oder Seriennummer suchen können, damit ich ein bestimmtes Gerät schnell finde.
- Als Kunde möchte ich auf ein Gerät klicken können, um alle verfügbaren Details zu sehen.
- Als Kunde einer Firma ohne Geräte möchte ich eine klare Meldung sehen, statt einer leeren oder verwirrenden Seite.

## Out of Scope
- Link zu Prüfberichten pro Gerät — folgt, sobald PROJ-4 (Prüfberichte-Liste) existiert, wird dann per `/refine PROJ-3` oder direkt bei PROJ-4 ergänzt
- Sortierbare Spalten-Header (Klick zum Umsortieren) — nur die eine fest definierte Standard-Sortierung (siehe unten)
- Bearbeiten, Erstellen oder Löschen von Geräten — Portal ist read-only (siehe PRD)
- Dashboard-Kennzahlen ("Anzahl Geräte pro Status" etc.) — siehe PROJ-5
- PDF-Download — siehe PROJ-4
- Anzeige von Geräten mehrerer Firmen gleichzeitig — nur die aktuell in PROJ-2 ausgewählte Firma

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Kunde ist angemeldet und hat eine Firma ausgewählt, wenn er die Geräte-Übersicht aufruft, dann werden alle Geräte dieser Firma geladen und mit Gerätename, Status, Standort und Datum der letzten Prüfung angezeigt
- [ ] Angenommen die ausgewählte Firma hat keine Geräte, wenn die Übersicht geladen wird, dann wird eine Leermeldung angezeigt ("Für Ihre Firma sind noch keine Geräte hinterlegt...")
- [ ] Angenommen der Kunde wählt einen Status-Filter, wenn dieser angewendet wird, dann zeigt die Liste ausschliesslich Geräte mit diesem Status
- [ ] Angenommen der Kunde gibt einen Suchbegriff ein, wenn nach Gerätename oder Seriennummer gesucht wird, dann werden nur passende Geräte angezeigt
- [ ] Angenommen Status-Filter und Suchbegriff sind gleichzeitig gesetzt, wenn die Liste angezeigt wird, dann werden beide Kriterien kombiniert (UND-Verknüpfung) angewendet
- [ ] Angenommen mehr als 25 Geräte entsprechen den aktuellen Filtern, wenn die Liste angezeigt wird, dann wird sie paginiert (25 Einträge pro Seite)
- [ ] Angenommen ein Kunde klickt auf ein Gerät in der Liste, wenn die Detailseite lädt, dann werden alle verfügbaren Felder angezeigt (u.a. Seriennummer, Barcode, Hersteller/Artikel, Standort, Lagerort, Zubehör, Bemerkungen)
- [ ] Angenommen die Geräteliste wird angezeigt, dann ist sie standardmässig nach Datum der letzten Prüfung sortiert (neuestes Datum zuerst); Geräte ohne jemals erfasste Prüfung erscheinen ganz oben
- [ ] Angenommen die Gerätedaten können nicht geladen werden (z.B. Datenbank kurzzeitig nicht erreichbar), wenn der Fehler auftritt, dann wird eine Fehlermeldung mit "Erneut versuchen"-Button angezeigt und Header/Abmelden bleiben nutzbar

## Edge Cases
- Ein Gerät hat keinen Standort und damit keinen herstellbaren Firma-Bezug (bekannter Datenqualitäts-Hinweis aus PROJ-1) → erscheint in keiner Kunden-Übersicht, da die Zuordnung Gerät→Standort→Firma fehlt
- Der Gerätestatus ist in Dataverse ein Freitextfeld ohne festen Wertebereich → die Filter-Optionen werden dynamisch aus den tatsächlich bei dieser Firma vorkommenden Status-Werten gebildet, nicht hart codiert
- Ein Kunde mit mehreren Firmen wechselt die aktive Firma (PROJ-2) → die Geräteliste zeigt automatisch nur noch Geräte der neu gewählten Firma, Filter/Suche werden zurückgesetzt
- Sehr lange Gerätenamen, Bemerkungen oder Standortnamen → Tabellenzellen brechen sauber um bzw. werden gekürzt, damit das Layout nicht bricht (insbesondere auf Mobile)
- Suchbegriff liefert keine Treffer → eigene "Keine Ergebnisse für '...'"-Meldung, unterscheidbar von der generellen Leermeldung (keine Geräte überhaupt)

## Technical Requirements (optional)
- Zugriffsbeschränkung: Geräte-Abfrage ist serverseitig auf die aktuell ausgewählte Firma (PROJ-2) beschränkt, nie clientseitig gefiltert
- Performance: Paginierte Abfrage (nicht die komplette Geräteliste einer Firma auf einmal laden)

## Open Questions
- [ ] Genaue Liste/Bedeutung der vorkommenden Status-Werte in `bmvcc_Betriebsmittelstatus` ist nicht abschliessend bekannt (siehe PROJ-1 Decision Log) — relevant für sinnvolle Filter-Beschriftungen, wird bei `/architecture` oder `/frontend` anhand echter Daten geprüft

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Liste zeigt nur Gerätename, Status, Standort, Datum letzte Prüfung; Rest in Detailansicht | Hält die Übersicht auf einen Blick lesbar, Details bei Bedarf verfügbar | 2026-09-17 |
| Status-Filter UND Freitextsuche (Gerätename/Seriennummer) bereits im MVP | Beides zusammen deckt die wichtigsten Anwendungsfälle ab (Handlungsbedarf finden vs. bekanntes Gerät nachschlagen) | 2026-09-17 |
| Paginierung mit 25 Einträgen pro Seite | Firmen können mehrere hundert Geräte haben; verhindert unübersichtliche/langsame Listen | 2026-09-17 |
| Detailansicht als eigene Unterseite, kein Modal | Einfacher umzusetzen, funktioniert gut auf Mobile, erweiterbar für spätere Prüfberichte-Verlinkung (PROJ-4) | 2026-09-17 |
| Link zu Prüfberichten pro Gerät bewusst nicht in PROJ-3 | PROJ-4 existiert noch nicht — ein Link ins Leere wäre verwirrend; wird nachgezogen | 2026-09-17 |
| Standard-Sortierung: Datum letzte Prüfung, neueste zuerst, nie geprüfte Geräte ganz oben | Macht Geräte mit dringendstem Handlungsbedarf (nie geprüft) sofort sichtbar | 2026-09-17 |
| Fehler beim Laden zeigt Fehlermeldung + "Erneut versuchen", keine kaputte Seite | Header/Abmelden bleiben trotzdem nutzbar | 2026-09-17 |

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
