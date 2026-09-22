# PROJ-7: Kundenspezifische Spalten in der Geräte-Übersicht

## Status: Deployed
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

## Implementation Notes (Frontend)

- `Geraet`-Typ (`src/lib/geraete/types.ts`) um `kundenId: string | null` erweitert; `mapGeraetRow` in `src/lib/geraete/queries.ts` setzt das Feld vorerst hart auf `null`, da `bmvcc_KundenID` noch nicht Teil der Supabase-Abfrage/-Tabelle ist — wird erst mit der PROJ-1-Sync-Erweiterung befüllt (`/backend`).
- Neuer Helper `src/lib/geraete/zusatzspalten.ts`: `ZUSATZSPALTEN_POOL` (feste Reihenfolge: Seriennummer, Barcode, KundenID, Zubehör, Bemerkungen, Typ, Dimension) + `resolveZusatzspalten(aktivierteKeys)`, der aus einer Liste aktivierter Keys die anzuzeigenden Spalten in fester Pool-Reihenfolge ableitet — unbekannte Keys werden durch den Filter automatisch ignoriert, Duplikate automatisch dedupliziert (Set-Lookup).
- Neue Mock-Data-Schicht `src/lib/firma-einstellungen/` (`types.ts`, `mock-data.ts`) mit `getFirmaEinstellungen(firmaId)` — liefert testweise zwei aktive Zusatzspalten (Seriennummer, KundenID), ignoriert `firmaId` bewusst wie bei den anderen Features in ihrer jeweiligen Mock-Phase (PROJ-3/4/5). `/backend` ersetzt nur die Funktionsinnereien durch eine echte Abfrage der neuen `portal_firma_einstellungen`-Tabelle, gleiche async Signatur.
- `src/app/(protected)/uebersicht/page.tsx` liest die Firma-Einstellungen zusätzlich zur Geräteliste, löst die Zusatzspalten auf und rendert sie nach den vier Standard-Spalten in Tabellenkopf und -zeilen; fehlender Wert zeigt "—" (gleiche Konvention wie die Standard-Spalten).
- Keine neuen shadcn-Komponenten nötig — nutzt die bestehende `Table`.
- `npx tsc --noEmit`, `npx eslint`, `npx vitest run` (74 Tests, unverändert) und `npm run build` laufen fehlerfrei durch (ein vorbestehender, unabhängiger `tsc`-Fehler in `passkey-list.test.tsx` bleibt unverändert). Manuelle Live-Verifikation mit echtem Login steht noch aus (Nutzer-Review), da sich der Login-Flow wie bei den anderen Features nicht automatisiert durchspielen lässt.
- Noch offen (für `/backend`): echte Supabase-Tabelle `portal_firma_einstellungen` + Abfrage, PROJ-1-Sync-Erweiterung für `bmvcc_KundenID` inkl. Migration.

## Implementation Notes (Backend)

- Neue Migration `supabase/migrations/0005_geraete_kunden_id.sql`: fügt `kunden_id text` zu `dv_geraete` hinzu (rein additiv, gleiches Muster wie `0003`/`0004`).
- Neue Migration `supabase/migrations/0006_portal_firma_einstellungen.sql`: neue Tabelle `portal_firma_einstellungen` (`firma_id text primary key`, `zusatzspalten text[]`, `updated_at`), bewusst ohne Fremdschlüssel zu `dv_firmen` (gleiche "loose reference"-Begründung wie Migration `0002`) und komplett unabhängig von den `dv_*`-Sync-Tabellen. RLS aktiviert, **keine** Policies für `anon`/`authenticated` — exakt dieselbe Deny-all-Konvention wie bei allen `dv_*`-Tabellen (nur der Service-Role-Key liest/schreibt, serverseitig). Die Tabelle wird ausschliesslich manuell durch OBSI Hofer direkt in Supabase gepflegt, kein Schreibpfad im Code.
- `bmvcc_KundenID` (Dataverse-LogicalName: `bmvcc_kundenid`, alles klein wie bei allen anderen Feldern, siehe Hinweis in `jobs.ts`) neu in den `geraete`-Sync-Job aufgenommen (`select` + `map` in `src/lib/sync/jobs.ts`) und im Zod-Schema (`src/lib/sync/entities.ts`) ergänzt — gleicher Mechanismus wie jedes andere Gerätefeld, keine Sonderbehandlung nötig.
- `src/lib/geraete/queries.ts`: `kunden_id` zu beiden `.select(...)`-Spaltenlisten (`getGeraeteList`, `getGeraetById`) ergänzt; `mapGeraetRow` liefert jetzt den echten Wert (`row.kunden_id`) statt des Frontend-Platzhalters `null`.
- Mock-Data-Schicht `src/lib/firma-einstellungen/mock-data.ts` durch echte Abfrage `src/lib/firma-einstellungen/queries.ts` ersetzt (`getFirmaEinstellungen`, gleiche async Signatur) — liest `portal_firma_einstellungen` per `firma_id`, Firma ohne Eintrag liefert `{ zusatzspalten: [] }` (kein Fehler). Aufrufende Seite (`uebersicht/page.tsx`) musste nur den Import-Pfad ändern.
- Kein neuer API-Endpoint — Server Component liest weiterhin direkt über `getSupabaseAdmin()`, konsistent mit PROJ-3/4/5.
- 4 neue Tests: 2 in `src/lib/firma-einstellungen/queries.test.ts` (Firma mit/ohne Konfigurationseintrag), 2 zusätzliche Assertions in `src/lib/geraete/queries.test.ts` (`kundenId`-Mapping in `getGeraeteList` und `getGeraetById`) — insgesamt 78 Tests grün.
- `npx tsc --noEmit`, `npx eslint`, `npx vitest run` und `npm run build` laufen fehlerfrei durch (der vorbestehende, unabhängige `tsc`-Fehler in `passkey-list.test.tsx` bleibt unverändert).
- **Nachträglich behoben (2026-09-22, Live-Fund nach Migration):** Die Geräte-Detailseite (`uebersicht/geraete/[id]/page.tsx`) zeigt Felder fest verdrahtet statt dynamisch aus einem Pool (anders als die Übersicht-Tabelle) — die ursprüngliche Out-of-Scope-Annahme "zeigt bereits alle verfügbaren Felder" traf auf `kundenId` als neues Feld nicht zu, es fehlte schlicht. Ergänzt als eigenes `Field` neben Seriennummer/Barcode.
- **Korrektur, revidiert Out-of-Scope-Entscheid (2026-09-22, Nutzerfund):** Die KundenID-Kachel auf der Detailseite unconditional anzuzeigen war falsch — `kunden_id` wird für **alle** Geräte synchronisiert, unabhängig von der Firma-Konfiguration, wodurch auch Kunden ohne aktivierte "kundenId"-Zusatzspalte das Feld sahen (mit echtem Wert, falls in Dataverse gesetzt). Jetzt liest die Detailseite ebenfalls `getFirmaEinstellungen` (gleiches defensives Fail-open wie auf der Übersicht: Fehler beim Laden blendet KundenID einfach aus statt die Seite abstürzen zu lassen) und zeigt die Kachel nur, wenn `"kundenId"` in der Firma-Konfiguration aktiviert ist. Betrifft nur dieses eine, komplett neue Feld — die bereits vor PROJ-7 bestehenden Detailfelder (Seriennummer, Barcode, Zubehör, Typ, Dimension, Bemerkungen) bleiben bewusst unconditional wie zuvor.
- **Wichtig, noch offen:** Die beiden neuen Migrationen sind als SQL-Dateien im Repo bereit, aber noch **nicht** gegen die echte Supabase-Instanz ausgeführt — das übernimmt der Nutzer manuell über den Supabase SQL Editor (gleiches Vorgehen wie bei den bisherigen Migrationen). Erst danach befüllt der nächste nächtliche Sync-Lauf (03:00 Uhr) `kunden_id` für alle Geräte; die Zusatzspalten-Konfiguration pro Firma muss der Nutzer ebenfalls manuell in `portal_firma_einstellungen` eintragen, damit Kunden tatsächlich Zusatzspalten sehen.

## QA Test Results

**Tested:** 2026-09-22
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)

> Hinweis: Wie bei allen bisherigen Features lässt sich der echte Login nicht automatisiert/wiederholbar durchspielen. Die Zusatzspalten-Logik selbst (Pool-Reihenfolge, Deduplizierung, unbekannte Keys, Firma-Isolation) ist vollständig über Vitest-Integrations-/Unit-Tests abgedeckt; die tatsächliche Anzeige in der Übersicht wurde vom Nutzer während Frontend-/Backend-Phase live gegen echte Daten bestätigt (mehrere Live-Fund-Bugfixes bereits eingearbeitet, siehe Implementation Notes: Detailseite-KundenID fehlte, dann unconditional statt firma-gated — beides behoben und hier erneut verifiziert).

### Acceptance Criteria Status

#### AC-1: Keine Zusatzspalten konfiguriert → nur Standard-Spalten
- [x] `zusatzspalten.test.ts` ("returns an empty list for a Firma with no configured Zusatzspalten") + `firma-einstellungen/queries.test.ts` ("returns an empty list for a Firma without a configuration entry") + Code-Review (`uebersicht/page.tsx` rendert bei leerem Array keine Zusatzspalten)

#### AC-2: Mindestens eine Zusatzspalte konfiguriert → erscheint zusätzlich
- [x] `zusatzspalten.test.ts` ("returns only the configured columns") + `firma-einstellungen/queries.test.ts` ("returns configured Zusatzspalten for a Firma with an entry")

#### AC-3: Mehrere Zusatzspalten → feste Pool-Reihenfolge unabhängig von Konfigurationsreihenfolge
- [x] Neuer Test `zusatzspalten.test.ts` ("always returns columns in the fixed pool order, regardless of config order") — Konfiguration absichtlich in falscher Reihenfolge übergeben, Ergebnis prüft die korrekte Pool-Reihenfolge

#### AC-4: Kein Wert für ein Gerät → Zelle zeigt "—"
- [x] `zusatzspalten.test.ts` (getValue liefert `null` bei fehlendem Wert) + Code-Review (`{spalte.getValue(geraet) ?? "—"}` in `uebersicht/page.tsx`)

#### AC-5: Unbekannter/ungültiger Spalten-Key → wird ignoriert, kein Fehler
- [x] `zusatzspalten.test.ts` ("silently ignores unknown/invalid keys instead of throwing")

#### AC-6: Firma-Wechsel zeigt Zusatzspalten der neu gewählten Firma
- [x] Code-Review: `getFirmaEinstellungen(currentFirmaId)` wird bei jedem Seitenaufruf frisch aufgelöst (Server Component, kein Caching) — identisches Muster wie die bereits in PROJ-3 auditierte Geräteliste, die pro Firma-Wechsel ebenfalls neu lädt

#### AC-7: Spaltenüberschrift für `bmvcc_KundenID` lautet "KundenID"
- [x] `zusatzspalten.test.ts` ("labels the KundenID column exactly KundenID")

### Zusätzlich verifiziert (nach dem ursprünglichen Interview ergänzte Funktionalität)
- **KundenID auf der Geräte-Detailseite:** Nur sichtbar, wenn die Firma "kundenId" aktiviert hat — Code-Review (`zeigtKundenId`-Check in `geraete/[id]/page.tsx`), inkl. Fail-open bei Ladefehler
- **KundenID in der Freitextsuche:** Nur durchsucht, wenn die Firma "kundenId" aktiviert hat — `geraete/queries.test.ts` ("only searches KundenID when sucheKundenId is set")
- **"Zu prüfen"-Kachel-Link (Dashboard → Übersicht):** `geraete/queries.test.ts` ("filters by zuPruefen: never inspected or inspected over 360 days ago (matches the Dashboard-Kennzahl)") — nutzt denselben geteilten Cutoff-Helper wie die Dashboard-Kennzahl, garantiert identische Definition von "zu prüfen"

### Edge Cases Status

#### EC-1: Firma ganz ohne Konfigurationseintrag
- [x] `firma-einstellungen/queries.test.ts` — identisch zu AC-1 behandelt

#### EC-2: Konfiguration enthält denselben Spalten-Key mehrfach
- [x] `zusatzspalten.test.ts` ("deduplicates a key listed more than once in the config")

#### EC-3: Sehr lange Werte auf schmalem Viewport
- [x] Bewusst nicht getestet — Out of Scope laut Spec, identisches (bekanntes, akzeptiertes) Verhalten wie PROJ-3 BUG-1

#### EC-4: `bmvcc_KundenID` ist Freitext ohne Validierung
- [x] Code-Review: Kein Validierungs-/Normalisierungscode an irgendeiner Stelle der Pipeline (Sync, Query, Anzeige) — Wert wird unverändert durchgereicht

#### EC-5: Gerät ohne Artikel, Typ/Dimension konfiguriert
- [x] `zusatzspalten.test.ts` deckt das generische "kein Wert → null"-Verhalten ab, das für alle Pool-Felder inkl. `artikelTyp`/`artikelDimension` identisch implementiert ist (`getValue` liest jeweils direkt vom `Geraet`-Objekt)

### Security Audit Results
- [x] Authentication: Neuer Query-Parameter `zuPruefen` auf `/uebersicht` umgeht die Session-Prüfung nicht (neuer Playwright-Test `tests/PROJ-7-kundenspezifische-spalten.spec.ts`, analog zum bestehenden PROJ-3-Test für status/suche/seite)
- [x] Autorisierung/Firma-Isolation: `getFirmaEinstellungen` wird ausschliesslich mit der session-abgeleiteten `currentFirmaId` aufgerufen (`getCurrentFirmaId()`), nie mit einem URL-Parameter — keine neue Angriffsfläche
- [x] RLS: `portal_firma_einstellungen` hat RLS aktiviert und **keine** Policies für `anon`/`authenticated` (Migration `0006`) — exakt dieselbe Deny-all-Konvention wie alle `dv_*`-Tabellen, nur der Service-Role-Key liest/schreibt serverseitig
- [x] Keine Secrets im Client-Code: Per Grep bestätigt, dass `getSupabaseAdmin`/`firma-einstellungen`-Queries von keiner `"use client"`-Datei importiert werden
- [x] Injection: Freitextsuche über `kunden_id` nutzt dieselbe bereits auditierte `escapeOrListValue`-Escaping-Funktion wie Seriennummer/Barcode/Lagerort — kein neuer Injection-Vektor über die Suche
- [x] Konfigurationsintegrität: `resolveZusatzspalten` matcht ausschliesslich exakt gegen den hart codierten Pool (Set-Lookup) — selbst eine fehlerhafte/manipulierte Konfiguration in `portal_firma_einstellungen` kann keine beliebigen Felder oder Inhalte ausgeben, nur die 7 bekannten Pool-Spalten
- [x] XSS: `kunden_id` wird ausschliesslich über JSX-Textinterpolation ausgegeben (React escaped automatisch), kein `dangerouslySetInnerHTML` im gesamten Feature — auch bei böswilligem Freitext in Dataverse unkritisch
- [x] Rate-Limiting: Kein neuer API-Endpoint — gleiches Risikoprofil wie die bereits auditierte PROJ-3-Übersicht

### Bugs Found
Keine offenen Bugs. Alle während der Implementierungsphase live gefundenen Probleme (Dashboard-`fetch failed` bei vielen Geräten, fehlende/dann unconditional KundenID auf der Detailseite, Middleware blockierte Cron-Requests) wurden bereits behoben und sind in den jeweiligen Implementation Notes bzw. den betroffenen Feature-Specs (PROJ-1, PROJ-5) dokumentiert.

Eine Lücke wurde in dieser QA-Runde geschlossen: `resolveZusatzspalten` (zentrale Logik für Pool-Reihenfolge, Deduplizierung, unbekannte Keys) hatte bisher keine eigene Testdatei — neu `src/lib/geraete/zusatzspalten.test.ts` mit 8 Tests ergänzt, die AC-3/AC-4/AC-5/AC-7 und EC-2/EC-5 direkt abdecken.

### Automatisierte Tests
- **Unit-/Integrationstests (Vitest):** 92/92 grün gesamt (8 neu in `zusatzspalten.test.ts`, plus die in Frontend-/Backend-Phase bereits ergänzten Tests in `firma-einstellungen/queries.test.ts` und `geraete/queries.test.ts`)
- **E2E-Tests (Playwright):** 26/26 grün gesamt (24 unverändert + 2 neu in `tests/PROJ-7-kundenspezifische-spalten.spec.ts` für Chromium + Mobile Safari)
- **Regression:** Alle bisherigen PROJ-1/2/3/4/5/6-Tests weiterhin grün — keine Regressionen durch PROJ-7. `npx tsc --noEmit`, `npm run lint` und `npm run build` laufen vollständig fehlerfrei (der zuvor bestehende, unabhängige `tsc`-Fehler in `passkey-list.test.tsx` wurde ausserhalb dieser QA-Runde bereits behoben)

### Summary
- **Acceptance Criteria:** 7/7 abgedeckt (davon 5 direkt durch neue/bestehende Unit-Tests, 2 durch Code-Review — Firma-Wechsel-Verhalten ist architektonisch garantiert, kein dedizierter Test nötig)
- **Bugs Found:** 0 offene Bugs (mehrere Live-Funde während der Implementierung bereits behoben, siehe oben)
- **Security:** Solide — Firma-Isolation ausschliesslich über die Session, RLS deny-all auf der neuen Tabelle, kein neuer Injection-/XSS-Vektor, keine Secrets im Client-Code
- **Production Ready:** JA
- **Recommendation:** Status auf "Approved" setzen. Vor dem eigentlichen Live-Nutzen durch Kunden müssen die beiden Migrationen (`0005`, `0006`) sowie mindestens ein `portal_firma_einstellungen`-Eintrag in der echten Datenbank vorhanden sein (laut Nutzer bereits erledigt) und der Dataverse-Sync muss `kunden_id` erfolgreich befüllen (abhängig vom separat verfolgten PROJ-1-Zugangsdaten-Problem, nicht Teil dieses Features).

## Deployment
- **Production URL:** https://obsi-hoferkundenportal.vercel.app
- **Deployed:** 2026-09-22 (jeder Commit ab `a5985d0` deployt automatisch via Vercel bei Push auf `main`; die letzten PROJ-7-bezogenen Commits liefen bereits vor diesem `/deploy`-Schritt live)
- **Verifiziert:** Nutzer hat während der Frontend-/Backend-/Refinement-Phase live gegen Production getestet — Migrationen `0005`–`0007` im Supabase SQL Editor ausgeführt, `portal_firma_einstellungen`-Eintrag über die Referenz-Query gesetzt, Zusatzspalten (inkl. KundenID) in der Übersicht und auf der Detailseite bestätigt, Suche über KundenID und der "Zu prüfen"-Kachel-Link bestätigt ("perfekt", mehrfach). Deployment-Log frei von Warnungen (`allowScripts` für `sharp`/`unrs-resolver` behoben).
- **Bekannte, separat verfolgte Restabhängigkeit:** Der Dataverse-Sync (PROJ-1) muss zuverlässig laufen, damit `kunden_id` für alle Geräte befüllt wird — manueller Cron-Trigger hat funktioniert, der erste automatische Lauf (03:00 Uhr) steht zum Zeitpunkt dieses Deploys noch aus (Nutzer beobachtet das separat).
