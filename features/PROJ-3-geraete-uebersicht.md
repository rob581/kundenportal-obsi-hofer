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
- [x] Genaue Liste/Bedeutung der vorkommenden Status-Werte in `bmvcc_Betriebsmittelstatus` → bei `/architecture` anhand der echten Daten geprüft: "Freigabe" (83%), "keine Freigabe" (14%), "letzte Freigabe"/"Letzte Freigabe" (2%, uneinheitliche Gross-/Kleinschreibung), kein Status gesetzt (0,6%) (2026-09-17)

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
| `/uebersicht` (bisheriger PROJ-2-Platzhalter) wird die echte Geräte-Übersicht; Detailseite unter `/uebersicht/geraete/[id]` | Ist bereits die vorgesehene Landing-Page nach Firma-Auswahl, kein zusätzlicher Redirect nötig | 2026-09-17 |
| Server Components lesen direkt aus Supabase, kein separater API-Endpoint | Reine Leseoperation, passt zum bestehenden Muster (Firmen-Auswahl macht das schon so) | 2026-09-17 |
| Firma-Einschränkung erfolgt vollständig im Server-Code (eigene WHERE-Bedingungen), nicht über Datenbank-RLS-Policies | Die PROJ-1-Tabellen haben RLS ohne jegliche Freigabe für anon/authenticated — nur der Service-Role-Schlüssel darf überhaupt lesen; die Firma-Einschränkung muss daher explizit im Code erfolgen | 2026-09-17 |
| Kein automatischer Datenbank-Join zwischen Gerät und Standort (PostgREST-Embedding) — stattdessen zweistufige Abfrage (erst Standorte der Firma, dann Geräte dieser Standorte) | Seit PROJ-1 BUG-1-Fix gibt es keine echten Fremdschlüssel-Constraints zwischen den Tabellen mehr, wodurch Supabase/PostgREST keine automatische Verknüpfung erkennen kann | 2026-09-17 |
| Filter/Suche/Seite werden als URL-Suchparameter geführt, nicht als reiner Client-State | Zustand bleibt beim Neuladen/Teilen erhalten; Server Component kann die Datenbankabfrage direkt anhand der URL bauen | 2026-09-17 |
| Status-Filter-Optionen werden bei jedem Laden dynamisch aus den tatsächlichen Werten der Firma ermittelt, mit Gross-/Kleinschreibungs-Normalisierung beim Gruppieren | Echte Daten zeigen inkonsistente Schreibweisen ("letzte Freigabe" vs. "Letzte Freigabe") — ohne Normalisierung erschienen zwei Filter für denselben Status | 2026-09-17 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponenten-Struktur

```
/uebersicht (ersetzt den PROJ-2-Platzhalter)
├── AppHeader (bestehend)
├── Filterleiste
│   ├── Status-Filter (Dropdown, Optionen aus den echten Daten der Firma)
│   └── Suchfeld (Gerätename/Seriennummer)
├── Geräte-Tabelle
│   ├── Spalten: Gerätename, Status, Standort, Datum letzte Prüfung
│   ├── Zeile anklickbar → Detailseite
│   ├── Leer-Zustand ("keine Geräte") bzw. "keine Ergebnisse für Suche"
│   └── Fehler-Zustand mit "Erneut versuchen"
└── Pagination (25 pro Seite)

/uebersicht/geraete/[id] (neue Detailseite)
├── AppHeader
├── Zurück-Link
└── Detail-Karte: Seriennummer, Barcode, Hersteller/Norm (Artikel), Standort, Lagerort, Zubehör, Bemerkungen, Status, Prüfdaten
```

### Datenmodell (in Textform)

- Bei jedem Aufruf liest der Server Geräte aus der PROJ-1-Tabelle `dv_geraete`, eingeschränkt auf die Standorte der aktuell gewählten Firma (zweistufig: erst `dv_standorte` nach `firma_id`, dann `dv_geraete` nach den gefundenen Standort-IDs)
- Filter (Status, Suche) und Seite werden als URL-Parameter geführt (`?status=...&suche=...&seite=2`)
- Detailseite liest einen einzelnen Geräte-Datensatz plus verknüpften Artikel- und Standort-Namen (ebenfalls per separater Abfrage, kein automatischer Join)

### Technische Entscheidungen (Begründung)
Siehe Decision Log → Technical Decisions oben.

### Abhängigkeiten (Packages)
Keine neuen — nutzt die bereits installierten shadcn-Komponenten (Table, Input, Select, Pagination) und die vorhandene Supabase-Anbindung (`@supabase/supabase-js`, `src/lib/supabase-admin.ts`).

### Datenfund für `/frontend` und `/backend`
Echte Status-Werte über alle 8243 Geräte (Stand 2026-09-17): "Freigabe" (6842), "keine Freigabe" (1174), "letzte Freigabe"/"Letzte Freigabe" (172+2, uneinheitliche Schreibung), kein Status (53, `null`). Beim Gruppieren für den Filter case-insensitiv vergleichen.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
