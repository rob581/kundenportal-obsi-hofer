# PROJ-7: Kundenspezifische Spalten in der Geräte-Übersicht

## Status: Architected
**Created:** 2026-09-21
**Last Updated:** 2026-09-22

## Dependencies
- Requires: PROJ-3 (Geräte-Übersicht) — erweitert die dort bestehende Tabelle um optionale Zusatzspalten
- Requires: PROJ-1 (Dataverse-Sync-Service) — muss um die Synchronisation von `bmvcc_KundenID` (aktuell bewusst ignoriert, siehe PROJ-1 Decision Log) ergänzt werden, bevor dieses Feld als Spalte angezeigt werden kann

## User Stories
- Als OBSI Hofer (Betreiber) möchte ich einzelnen Firmen zusätzliche, für sie relevante Geräte-Informationen in der Übersicht anzeigen lassen, ohne dass alle Kunden dieselben Spalten sehen müssen.
- Als Kunde möchte ich in der Geräte-Übersicht auch Felder sehen, die für meinen Betrieb wichtig sind (z.B. meine eigene Gerätebezeichnung), ohne dafür jedes Gerät einzeln öffnen zu müssen.
- Als OBSI Hofer möchte ich bei Bedarf pro Firma weitere Spalten aktivieren können, ohne Code ändern zu müssen — eine Konfigurationsänderung in der Datenbank reicht.

## Out of Scope
- Selbst-Konfiguration durch den Kunden (Spalten ein-/ausblenden) — Portal ist read-only, kein Bedarf laut Interview
- Admin-Backend/UI zur Pflege der Konfiguration — laut PRD explizit nicht vorgesehen; Pflege erfolgt manuell direkt in Supabase
- Entfernen/Ersetzen der vier Standard-Spalten (Artikel-Info, Status, Lagerort, Letzte Prüfung) — bleiben für alle Firmen immer fix bestehen
- Pro-Firma frei wählbare Reihenfolge der Zusatzspalten — feste Pool-Reihenfolge für alle Firmen gleich
- Änderungen an der Geräte-Detailseite (PROJ-3) — zeigt bereits alle verfügbaren Felder, keine Firma-spezifische Variante nötig
- Responsive/Mobile-Sonderbehandlung für zusätzliche Spalten — gleiches (bekanntes, unkritisches) horizontales Scroll-Verhalten wie das bestehende BUG-1 aus PROJ-3
- Verwendung von `bmvcc_KundenID` als Kunden-/Firma-Zuordnungskriterium — bleibt ausschliesslich eine reine Anzeige-Spalte je Gerät (Gerätebezeichnung des Kunden), hat nichts mit der Firma-Zuordnung zu tun, die weiterhin ausschliesslich über die Standort-Relation (PROJ-1) läuft

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen für eine Firma sind keine Zusatzspalten konfiguriert, wenn ein Kunde dieser Firma die Geräte-Übersicht aufruft, dann werden ausschliesslich die vier Standard-Spalten angezeigt (unverändertes Verhalten gegenüber PROJ-3)
- [ ] Angenommen für eine Firma ist mindestens eine Zusatzspalte konfiguriert (z.B. "KundenID"), wenn ein Kunde dieser Firma die Geräte-Übersicht aufruft, dann erscheint diese Spalte zusätzlich zu den vier Standard-Spalten
- [ ] Angenommen für eine Firma sind mehrere Zusatzspalten konfiguriert, wenn die Übersicht angezeigt wird, dann erscheinen sie in der festen Pool-Reihenfolge (Seriennummer, Barcode, KundenID, Zubehör, Bemerkungen, Typ, Dimension), unabhängig von der Reihenfolge in der Konfiguration
- [ ] Angenommen eine Zusatzspalte ist für eine Firma konfiguriert, aber ein einzelnes Gerät hat für dieses Feld keinen Wert, wenn die Übersicht angezeigt wird, dann zeigt die Zelle "—" (gleiche Konvention wie bei den bestehenden Spalten)
- [ ] Angenommen die Konfiguration einer Firma enthält einen unbekannten/ungültigen Spalten-Key, wenn die Übersicht geladen wird, dann wird dieser Eintrag stillschweigend ignoriert (kein Fehler, keine kaputte Seite)
- [ ] Angenommen ein Kunde mit mehreren Firmen wechselt die aktive Firma (PROJ-2), wenn die Übersicht neu lädt, dann zeigt sie die Zusatzspalten der neu gewählten Firma, nicht mehr die der vorherigen
- [ ] Angenommen `bmvcc_KundenID` ist als Zusatzspalte konfiguriert, wenn die Übersicht angezeigt wird, dann trägt die Spalte die Überschrift "KundenID"

## Edge Cases
- Firma ganz ohne Konfigurationseintrag in `portal_firma_einstellungen` → identisch zum Fall "keine Zusatzspalten konfiguriert" (kein Fehler, nur Standard-Spalten)
- Konfiguration enthält denselben Spalten-Key mehrfach → Spalte erscheint nur einmal (Deduplizierung)
- Sehr lange Werte in einer Zusatzspalte (z.B. lange Bemerkungen) auf schmalem Viewport → gleiches horizontales Scroll-Verhalten wie bei den Standard-Spalten (siehe PROJ-3 BUG-1, bewusst nicht Teil dieses Features)
- `bmvcc_KundenID` ist in Dataverse ein reines Freitextfeld ohne Validierung → wird unverändert als Text übernommen, keine Formatierung/Normalisierung
- Gerät ohne verknüpften Artikel, für das trotzdem z.B. "Typ"/"Dimension" als Zusatzspalte konfiguriert ist → Zelle zeigt "—", identisch zum bestehenden Verhalten auf der Detailseite

## Technical Requirements (optional)
- Neue Supabase-Tabelle `portal_firma_einstellungen` (Firma-ID → Liste konfigurierter Zusatzspalten-Keys), komplett unabhängig vom Dataverse-Sync-Job (PROJ-1) und von diesem beim nächtlichen Lauf nicht angerührt — Pflege erfolgt manuell durch OBSI Hofer direkt in Supabase
- `bmvcc_KundenID` muss neu in den PROJ-1-Sync aufgenommen werden (aktuell laut PROJ-1 Decision Log bewusst ignoriert) — neues Feld auf `dv_geraete`
- Zugriffsbeschränkung: Auflösung der Zusatzspalten-Konfiguration ist serverseitig an die bereits ausgewählte Firma (PROJ-2) gebunden, keine zusätzliche Angriffsfläche
- Performance: Eine zusätzliche, einfache Lookup-Abfrage der Konfiguration pro Seitenaufruf (Firma-ID → Spalten-Liste), keine spürbare Mehrbelastung

## Open Questions
Keine offenen Fragen — alle Kernentscheidungen wurden im Interview getroffen.

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Konfiguration ausschliesslich durch OBSI Hofer (manuell in der Datenbank), kein Self-Service für Kunden | Portal ist laut PRD read-only, kein Admin-Backend vorgesehen | 2026-09-21 |
| Zusatzspalten-Pool = alle bereits auf der PROJ-3-Detailseite vorhandenen Felder (Seriennummer, Barcode, KundenID, Zubehör, Bemerkungen, Typ, Dimension) | Kein neues Datenfeld nötig ausser `bmvcc_KundenID`, reduziert Aufwand | 2026-09-21 |
| `bmvcc_KundenID` als zusätzliches Pool-Feld aufgenommen | Ist die eigene Gerätebezeichnung des Kunden (reine Info, keine Kunden-/Firma-Zuordnung) — bisher ungenutzt, da für den Sync ignoriert (siehe PROJ-1) | 2026-09-21 |
| Standard-Spalten (Artikel-Info, Status, Lagerort, Letzte Prüfung) bleiben für alle Firmen fix, Zusatzspalten sind rein additiv | Verhindert, dass für eine Firma versehentlich eine wichtige Spalte (z.B. Status) verschwindet; einfacher zu pflegen | 2026-09-21 |
| Keine harte Obergrenze für die Anzahl Zusatzspalten, aber feste Pool-Reihenfolge statt pro Firma frei sortierbar | Konfiguration ist ohnehin nur manuell durch eine Person pflegbar; feste Reihenfolge hält die Umsetzung einfach | 2026-09-21 |
| Konfiguration in eigener, vom Dataverse-Sync unabhängiger Supabase-Tabelle (`portal_firma_einstellungen`), nicht in `dv_firmen` | `dv_firmen` wird vom nächtlichen Sync-Job aus Dataverse überschrieben — eine reine Portal-Einstellung dort würde beim nächsten Sync verloren gehen | 2026-09-21 |
| Spaltenüberschrift für `bmvcc_KundenID` lautet "KundenID" | Nutzerentscheidung im Interview | 2026-09-21 |
| Keine responsive Sonderbehandlung für Zusatzspalten auf Mobile | Gleiches, bereits akzeptiertes Verhalten wie das bestehende PROJ-3 BUG-1 (horizontales Scrollen statt Umbruch) | 2026-09-21 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Neue, eigenständige Supabase-Tabelle `portal_firma_einstellungen` statt Erweiterung von `dv_firmen` | `dv_firmen` wird bei jedem nächtlichen Sync-Lauf komplett aus Dataverse neu geschrieben — eine reine Portal-Einstellung dort würde beim nächsten Sync verloren gehen | 2026-09-22 |
| `bmvcc_KundenID` wird über den bestehenden PROJ-1-Sync-Mechanismus synchronisiert (gleiches Feld-Mapping-Muster wie alle anderen Gerätefelder, z.B. Lagerort/Zubehör) | Konsistent mit der bestehenden Sync-Architektur, keine separate Pipeline oder Sonderbehandlung nötig | 2026-09-22 |
| Zusatzspalten-Logik erweitert die bestehende Geräte-Abfrage-Schicht (`src/lib/geraete/queries.ts`), kein neuer API-Endpoint | Server Components lesen bereits direkt aus Supabase (PROJ-3-Muster); eine zusätzliche Konfigurationsabfrage fügt sich dort nahtlos ein | 2026-09-22 |
| Feste Pool-Reihenfolge der Zusatzspalten wird als Code-Konstante geführt, nicht als Datenbank-Feld | Die Firma-Konfiguration muss nur speichern, WELCHE Spalten aktiv sind, nicht in welcher Reihenfolge — hält die Konfiguration minimal und die Pflege durch OBSI Hofer einfach (nur eine Liste von Keys pro Firma) | 2026-09-22 |
| Unbekannte/ungültige Spalten-Keys aus der Konfiguration werden beim Lesen stillschweigend herausgefiltert, statt einen Fehler zu werfen | Ein Tippfehler beim manuellen Pflegen der Konfiguration darf die gesamte Übersicht nicht unbrauchbar machen (siehe AC "unbekannter Spalten-Key") | 2026-09-22 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponenten-Struktur

```
/uebersicht (bestehende PROJ-3-Seite, erweitert)
├── AppHeader (unverändert)
├── GeraeteFilterBar (unverändert)
└── Geräte-Tabelle (erweitert)
    ├── Standard-Spalten (unverändert, immer sichtbar): Gerät, Status, Lagerort, Letzte Prüfung
    └── NEU: 0–N Zusatzspalten, abhängig von der Firma-Konfiguration
        └── Auswahl + feste Anzeige-Reihenfolge aus dem Pool: Seriennummer, Barcode, KundenID, Zubehör, Bemerkungen, Typ, Dimension
```

Keine neuen Seiten oder Navigationselemente — die Detailseite (`/uebersicht/geraete/[id]`) bleibt wie in PROJ-3 unverändert, da sie bereits alle Felder zeigt.

### Datenmodell (in Textform)

- **Neue Konfigurationsquelle "Firma-Einstellungen":** Pro Firma wird festgehalten, welche Zusatzspalten aktiviert sind (eine Liste von Spalten-Kennungen, z.B. "Seriennummer", "KundenID"). Diese Information lebt in einer eigenen, neuen Ablage in Supabase — komplett getrennt von den Dataverse-synchronisierten Tabellen (`dv_*`) und vom nächtlichen Sync-Job unberührt. Firmen ohne Eintrag gelten automatisch als "keine Zusatzspalten".
- **Erweiterung der Geräte-Daten:** Jedes Gerät bekommt ein zusätzliches Feld "Kunden-Gerätebezeichnung" (Quelle: Dataverse `bmvcc_KundenID`), das genauso wie die bereits vorhandenen Felder (Seriennummer, Barcode, Lagerort, Zubehör, Bemerkungen, Typ, Dimension) beim nächtlichen Sync mitgeführt wird.
- **Zusammenspiel beim Seitenaufruf:** Die Geräte-Übersicht liest wie bisher die Geräteliste der aktuell gewählten Firma (PROJ-2/PROJ-3) und zusätzlich einmalig die Firma-Einstellungen. Aus beidem zusammen ergibt sich die tatsächlich anzuzeigende Spaltenliste: immer die vier Standard-Spalten, plus die für diese Firma aktivierten Zusatzspalten in fester Pool-Reihenfolge. Unbekannte Spalten-Kennungen in der Konfiguration werden dabei ignoriert.

### Technische Entscheidungen (Begründung)
Siehe Decision Log → Technical Decisions oben.

### Abhängigkeiten (Packages)
Keine neuen — nutzt weiterhin die bestehende Supabase-Anbindung und die bereits installierte shadcn-`Table`-Komponente (PROJ-3).

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
