# PROJ-9: Prüfberichte-Übersicht

## Status: Planned
**Created:** 2026-09-22
**Last Updated:** 2026-09-22

## Dependencies
- Requires: PROJ-1 (Dataverse-Sync-Service) — liefert die Prüfberichts- und Gerätedaten
- Requires: PROJ-2 (Kunden-Login) — liefert die aktuell ausgewählte Firma
- Requires: PROJ-3 (Geräte-Übersicht) — liefert die Firma→Standort→Geräte-Auflösung, die hier wiederverwendet wird, sowie die Artikel-Info-Formatierung für die "Gerät"-Spalte
- Requires: PROJ-4 (Prüfberichte-Liste) — liefert das Datenfeld-Set (Datum, Ergebnis, Bemerkungen, Prüfer) und die Soft-Delete-/Archiviert-Konventionen
- Requires: PROJ-5 (Dashboard) — die "Total Prüfberichte"-Kachel verlinkt zu dieser neuen Seite

## User Stories
- Als Kunde möchte ich alle Prüfberichte meiner Firma über alle Geräte hinweg an einem Ort sehen, ohne jedes Gerät einzeln öffnen zu müssen.
- Als Kunde möchte ich die Liste nach Zeitraum filtern können (z.B. letzte 30 Tage), damit ich schnell einen Überblick über kürzlich durchgeführte Prüfungen bekomme.
- Als Kunde möchte ich von der Dashboard-Kachel "Total Prüfberichte" direkt zu dieser vollständigen Liste springen können.
- Als Kunde möchte ich von einem Prüfbericht direkt zum zugehörigen Gerät navigieren können, um weitere Details zu sehen.
- Als Kunde einer Firma ohne (oder ohne zum Filter passende) Prüfberichte möchte ich eine klare Meldung sehen, statt einer leeren oder verwirrenden Seite.

## Out of Scope
- CSV-Export dieser Übersicht — eigenes, separates Feature PROJ-10 (analog zur Aufteilung PROJ-3/PROJ-8)
- Freitextsuche oder Ergebnis-Filter — fürs MVP nur der Zeitraum-Filter, kann später per `/refine` ergänzt werden
- Sortierbare Spalten-Header — nur die eine fest definierte Standard-Sortierung (Datum absteigend), analog zu PROJ-3
- Eigene Detailseite pro Prüfbericht — bleibt wie in PROJ-4 unnötig, die Felder passen kompakt in die Tabelle
- Bearbeiten, Erstellen oder Löschen von Prüfberichten — Portal ist read-only (siehe PRD)
- Ausblenden archivierter Prüfberichte — werden wie in PROJ-4 ganz normal mit den aktiven Berichten angezeigt
- PDF-Download — weiterhin zurückgestellt (siehe PROJ-4/PROJ-1 offene Frage zum Speicherort)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Kunde ist angemeldet und hat eine Firma ausgewählt, wenn er `/pruefberichte` aufruft, dann werden alle nicht gelöschten Prüfberichte aller Geräte seiner Firma mit Gerät, Datum, Ergebnis, Bemerkungen und Prüfer angezeigt
- [ ] Angenommen die Prüfberichte-Liste wird angezeigt, dann ist sie standardmässig nach Prüfdatum absteigend sortiert (neuester Bericht zuerst)
- [ ] Angenommen ein Kunde wählt im Zeitraum-Filter "Letzte 30 Tage" (oder 90/365), wenn der Filter angewendet wird, dann zeigt die Liste nur Prüfberichte mit einem Prüfdatum innerhalb dieses Zeitraums
- [ ] Angenommen der Zeitraum-Filter steht auf "Alle" (Standardwert beim ersten Aufruf), wenn die Seite lädt, dann werden alle Prüfberichte ohne Zeit-Einschränkung angezeigt
- [ ] Angenommen mehr als 25 Prüfberichte entsprechen dem aktuellen Filter, wenn die Liste angezeigt wird, dann wird sie paginiert (25 Einträge pro Seite)
- [ ] Angenommen ein Kunde klickt in der Liste auf ein Gerät, dann gelangt er zur entsprechenden Geräte-Detailseite (PROJ-3)
- [ ] Angenommen ein Kunde klickt auf dem Dashboard auf die Kachel "Total Prüfberichte", dann gelangt er zu `/pruefberichte` mit dem Zeitraum-Filter auf "Alle"
- [ ] Angenommen die Firma hat keine Prüfberichte (oder keine, die zum gewählten Zeitraum passen), wenn die Seite lädt, dann wird eine passende Leermeldung angezeigt (unterscheidbar zwischen "keine Prüfberichte überhaupt" und "keine Treffer für diesen Zeitraum")
- [ ] Angenommen die Prüfberichte können nicht geladen werden (z.B. Datenbank kurzzeitig nicht erreichbar), wenn der Fehler auftritt, dann wird eine Fehlermeldung mit "Erneut versuchen" angezeigt und Header/Abmelden bleiben nutzbar
- [ ] Angenommen ein Kunde ist auf einer beliebigen geschützten Seite, wenn er im Header auf "Prüfberichte" klickt, dann gelangt er zu `/pruefberichte`

## Edge Cases
- Ein Prüfbericht ist als "archiviert" markiert → erscheint ganz normal zusammen mit den aktiven Berichten (identisch zu PROJ-4)
- Ein Prüfbericht wurde per PROJ-1-Sync als gelöscht markiert (Soft-Delete) → erscheint nicht in der Liste (identisch zu PROJ-4)
- Firma mit sehr vielen Geräten/Prüfberichten → keine Performance-Sorge für den Kunden, muss aber serverseitig batched abgefragt werden, analog zum bereits behobenen Dashboard-Bug (PROJ-5 BUG-2) und dem PROJ-8-CSV-Export
- Zwei Prüfberichte am selben Datum → Sortierung bleibt stabil, keine zusätzliche Sekundärsortierung nötig für MVP (identisch zu PROJ-4)
- Bemerkungsfeld ist leer/nicht gesetzt → Zelle zeigt "—" (konsistent mit PROJ-3/PROJ-4)
- Ein Prüfbericht referenziert ein Gerät, das (noch) nicht existiert oder keinem Standort zugeordnet ist (lose Fremdschlüssel, siehe PROJ-1) → erscheint nicht in der Liste, da die Abfrage über die Firma-Geräte-Auflösung läuft, nicht direkt über alle Prüfberichte
- Kunde mit mehreren Firmen wechselt die aktive Firma (PROJ-2) → Liste zeigt automatisch nur noch Prüfberichte der neu gewählten Firma, Filter/Seite werden zurückgesetzt

## Technical Requirements (optional)
- Zugriffsbeschränkung: Abfrage nutzt dieselbe Firma→Standort→Geräte-Auflösung wie PROJ-3, serverseitig, keine clientseitige Filterung
- Performance: Für Firmen mit vielen Geräten/Prüfberichten muss die Abfrage (inkl. Artikel-Info für die "Gerät"-Spalte) gebatcht erfolgen, um nicht am selben Problem wie PROJ-5 BUG-2 zu scheitern (zu lange Anfrage-URL bei vielen IDs)
- Paginierung erfolgt direkt in der Datenbankabfrage, nicht im Speicher (analog zu PROJ-3)

## Open Questions
Keine offenen Fragen — alle Kernentscheidungen wurden im Interview getroffen.

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Eigenes Feature statt Erweiterung von PROJ-4 | PROJ-4 hat die firmenweite Liste bewusst als "kann später ergänzt werden" zurückgestellt; jetzt eigenständig umgesetzt, PROJ-4 bleibt für die Pro-Gerät-Ansicht auf der Detailseite bestehen | 2026-09-22 |
| CSV-Export als separates Feature (PROJ-10) statt Teil dieser Spec | Gleiche Aufteilung wie PROJ-3/PROJ-8 — unabhängig testbar und deploybar, hält beide Specs klein | 2026-09-22 |
| Spalten: Gerät, Datum, Ergebnis, Bemerkungen, Prüfer | Dieselben vier PROJ-4-Felder plus eine neue "Gerät"-Spalte zur Zuordnung, da die Liste jetzt firmenweit statt pro Gerät ist | 2026-09-22 |
| Zeitraum-Filter mit den Optionen 30/90/365 Tage und "Alle", Standard "Alle" | Deckt die üblichen Reporting-Zeiträume ab; "Alle" als Standard verhindert, dass beim ersten Aufruf unerwartet Daten fehlen | 2026-09-22 |
| Paginierung mit 25 Einträgen pro Seite | Firmenweite Liste kann deutlich grösser werden als die bisherigen 2–3 Berichte pro Gerät (PROJ-4); gleiche Grösse wie die Geräte-Übersicht (PROJ-3) | 2026-09-22 |
| Kein Such-/Ergebnis-Filter im MVP | Hält die Seite einfach; kann bei Bedarf später per `/refine` ergänzt werden | 2026-09-22 |
| Route `/pruefberichte`, eigener Header-Nav-Link | Konsistent mit `/uebersicht`/`/dashboard`; ohne eigenen Link wäre die Seite nur über einen Umweg über das Dashboard erreichbar | 2026-09-22 |
| Dashboard-Kachel "Total Prüfberichte" verlinkt mit Zeitraum-Filter "Alle" | Passt zur Kachel-Bezeichnung — sie zählt alle Prüfberichte, nicht nur einen Teilzeitraum | 2026-09-22 |
| Archivierte Prüfberichte weiterhin normal angezeigt, keine Sortierbare Spalten-Header | Konsistenz mit den bereits getroffenen PROJ-3/PROJ-4-Entscheidungen | 2026-09-22 |

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
