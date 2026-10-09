# PROJ-3: Geräte-Übersicht

## Status: In Progress
**Created:** 2026-09-17
**Last Updated:** 2026-10-09 (Refinements: Spalte „Bemerkung Prüfung“; Standort-Filter und -Spalte)

## Dependencies
- Requires: PROJ-1 (Dataverse-Sync-Service) — liefert die Geräte-, Standort- und Firmen-Daten
- Requires: PROJ-2 (Kunden-Login) — liefert die aktuell ausgewählte Firma, auf die die Geräteliste eingeschränkt wird
- Betrifft (Nachtrag 2026-10-09): PROJ-7 (Zusatzspalte „Bemerkungen“ wird umbenannt in „Bemerkungen Gerät“), PROJ-8 (CSV-Export erhält die neue Spalte)
- Requires (Nachtrag 2 2026-10-09): PROJ-15 (Portal-Zugang pro Standort) — liefert die Standorte, die ein Kunde innerhalb der Firma sieht; PROJ-8 (CSV-Export übernimmt den neuen Filter)

## User Stories
- Als Kunde möchte ich alle Geräte meiner Firma in einer Liste sehen, damit ich einen Überblick über deren Status habe.
- Als Kunde möchte ich die Liste nach Status filtern können, damit ich schnell Geräte mit Handlungsbedarf finde.
- Als Kunde möchte ich nach Gerätename oder Seriennummer suchen können, damit ich ein bestimmtes Gerät schnell finde.
- Als Kunde möchte ich auf ein Gerät klicken können, um alle verfügbaren Details zu sehen.
- Als Kunde einer Firma ohne Geräte möchte ich eine klare Meldung sehen, statt einer leeren oder verwirrenden Seite.
- Als Kunde möchte ich in der Übersicht direkt die Bemerkung aus der letzten Prüfung jedes Geräts sehen, damit ich Hinweise des Prüfers (z. B. Mängel) erkenne, ohne jedes Gerät einzeln zu öffnen (Nachtrag 2026-10-09).
- Als Kunde mit Zugang zu mehreren Standorten einer Firma möchte ich sehen, an welchem Standort ein Gerät steht, und die Liste auf einen Standort einschränken können, damit ich nicht alle Standorte gemischt durchsehen muss (Nachtrag 2 2026-10-09).

## Out of Scope
- Link zu Prüfberichten pro Gerät — folgt, sobald PROJ-4 (Prüfberichte-Liste) existiert, wird dann per `/refine PROJ-3` oder direkt bei PROJ-4 ergänzt
- Sortierbare Spalten-Header (Klick zum Umsortieren) — nur die eine fest definierte Standard-Sortierung (siehe unten)
- Bearbeiten, Erstellen oder Löschen von Geräten — Portal ist read-only (siehe PRD)
- Dashboard-Kennzahlen ("Anzahl Geräte pro Status" etc.) — siehe PROJ-5
- PDF-Download — siehe PROJ-4
- Anzeige von Geräten mehrerer Firmen gleichzeitig — nur die aktuell in PROJ-2 ausgewählte Firma
- Suche oder Filter nach dem Text der Prüfbericht-Bemerkung (Nachtrag 2026-10-09): Suche bleibt bei Seriennummer, Barcode, Lagerort (und KundenID)
- Bemerkungen älterer Prüfberichte in der Übersicht: nur der aktuelle; ältere stehen auf der Detailseite (PROJ-4)
- Standort-Auswahl beim Login oder im Kopfbereich (wie die Firmen-Auswahl): bewusst nicht, alle freigegebenen Standorte bleiben gemeinsam sichtbar; nur ein Filter in der Übersicht (Nachtrag 2 2026-10-09)
- Standort-Filter auf Dashboard (PROJ-5) und Prüfberichte-Übersicht (PROJ-9/PROJ-10): nicht Teil dieses Nachtrags, bei Bedarf separat

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

**Nachtrag 2026-10-09 — Spalte „Bemerkung Prüfung“:**

- [ ] Angenommen ein Kunde ruft die Geräte-Übersicht auf, wenn die Tabelle angezeigt wird, dann gibt es für alle Firmen eine zusätzliche Spalte „Bemerkung Prüfung“ direkt nach „Letzte Prüfung“
- [ ] Angenommen ein Gerät hat Prüfberichte, wenn die Übersicht angezeigt wird, dann zeigt die Spalte die Bemerkung des aktuellen Prüfberichts (= neuestes Prüfdatum, gelöschte Prüfberichte zählen nicht)
- [ ] Angenommen ein Gerät hat keinen Prüfbericht oder der aktuelle Prüfbericht hat keine Bemerkung, wenn die Übersicht angezeigt wird, dann bleibt die Zelle leer (wie andere fehlende Werte, „—“)
- [ ] Angenommen die Bemerkung ist länger als zwei Zeilen, wenn die Übersicht angezeigt wird, dann wird sie nach zwei Zeilen mit „…“ gekürzt und der volle Text erscheint beim Darüberfahren mit der Maus; auf der Detailseite steht er vollständig
- [ ] Angenommen der Kunde exportiert die Geräte-Übersicht als CSV (PROJ-8), wenn die Datei erzeugt wird, dann enthält sie die Spalte „Bemerkung Prüfung“ direkt nach „Letzte Prüfung“ mit dem vollen, ungekürzten Text (Zeilenumbrüche wie bei anderen Freitextfeldern korrekt maskiert)
- [ ] Angenommen für die Firma ist die Zusatzspalte für die Gerät-Bemerkung eingeschaltet (PROJ-7), wenn Übersicht oder CSV-Export angezeigt bzw. erzeugt werden, dann heisst diese Spalte „Bemerkungen Gerät“ (statt bisher „Bemerkungen“)
- [ ] Angenommen ein Gerät hatte früher zwei Prüfberichte am selben neuesten Prüfdatum (Altdaten, aktuell 269 Geräte), wenn die Übersicht angezeigt wird, dann erscheint genau eine Bemerkung, und zwar jedes Mal dieselbe: bevorzugt die eines Berichts mit Bemerkung

**Nachtrag 2 2026-10-09 — Standort-Filter und Spalte „Standort“:**

- [ ] Angenommen der Kunde sieht in der gewählten Firma mehr als einen Standort (PROJ-15), wenn er die Geräte-Übersicht aufruft, dann gibt es einen Filter „Standort“ (Standard „Alle Standorte“) und eine Spalte „Standort“ direkt vor „Lagerort“
- [ ] Angenommen der Kunde sieht in der gewählten Firma genau einen Standort, wenn er die Übersicht aufruft, dann gibt es weder Filter noch Spalte (Ansicht wie bisher)
- [ ] Angenommen der Kunde wählt einen Standort, wenn die Liste angezeigt wird, dann enthält sie nur Geräte dieses Standorts, kombiniert (UND) mit Status-Filter, Suche und „zu prüfen“; die Seitenzählung beginnt wieder bei Seite 1
- [ ] Angenommen der Filter-Auswahl, wenn sie geöffnet wird, dann listet sie alle Standorte der Firma, für die der Kunde einen Zugang hat, alphabetisch nach Namen (Standorte ohne Namen als „(ohne Namen)“)
- [ ] Angenommen ein Standort ist gewählt, wenn der Kunde die Übersicht als CSV exportiert (PROJ-8), dann enthält der Export nur Geräte dieses Standorts (die Spalte „Standort“ ist im Export schon immer enthalten)
- [ ] Angenommen die Adresse enthält einen Standort, für den der Kunde keinen Zugang hat oder der nicht zur gewählten Firma gehört, wenn die Übersicht oder der Export geladen wird, dann werden keine Geräte dieses Standorts gezeigt (keine Datenfreigabe über die Adresse)
- [ ] Angenommen der Kunde wechselt die Firma, wenn die Übersicht neu lädt, dann ist der Standort-Filter zurückgesetzt (wie die übrigen Filter)

## Edge Cases
- **Standort-Filter (Nachtrag 2):** Ein freigegebener Standort ohne Geräte erscheint trotzdem in der Auswahl; gewählt ergibt er die normale „Keine Ergebnisse“-Meldung
- **Standort-Filter (Nachtrag 2):** Verliert der Kunde den Zugang zum gerade gewählten Standort (Sync), zeigt die Übersicht beim nächsten Aufruf für diesen Wert keine Geräte; die Auswahl bietet ihn nicht mehr an
- **Bemerkung Prüfung (Nachtrag 2026-10-09):** Das Feld „Letzte Prüfung“ stammt vom Gerät, die Bemerkung vom neuesten Prüfbericht. Weichen die beiden Daten in Dataverse voneinander ab, gilt für die Bemerkung immer der neueste Prüfbericht
- **Bemerkung Prüfung, mehrzeilig (aktuell 192 Fälle):** Zeilenumbrüche werden in der Übersicht als Leerzeichen dargestellt (zwei Zeilen Platz), vollständig auf der Detailseite und im CSV
- **Bemerkung Prüfung auf Touch-Geräten:** Ohne Maus gibt es kein Darüberfahren; der volle Text ist auf der Detailseite erreichbar
- **Standort-Einschränkung (PROJ-15):** Die Spalte zeigt nur Bemerkungen von Geräten, die der Kunde ohnehin sieht; keine zusätzliche Datenfreigabe
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
| Neue Standardspalte „Bemerkung Prüfung“ für alle Firmen, nicht als wählbare Zusatzspalte | Nutzerentscheidung (2026-10-09): Hinweise des Prüfers sind für alle Kunden relevant | 2026-10-09 |
| „Aktueller Prüfbericht“ = neuestes Prüfdatum (gelöschte ausgenommen); das Archiv-Kennzeichen wird nicht berücksichtigt | Datenprüfung 2026-10-09: nur 1 von 25'399 Prüfberichten ist archiviert, das Kennzeichen trägt keine Bedeutung | 2026-10-09 |
| Bei mehreren Prüfberichten am selben neuesten Datum genau eine Bemerkung, deterministisch, bevorzugt eine vorhandene | Nutzerentscheidung: künftig ist nur noch ein Prüfbericht pro Tag möglich, die 269 Altfälle brauchen nur eine stabile Regel | 2026-10-09 |
| In der Übersicht auf zwei Zeilen gekürzt, voller Text beim Darüberfahren und auf der Detailseite | Tabelle bleibt kompakt und gleichmässig hoch | 2026-10-09 |
| Zusatzspalte „Bemerkungen“ (Gerät, PROJ-7) wird in „Bemerkungen Gerät“ umbenannt; neue Spalte heisst „Bemerkung Prüfung“ | Zwei verschiedene Bemerkungen dürfen nicht gleich heissen; gleiche Benennung wie im geplanten PDF-Export (PROJ-14) | 2026-10-09 |
| Neue Spalte auch im CSV-Export, ungekürzt, direkt nach „Letzte Prüfung“ | Der Export bildet die Übersicht ab (PROJ-8), Kürzung wäre im Export nur hinderlich | 2026-10-09 |
| Mehrere Standorte einer Firma bleiben gemeinsam sichtbar; neu ein Standort-Filter und eine Spalte „Standort“ in der Übersicht statt einer Standort-Auswahl beim Login | Nutzerentscheidung nach dem ersten Kunden mit zwei Standorten (2026-10-09): kleiner Eingriff, kein zusätzlicher Schritt beim Login | 2026-10-09 |
| Filter und Spalte nur bei mehr als einem sichtbaren Standort | Für die Mehrheit (ein Standort) bleibt die Übersicht unverändert schlank | 2026-10-09 |
| Spalte „Standort“ direkt vor „Lagerort“ | Liest sich als grob → fein; Gerät bleibt erste Spalte (Nutzerentscheidung) | 2026-10-09 |
| Filter wirkt auf den CSV-Export, nicht auf Dashboard und Prüfberichte | Gleiches Prinzip wie bei den übrigen Übersicht-Filtern (PROJ-8); Dashboard/Prüfberichte bei Bedarf separat | 2026-10-09 |

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

### Nachtrag 2026-10-09 — Spalte „Bemerkung Prüfung“ (Tech Design)
- **Daten:** Keine neue Speicherung. Die Bemerkung wird beim Laden der Übersicht bzw. des Exports aus den bereits synchronisierten Prüfberichten ermittelt: pro Gerät der nicht gelöschte Bericht mit dem neuesten Prüfdatum. Nur für die Geräte der angezeigten Seite (Übersicht, max. 25) bzw. der Exportzeilen, blockweise wie bei Prüfberichte-Übersicht und Dashboard
- **Gleicher Tag:** bevorzugt ein Bericht mit nicht-leerer Bemerkung, sonst nach ID; damit jedes Mal dasselbe Ergebnis
- **Anzeige:** neue Spalte nach „Letzte Prüfung“, Text auf zwei Zeilen begrenzt, voller Text als Tooltip (bestehende Mittel, keine neue Komponente nötig)
- **Export:** gleiche Ermittlung, voller Text; Escaping wie alle Freitextfelder (PROJ-8)
- **Umbenennung:** nur die Spaltenbeschriftung der PROJ-7-Zusatzspalte ändert sich; der interne Schlüssel und die Firmen-Einstellungen bleiben gleich, keine Datenmigration
- **Keine neuen Pakete, keine Migration**

### Nachtrag 2 2026-10-09 — Standort-Filter und Spalte (Tech Design)
- **Daten:** keine neue Speicherung. Die Auswahl entsteht aus den Standorten, die die Übersicht ohnehin schon für den Kunden ermittelt (Firma + freigegebene Standorte, PROJ-15) — dieselbe zentrale Stelle, dadurch kann die Auswahl nie mehr anbieten, als der Kunde sehen darf
- **Filter:** neuer Adress-Parameter für den Standort, wie Status/Suche/„zu prüfen“; wird serverseitig nur angewendet, wenn er unter den freigegebenen Standorten der gewählten Firma ist — sonst zeigt die Liste für diesen Wert keine Geräte (nie fremde)
- **Anzeige:** Auswahl in der bestehenden Filterleiste (vorhandene shadcn-Select-Komponente wie beim Status-Filter), Spalte vor „Lagerort“; beides nur bei mehr als einem Standort
- **Export:** der Export-Knopf gibt den Standort-Parameter wie die übrigen Filter weiter; der Export wendet dieselbe Filterlogik an
- **Keine neuen Pakete, keine Migration**

## Implementation Notes (Frontend)

- `/uebersicht` neu gebaut als Server Component: liest `searchParams` (`status`, `suche`, `seite`), löst die aktuell ausgewählte Firma auf (Single-Firma direkt aus der Session, Multi-Firma über das bestehende `obsi_selected_firma`-Cookie, redirect zu `/firmen-auswahl` falls keine gültige Auswahl vorliegt), rendert `AppHeader`, die neue `GeraeteFilterBar` und eine shadcn-`Table` mit Paginierung.
- `GeraeteFilterBar` (`src/components/geraete-filter-bar.tsx`, Client Component) steuert Status-Filter (shadcn `Select`) und Freitextsuche (shadcn `Input` + `Button`) über URL-Suchparameter (`router.push`), damit Zustand beim Neuladen/Teilen erhalten bleibt; jede Filteränderung setzt `seite` zurück.
- Detailseite `/uebersicht/geraete/[id]` neu gebaut: zeigt alle Felder (Seriennummer, Barcode, Standort, Lagerort, Prüfdaten, Artikel/Hersteller/Norm, Zubehör, Bemerkungen), `notFound()` bei unbekannter ID.
- Leer-Zustand, "keine Ergebnisse für Suche"-Zustand und Fehler-Zustand (mit "Erneut versuchen"-Link) sind umgesetzt wie in den Acceptance Criteria beschrieben.
- Datenzugriff ist noch über eine Mock-Data-Schicht (`src/lib/geraete/types.ts`, `src/lib/geraete/mock-data.ts`) realisiert, bewusst mit denselben async Funktionssignaturen (`getGeraeteList(query)`, `getGeraetById(id)`) wie die künftige echte Implementierung — Mock-Daten decken alle vorkommenden Status-Werte inkl. der Gross-/Kleinschreibungs-Inkonsistenz sowie ein nie geprüftes Gerät ab. `/backend` ersetzt nur die Funktionsinnereien (echte zweistufige Supabase-Abfrage), keine Änderungen an den aufrufenden Seiten nötig.
- `npx tsc --noEmit` und `npx vitest run` laufen fehlerfrei durch; manueller Smoke-Test bestätigt, dass `/uebersicht` ohne Session korrekt zu `/login` umleitet (kein Server-Fehler).
- Noch offen (für `/backend`): echte Supabase-Anbindung, serverseitige Firma-Einschränkung über `dv_standorte`/`dv_geraete`, Pagination/Filter direkt in der Datenbankabfrage statt im Speicher.
- **Nachträglich ergänzt (2026-09-17, Nutzerfeedback nach dem Backend-Test):** "Firma wechseln"-Button neben dem Titel, sichtbar nur für Kontakte mit mehr als einer zugeordneten Firma (`session.portal.firmaIds.length > 1`). Nutzt die neue Server Action `changeFirma()` (`firmen-auswahl/actions.ts`, PROJ-2) — löscht das `obsi_selected_firma`-Cookie und leitet zu `/firmen-auswahl` weiter, ohne dass sich der Kunde ab- und wieder anmelden muss.
- **Überholt durch PROJ-5 (2026-09-18):** Der "Firma wechseln"-Button lebt nicht mehr auf `/uebersicht` selbst, sondern wurde in den gemeinsamen `AppHeader` verschoben (siehe PROJ-5 Implementation Notes) — Verhalten unverändert, nur die Position (jetzt im Header neben "Abmelden", auf allen Seiten einheitlich).
- **Nachträglich ergänzt (2026-09-18, `/design`-Nachtrag):** Geräte-Status wird jetzt farblich markiert (Freigabe=Grün, keine Freigabe=Rot, letzte Freigabe=Amber) statt neutralem Text/Grau-Badge, auf der Übersicht-Tabelle und der Detailseite — siehe `docs/design-system.md` Component Conventions und `src/lib/status-badge.ts`.
- **Nachträglich geändert (2026-09-18, Nutzerwunsch):** Die "Gerät"-Spalte in der Übersicht-Tabelle und der Titel auf der Detailseite zeigen jetzt eine kombinierte Artikel-Info statt des Gerätenamens — Formel vom Nutzer vorgegeben: `Modellartikel & " " & ArtikelENNorm & " " & ArtikelTyp & " " & ArtikelDimension & " " & HerstellerName` (= `bezeichnung norm artikeltyp dimension hersteller`, leere Teile werden übersprungen). Neuer shared Helper `src/lib/geraete/artikel-info.ts` (`formatArtikelInfo`), fällt auf den Gerätenamen zurück, wenn kein Artikel verknüpft ist bzw. auf "(ohne Angaben)", wenn auch der Gerätename fehlt. Spaltenkopf bleibt bewusst "Gerät" (Nutzerentscheidung), der Link zur Detailseite bleibt unverändert erhalten. Detailseite zeigt zusätzlich zwei neue Felder "Typ" und "Dimension" in der Detail-Karte.

### Nachtrag 2026-10-09 — Spalte „Bemerkung Prüfung“ (Umsetzung, Frontend + Abfrage in einem Durchgang)
- `src/lib/geraete/queries.ts`: neue Funktion `getAktuellePruefBemerkungen(geraetIds)` — nicht gelöschte Prüfberichte der übergebenen Geräte, in Blöcken à 100 Geräte und seitenweise à 1000 Zeilen (Supabase-Limit); pro Gerät gewinnt das neueste Prüfdatum, bei gleichem Datum ein Bericht mit nicht-leerer Bemerkung, sonst die kleinere ID. Leere/nur-Leerzeichen-Bemerkung → `null`. Wird in `getGeraeteList` (nur für die angezeigte Seite), `getGeraeteExportRows` (alle Exportzeilen) und `getGeraetById` parallel zum Artikel-Lookup aufgerufen. Die Geräte-IDs stammen immer aus den bereits auf Firma + freigegebene Standorte (PROJ-15) eingeschränkten Abfragen
- `src/lib/geraete/types.ts`: neues Feld `pruefBemerkung` (getrennt von `bemerkungen` = Gerät)
- `src/app/(protected)/uebersicht/page.tsx`: neue Spalte „Bemerkung Prüfung“ nach „Letzte Prüfung“; `line-clamp-2`, `max-w-xs`, voller Text im `title`-Attribut (keine neue Komponente; shadcn-Tooltip ist nicht installiert und für einen reinen Hover-Text nicht nötig). Fehlender Wert → „—“
- `src/lib/geraete/export-csv.ts`: Standardspalte „Bemerkung Prüfung“ nach „Letzte Prüfung“, ungekürzt, gleiches Escaping wie alle Freitextfelder
- `src/lib/geraete/zusatzspalten.ts`: Beschriftung der Zusatzspalte `bemerkungen` → „Bemerkungen Gerät“ (Schlüssel unverändert, keine Datenmigration)
- **Tests:** `queries.test.ts` +7 (`getAktuellePruefBemerkungen`: neuestes Datum, gelöschte ignoriert, leere Bemerkung des aktuellen Berichts → null, kein Bericht, gleicher Tag deterministisch mit Vorrang der Bemerkung, mehr als 1000 Zeilen, Befüllung in Liste und Export; Mock um `.is()` erweitert); `export-csv.test.ts` Kopfzeile/Zeile angepasst + Test für ungekürzte, mehrzeilige Bemerkung direkt nach „Letzte Prüfung“; `zusatzspalten.test.ts` Test für „Bemerkungen Gerät“. Gegenprobe: ohne die Vorrangregel bei gleichem Tag schlägt der entsprechende Test fehl (der Test wurde dafür so angelegt, dass die ID-Regel allein nicht reicht)
- `npm test` 228/228, Lint, `tsc --noEmit` und Build grün
- **Nicht lokal im Browser geprüft:** Die Übersicht ist nur mit echtem Login erreichbar; die Darstellung wird beim Deploy live geprüft

### Nachtrag 2 2026-10-09 — Standort-Filter und Spalte (Umsetzung)
- `src/lib/geraete/queries.ts`: `getGeraeteList` liefert zusätzlich `standortOptions` (alle freigegebenen Standorte der Firma aus `getStandorteFuerFirma(scope)`, alphabetisch, leere Namen „(ohne Namen)“); optionaler `standortId` in `GeraeteQuery` schränkt Liste und `getGeraeteExportRows` auf diesen Standort ein — nur wenn er unter den freigegebenen ist, sonst leere Menge (manipulierte Adresse zeigt nichts). Status-Optionen beziehen sich auf den gefilterten Bereich
- `src/lib/geraete/types.ts`: `standortId` in `GeraeteQuery`, `StandortOption`, `standortOptions` in `GeraeteResult`
- `src/components/geraete-filter-bar.tsx`: zusätzliches shadcn-`Select` „Alle Standorte“/Standort (nur wenn Optionen übergeben werden), Adress-Parameter `standort`, Filterwechsel setzt die Seite zurück
- `src/app/(protected)/uebersicht/page.tsx`: Filter und Spalte „Standort“ (vor „Lagerort“) nur bei mehr als einem Standort; Export-Knopf gibt `standort` weiter; Leermeldung berücksichtigt den Filter
- `src/app/api/uebersicht/export/route.ts`: liest `standort` und gibt ihn an den Export weiter
- **Tests:** `queries.test.ts` +6 (Optionen alphabetisch ohne fremde Firma, Einschränkung bei vollständigen Optionen, manipulierte Adresse/fremde Firma → leer, UND-Verknüpfung, Export, „(ohne Namen)“); bestehender Leer-Test um `standortOptions` ergänzt; Export-Routen-Test für die Weitergabe. Gegenprobe: ohne die Einschränkung schlagen 4 Filter-Tests fehl
- `npm test` 251/251, Lint, `tsc --noEmit` und Build grün
- **Nicht lokal im Browser geprüft** (nur mit echtem Login erreichbar) — Live-Prüfung beim Deploy; Testkontakt hat bereits zwei Standorte bei Cloudcab GmbH

## Implementation Notes (Backend)

- `src/lib/geraete/queries.ts` ersetzt die Mock-Data-Schicht mit echten Supabase-Abfragen; `getGeraeteList`/`getGeraetById` haben jetzt zusätzlich einen expliziten `firmaId`-Parameter (in der Mock-Phase gab es nur einen globalen Datensatz, daher kein Firma-Parameter nötig — musste für die echte Firma-Einschränkung ergänzt werden).
- Zweistufige Abfrage wie in der Architektur festgelegt: erst `dv_standorte` nach `firma_id`, dann `dv_geraete` nach den gefundenen Standort-IDs (kein PostgREST-Embedding wegen fehlender Fremdschlüssel seit PROJ-1 BUG-1).
- Status-Filter-Optionen werden über alle (ungefilterten) Geräte der Firma ermittelt und case-insensitiv depupliziert; Sortierung der Optionen jetzt locale-aware (`localeCompare` mit `sensitivity: "base"`) statt des ursprünglichen case-sensitiven `Array.sort()`, das Gross-/Kleinschreibung falsch einordnete (z.B. "keine Freigabe" nach "Letzte Freigabe" statt alphabetisch).
- Freitextsuche über Gerätename/Seriennummer läuft über `.or()` mit `ilike`; Kommas und Klammern im Suchbegriff werden escaped, da PostgREST `.or()` diese sonst als Trennzeichen der Filterliste fehlinterpretiert.
- Paginierung und Sortierung (`letzte_pruefung` absteigend, nie geprüfte Geräte zuerst via `nullsFirst`) laufen direkt in der Datenbankabfrage (`range`/`order`), nicht mehr im Speicher wie in der Mock-Version.
- **Sicherheitsrelevant:** `getGeraetById` prüft bei jedem Aufruf, dass der Standort des gefundenen Geräts tatsächlich zur übergebenen `firmaId` gehört — eine Geräte-ID, die zu einer anderen Firma gehört, liefert `null` (identisch zu "unbekannte ID"), damit ein Kunde nicht durch Erraten von IDs in der URL Geräte anderer Kunden sehen kann (IDOR-Schutz, da RLS auf `dv_geraete` alle Zugriffe ausser Service-Role verweigert).
- Neuer gemeinsamer Helper `src/lib/auth/current-firma.ts` (`getCurrentFirmaId()`) löst die aktuell gewählte Firma auf (Einzel-Firma direkt aus der Session, Mehrfach-Firma über das PROJ-2-Cookie, redirect zu `/firmen-auswahl` sonst) und wird jetzt von **beiden** Seiten (`/uebersicht` und `/uebersicht/geraete/[id]`) verwendet. Das hat einen Lücke aus der Frontend-Phase geschlossen: die Detailseite hatte zuvor gar keine Firma-Prüfung, wodurch (mit der reinen Mock-Implementierung) rein technisch keine Kunden-Trennung bestand — mit den echten Daten wäre das ein Zugriffs-Bug gewesen.
- Kein separater API-Endpoint (`src/app/api/...`) nötig — Server Components lesen direkt über `src/lib/supabase-admin.ts`, wie in der Architektur festgelegt.
- Integrationstests in `src/lib/geraete/queries.test.ts` (11 Tests) mit demselben Fluent-Mock-Muster wie `src/lib/auth/access.test.ts`, decken u.a. ab: Firma-Isolation, leere Standort-Liste, Status-/Suche-Filter, Sortierung mit nie-geprüften Geräten zuerst, und die drei "kein Zugriff"-Fälle von `getGeraetById` (fremde Firma, unbekannte ID, Gerät ohne Standort).
- `npx tsc --noEmit` und `npx vitest run` (36 Tests total) laufen fehlerfrei durch; manueller Smoke-Test bestätigt weiterhin keinen Server-Fehler auf `/uebersicht` ohne Session. Echter End-to-End-Test mit dem vorhandenen Test-Kontakt (`test-kontakt-robert-1`) steht noch aus (Nutzer-Review).
- **Nachträglich ergänzt (2026-09-18, Artikel-Info statt Gerätename):** PROJ-1-Ergänzung zuerst umgesetzt (additiv): Migration `supabase/migrations/0004_artikel_dimension.sql` fügt `dimension` zu `dv_artikel` hinzu, gemappt von `bmvcc_dimensions` (`src/lib/sync/entities.ts`, `src/lib/sync/jobs.ts`). `Geraet`-Typ um `artikelTyp`/`artikelDimension` erweitert; `getGeraetById` lädt diese zusätzlich mit. `getGeraeteList` musste die bisherige "kein Artikel-Lookup für die Liste"-Optimierung aufgeben — lädt jetzt die Artikel-Daten für die aktuelle Seite als eine Batch-Abfrage über die distinct Artikel-IDs (`getArtikelMapFuerIds`, max. 25 IDs pro Seite), kein Lookup pro Zeile. 6 neue/aktualisierte Tests (`artikel-info.test.ts` neu, ein `queries.test.ts`-Test auf das neue Verhalten angepasst) — insgesamt 58 Tests grün.
- **Korrektur (2026-09-18):** "Modellartikel" ist entgegen der ursprünglichen Annahme *nicht* dasselbe Feld wie `bezeichnung`/`bmvcc_articlename` — es ist `bmvcc_modelarticle`, ein bisher gar nicht synchronisiertes Feld. Statt eines neuen Feldes wird die bestehende Spalte `dv_artikel.bezeichnung` jetzt aus `bmvcc_modelarticle` befüllt (Sync-Job in `src/lib/sync/jobs.ts` angepasst, `bmvcc_articlename` entfernt) — keine neue Migration nötig, betrifft aber jede Stelle, die `artikelBezeichnung` anzeigt (auch das "Artikel"-Feld auf der Detailseite, auf Nutzerwunsch). Ein erneuter Sync-Lauf ist nötig, damit `bezeichnung` mit den echten `bmvcc_modelarticle`-Werten befüllt wird.
- **Nachträglich geändert (2026-09-18, Nutzerwunsch):** Spalte "Standort" in der Übersicht-Tabelle ersetzt durch "Lagerort" (`geraet.lagerort`, aus `bmvcc_lagerort`) — dieses Feld war bereits seit PROJ-1 vollständig synchronisiert (Schema, Migration, Sync-Job), nur bisher nicht in der Übersicht-Tabelle angezeigt (nur auf der Detailseite). Reine Frontend-Änderung, keine Backend-/Sync-Arbeit nötig.
- **Nachträglich geändert (2026-09-18, Nutzerwunsch):** Freitextsuche durchsucht nicht mehr den Gerätenamen — stattdessen Seriennummer, Barcode und Lagerort (`.or()`-Filter in `getGeraeteList` angepasst; Placeholder-Text in `GeraeteFilterBar` aktualisiert auf "Suche nach Seriennummer, Barcode oder Lagerort…"). Passt zur PROJ-3-Refinement-Änderung, dass die "Gerät"-Spalte jetzt Artikel-Info statt Gerätename zeigt — eine Suche nach dem (nicht mehr angezeigten) Gerätenamen wäre für Kunden verwirrend gewesen. Betroffene Tests in `queries.test.ts` aktualisiert (inkl. neuem Test, dass eine Namenssuche jetzt keine Treffer mehr liefert) — 59 Tests grün.
- **Nachträglich ergänzt (2026-09-22, Nutzerwunsch, im Rahmen von PROJ-7):** Neuer Filter `zuPruefen` (`GeraeteQuery`) — Geräte, die nie geprüft wurden oder deren letzte Prüfung mehr als 360 Tage zurückliegt (`.or("letzte_pruefung.is.null,letzte_pruefung.lt.<cutoff>")`, UND-verknüpft mit Status/Suche wie gehabt), aufrufbar über `/uebersicht?zuPruefen=1`. Die 360-Tage-Grenzwertlogik wurde aus `dashboard/queries.ts` (PROJ-5) in den geteilten Helper `src/lib/geraete/zu-pruefen.ts` verschoben, damit Dashboard-Kennzahl und Übersicht-Filter garantiert dieselbe Definition von "zu prüfen" verwenden — siehe PROJ-5 Implementation Notes für die verlinkte Dashboard-Kachel. 1 neuer Integrationstest (nie geprüft + überfällig matchen, aktuell geprüft nicht) — 79 Tests grün. Kein UI-Element in `GeraeteFilterBar` dafür — der Filter ist bewusst nur über den Dashboard-Link erreichbar, analog zu den Status-Kacheln, die den Status-Dropdown auch nur vorbefüllen statt einen eigenen Kachel-Bereich zu brauchen.
- **Nachträglich ergänzt (2026-09-22, Nutzerwunsch, im Rahmen von PROJ-7):** Freitextsuche durchsucht jetzt optional auch `kunden_id` — aber nur, wenn die Firma die Zusatzspalte "kundenId" aktiviert hat (`sucheKundenId`-Flag in `GeraeteQuery`, in `uebersicht/page.tsx` aus den bereits aufgelösten `zusatzspalten` abgeleitet). Bewusst so gegated, da eine Suche über ein für die Firma unsichtbares Feld nur verwirren würde. `GeraeteFilterBar` bekommt das Flag als Prop und passt den Placeholder-Text entsprechend an ("… oder KundenID…"). 1 neuer Test (Suche nach KundenID ohne Flag → kein Treffer, mit Flag → Treffer) — 80 Tests grün.

## QA Test Results

**Tested:** 2026-09-17
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)

> Hinweis: Wie schon bei PROJ-2 lässt sich der echte Entra-External-ID-Login nicht automatisiert/wiederholbar durchspielen (dafür bräuchte es einen dauerhaften echten Kundenzugang). Was ohne echten Login automatisiert prüfbar ist — Routen-Schutz, Daten-/Filter-/Sortier-/Paginierungslogik, Autorisierung — wurde automatisiert getestet (Vitest-Integrationstests gegen die echte Query-Logik, Playwright für den Routen-Schutz). Die tatsächlich angezeigten Inhalte (Geräteliste, Filter, Detailseite, "Firma wechseln") wurden vom Nutzer während der Backend-Phase live mit dem Test-Kontakt `test-kontakt-robert-1` gegen echte Daten geprüft und als funktionierend bestätigt (siehe Chat-Verlauf 2026-09-17).

### Acceptance Criteria Status

#### AC-1: Geräteliste zeigt Gerätename, Status, Standort, Datum letzte Prüfung für die Firma
- [x] Verifiziert durch Integrationstest (`getGeraeteList` gibt nur Geräte der Standorte der übergebenen Firma zurück) + live vom Nutzer bestätigt

#### AC-2: Leermeldung bei Firma ohne Geräte
- [x] Datenlayer verifiziert (Firma ohne Standorte → `total: 0`, `items: []`); UI-Zweig für die Leermeldung durch Code-Review bestätigt (kein automatisierter Render-Test ohne echten Login möglich)

#### AC-3: Status-Filter zeigt nur passende Geräte
- [x] Integrationstest grün (case-insensitive exakter Match)

#### AC-4: Freitextsuche nach Gerätename/Seriennummer
- [x] Integrationstest grün (beide Felder geprüft)

#### AC-5: Status-Filter UND Suchbegriff kombiniert (UND-Verknüpfung)
- [x] Neuer Integrationstest in dieser QA-Runde ergänzt (`combines status filter and search term with AND`) — grün; deckt sowohl "nur ein Kriterium passt → kein Treffer" als auch "beide passen → Treffer" ab

#### AC-6: Paginierung bei mehr als 25 Geräten
- [x] Neuer Integrationstest mit 30 simulierten Geräten ergänzt — Seite 1: 25 Einträge, Seite 2: 5 Einträge, `total: 30`, keine Überschneidung/Lücke zwischen den Seiten

#### AC-7: Detailseite zeigt alle verfügbaren Felder
- [x] Feld-für-Feld-Abgleich zwischen `getGeraetById`-Rückgabe und Detailseiten-JSX durch Code-Review; Zugriffskontrolle durch 3 Integrationstests abgedeckt (fremde Firma, unbekannte ID, Gerät ohne Standort); Rendering live vom Nutzer bestätigt

#### AC-8: Standard-Sortierung (neueste Prüfung zuerst, nie geprüft ganz oben)
- [x] Integrationstest grün

#### AC-9: Fehler-Zustand mit "Erneut versuchen", Header/Abmelden bleiben nutzbar
- [x] Code-Review bestätigt: `<AppHeader />` wird ausserhalb des try/catch-Zweigs gerendert, ist im Fehlerfall also immer vorhanden. Ein echter Datenbank-Ausfall wurde nicht künstlich provoziert (gleiche Konvention wie bei PROJ-1/2: kein mutwilliges Lahmlegen der Produktions-Supabase-Instanz)

### Edge Cases Status

#### EC-1: Gerät ohne Standort
- [x] Integrationstest `getGeraetById` → `null` bei fehlendem Standort

#### EC-2: Freitext-Statuswerte, dynamische Filter-Optionen
- [x] Integrationstest: case-insensitive Deduplizierung über alle Geräte der Firma; Sortierung der Optionen zusätzlich verbessert (siehe BUG-1 unten aus der Backend-Phase, bereits behoben)

#### EC-3: Firma-Wechsel setzt Filter/Suche zurück
- [x] Code-Review: sowohl `selectFirma` als auch der neue `changeFirma` redirecten auf bare Pfade (`/uebersicht` bzw. `/firmen-auswahl`) ohne Query-Parameter — Filter/Suche sind danach zwingend zurückgesetzt

#### EC-4: Sehr lange Gerätenamen/Bemerkungen/Standortnamen in der Tabelle
- [ ] **BUG-1 gefunden** (siehe unten) — Spec verspricht "werden gekürzt", tatsächlich nur horizontales Scrollen über die shadcn-Table-Standardkomponente

#### EC-5: Suchbegriff ohne Treffer
- [x] Code-Review + Integrationstests (Suchbegriffe ohne Match liefern ein leeres Array) bestätigen die Grundlage für die eigene "Keine Ergebnisse für..."-Meldung

### Security Audit Results
- [x] Authentication: Beide neuen PROJ-3-Routen ohne Session → Redirect zu `/login` (2 neue Playwright-Tests, inkl. Test, dass Filter-/Suche-/Seite-Query-Parameter den Session-Check nicht umgehen)
- [x] Autorisierung/IDOR: `getGeraetById` verweigert den Zugriff auf ein Gerät, dessen Standort zu einer anderen Firma gehört — liefert `null`, identisch zum "unbekannte ID"-Fall (3 Integrationstests: fremde Firma, unbekannte ID, kein Standort)
- [x] Cookie-Manipulation: `getCurrentFirmaId` validiert den `obsi_selected_firma`-Cookie-Wert gegen `session.portal.firmaIds`; ungültiger/fremder Wert → Redirect zu `/firmen-auswahl` (Code-Review; identische, bereits in PROJ-2 auditierte Logik, jetzt zusätzlich von der Detailseite genutzt)
- [x] Keine Secrets im Client-Code: `getSupabaseAdmin` (Service-Role-Key) wird von keiner `"use client"`-Datei importiert (per Grep geprüft)
- [x] Injection: Freitextsuche escaped `,`/`(`/`)` vor dem Einsetzen in PostgRESTs `.or()`-Filterliste, verhindert das Einschleusen zusätzlicher Filterbedingungen über die Suche
- [x] XSS: Suchbegriff wird ausschliesslich über JSX-Textinterpolation ausgegeben (React escaped automatisch), kein `dangerouslySetInnerHTML` im gesamten Feature
- [x] Rate-Limiting: kein neuer öffentlicher API-Endpoint — reine Server-Component-Seiten hinter der bestehenden Login-Pflicht, gleiches Risikoprofil wie PROJ-2 (dort bereits geprüft/akzeptiert)

### Bugs Found

#### BUG-1: Tabellenzellen kürzen lange Texte nicht wie im Spec beschrieben
- **Severity:** Low
- **Steps to Reproduce:**
  1. Gerät mit sehr langem Gerätenamen/Standortnamen in der Geräte-Übersicht anzeigen
  2. Auf einem schmalen Viewport (z.B. 375px) betrachten
  3. Erwartet (laut Edge Case in diesem Spec): Zellen "brechen sauber um bzw. werden gekürzt"
  4. Tatsächlich: Keine `truncate`/Kürzungs-Klassen auf den `TableCell`-Inhalten — die shadcn-`Table`-Komponente wickelt lediglich die gesamte Tabelle in einen `overflow-auto`-Container, wodurch bei sehr langen Inhalten horizontal gescrollt statt umgebrochen/gekürzt wird
- **Priority:** Nice to have — kein Blocker, da die Tabelle dadurch nicht sichtbar "kaputt" geht (funktionierender Scroll-Fallback), nur nicht exakt wie im Spec-Wortlaut beschrieben; guter Kandidat für einen späteren `/design`-Polish-Durchgang zusammen mit dem Rest des visuellen Feinschliffs

### Automatisierte Tests
- **Unit-/Integrationstests (Vitest):** 38/38 grün gesamt. Für PROJ-3: 13 Tests in `src/lib/geraete/queries.test.ts` (11 aus der Backend-Phase + 2 in dieser QA-Runde ergänzt: kombinierter Status+Suche-Filter, Paginierung über 25 Geräte hinaus) — decken Firma-Isolation, Filter, Suche, Sortierung, Paginierung und alle drei "kein Zugriff"-Fälle von `getGeraetById` ab
- **E2E-Tests (Playwright):** 12/12 grün gesamt (Chromium + Mobile Safari). Neu für PROJ-3 in `tests/PROJ-3-geraete-uebersicht.spec.ts`: Routen-Schutz für die Detailseite, sowie dass Filter-/Suche-/Seite-Query-Parameter den Session-Check nicht umgehen
- **Regression:** Alle bisherigen PROJ-1- (5 Sync-Tests) und PROJ-2-Tests (7 Access-Unit-Tests, 4 E2E-Tests) weiterhin grün — keine Regressionen durch PROJ-3

### Summary
- **Acceptance Criteria:** 9/9 abgedeckt (Datenlayer + Code-Review automatisiert geprüft; UI-Verhalten zusätzlich vom Nutzer live gegen echte Daten bestätigt)
- **Bugs Found:** 1 total (0 Critical, 0 High, 0 Medium, 1 Low) — nicht blockierend
- **Security:** Solide — Firma-Isolation doppelt abgesichert (Datenbankebene über `getGeraetById`/`getGeraeteList` + Cookie-Validierung), kein Secret-Leak, kein Injection- oder XSS-Vektor gefunden
- **Production Ready:** JA
- **Recommendation:** Status auf "Approved" setzen. BUG-1 (Tabellen-Trunkierung) optional bei einem künftigen `/design`-Durchgang mitnehmen, kein Grund für einen Deployment-Aufschub.

### Re-Verifikation (2026-09-18)

Seit der ursprünglichen Freigabe (oben) gab es mehrere Nutzerwunsch-Änderungen, die einige ACs/Wortlaute veraltet gemacht haben (siehe Implementation Notes): Artikel-Info statt Gerätename, Lagerort statt Standort, Suche über Seriennummer/Barcode/Lagerort statt Gerätename. Dieser Abschnitt verifiziert gezielt die betroffenen Stellen erneut, statt die komplette QA von vorne zu wiederholen.

#### AC-1 (jetzt): Liste zeigt Artikel-Info, Status, Lagerort, Datum letzte Prüfung
- [x] `formatArtikelInfo`-Logik durch 4 neue Tests in `artikel-info.test.ts` abgedeckt (Reihenfolge, fehlende Teile, Fallback auf Gerätename, Fallback auf Platzhalter); `getGeraeteList` liefert Artikel-Daten jetzt auch für die Liste (Batch-Query, 1 neuer Test); Lagerort war schon immer im Datensatz enthalten, jetzt auch in der Tabelle sichtbar (Code-Review). Live vom Nutzer bestätigt ("sieht gut aus", mehrfach)
- **Wortlaut-Hinweis:** Der ursprüngliche AC-Text oben ("...mit Gerätename...") ist bewusst nicht nachträglich umgeschrieben (historischer Stand des Interviews, gleiche Konvention wie bei PROJ-2), das tatsächliche Verhalten ist aber das aktuelle

#### AC-4 (jetzt): Freitextsuche über Seriennummer, Barcode und Lagerort
- [x] Bestehender Suchtest umgeschrieben + neuer Test, der explizit bestätigt, dass eine Namenssuche jetzt **keine** Treffer mehr liefert (Regressionsschutz gegen ein versehentliches Wieder-Einschleichen der alten Suchfelder)

#### AC-5 (UND-Verknüpfung Status + Suche): weiterhin korrekt
- [x] Test auf die neuen Suchfelder (Barcode/Lagerort statt Gerätename) umgestellt, Logik selbst unverändert

#### Neue Sicherheitsprüfung: Artikel-Batch-Lookup kann nicht firmenübergreifend leaken
- [x] Code-Review: `artikelIds` wird ausschliesslich aus den bereits Firma-gefilterten Geräte-Zeilen abgeleitet (`standort_id in [...]`) — die Artikel-Abfrage kann datenstrukturell keine Artikel anderer Firmen zurückgeben

#### Regression
- [x] Alle 61 Vitest-Tests grün (18 davon in `geraete/queries.test.ts` + `artikel-info.test.ts`), alle 14 Playwright-Tests grün (inkl. der 2 PROJ-3-spezifischen Routen-Schutz-Tests) — keine Regressionen durch die nachträglichen Änderungen

**Ergebnis:** Status bleibt **Approved**. Keine neuen Bugs gefunden; BUG-1 von oben (Tabellen-Trunkierung) weiterhin offen und unverändert Low-Priority.

## QA Test Results — Nachtrag: Spalte „Bemerkung Prüfung“ (2026-10-09)

**Tested:** 2026-10-09
**Tester:** QA Engineer (AI)
**Testmethode:** Code-Review, Unit- und E2E-Suiten, rein lesende Prüfung der neuen Abfrage gegen die echte Datenbank (unabhängige Nachrechnung für alle Geräte; Export der grössten Firma lokal erzeugt, nicht protokolliert). Kein Browser-Test der eingeloggten Übersicht (nur mit echtem Login erreichbar) — Live-Prüfung beim Deploy.

### Datenprüfung (rein lesend, echte Daten)
- `getAktuellePruefBemerkungen` für alle 8'235 Geräte mit Prüfbericht gegen eine unabhängige Nachrechnung (neuestes Datum → Bemerkung vorhanden → kleinere ID): **0 Abweichungen bei Geräten**. Die einzige gemeldete Abweichung war die Gruppe der 1'726 Prüfberichte **ohne Gerätezuordnung** in der Nachrechnung — sie gehören zu keinem Gerät und erscheinen nirgends
- 2'695 Geräte zeigen eine Bemerkung
- Grösste Firma (492 Geräte): kompletter Export inkl. Bemerkungen in 0,7 s; 142 Zeilen mit Bemerkung; Kopfzeile „… Letzte Prüfung;Bemerkung Prüfung …“ korrekt
- Abfrage über alle 8'235 Geräte auf einmal: 7,5 s (Obergrenze; die Übersicht fragt nur die 25 Geräte der Seite ab)

### Acceptance Criteria Status (Nachtrag)
- [x] Neue Spalte nach „Letzte Prüfung“ für alle Firmen: Code-Review `uebersicht/page.tsx`
- [x] Bemerkung des aktuellen Prüfberichts (neuestes Datum, ohne gelöschte): Unit-Tests + echte Daten (0 Abweichungen)
- [x] Kein Bericht / keine Bemerkung → leer („—“): Unit-Tests (`null`), Code-Review Anzeige
- [x] Zwei Zeilen + „…“, voller Text beim Darüberfahren; Detailseite vollständig: Code-Review (`line-clamp-2`, `title`; Detailseite zeigt die Bemerkung jedes Prüfberichts ungekürzt in ihrer Prüfberichte-Tabelle)
- [x] CSV-Export ungekürzt nach „Letzte Prüfung“, mehrzeilig maskiert: `export-csv.test.ts` + echter Export
- [x] Zusatzspalte heisst „Bemerkungen Gerät“ in Übersicht und Export: `zusatzspalten.test.ts` (Übersicht und Export lesen dieselbe Beschriftung)
- [x] Gleicher Tag (Altdaten): genau eine, stabile Bemerkung mit Vorrang der vorhandenen: Unit-Test mit Gegenprobe + echte Daten

### Edge Cases Status
- [x] Mehrzeilige Bemerkungen: in der Tabelle als Fliesstext (Umbrüche werden zu Leerzeichen), vollständig im CSV und auf der Detailseite
- [x] Touch-Geräte: voller Text über die Detailseite erreichbar
- [x] Standort-Einschränkung (PROJ-15): Bemerkungen nur für Geräte aus den bereits eingeschränkten Abfragen (Code-Review)
- [x] Mehr als 1000 Prüfberichte in einem Block: seitenweises Laden (Unit-Test)

### Security Audit
- [x] Keine neue Eingabe, kein neuer Endpoint; Geräte-IDs nur aus serverseitig eingeschränkten Abfragen
- [x] XSS: Bemerkung wird von React als Text bzw. im `title`-Attribut escaped, kein `dangerouslySetInnerHTML`
- [x] CSV-Injection: Bemerkung läuft durch dasselbe Escaping wie alle Freitextfelder (PROJ-8)

### Bugs Found

#### BUG-1: Detailseite beschriftet die Gerät-Bemerkung weiterhin nur mit „Bemerkungen“
- **Severity:** Low
- **Steps to Reproduce:** Detailseite eines Geräts mit Gerät-Bemerkung öffnen → Feld heisst „Bemerkungen“, darunter die Prüfberichte-Tabelle mit der Spalte „Bemerkungen“ (Prüfbericht)
- **Erwartet:** gleiche Unterscheidung wie in Übersicht und Export („Bemerkungen Gerät“ vs. Prüfbericht-Bemerkung)
- **Einordnung:** Nicht von den Kriterien verlangt (die nennen nur Übersicht und Export), aber dieselbe Verwechslungsgefahr, die die Umbenennung beheben soll
- **Priority:** Nice to have
- **Status:** ✅ Behoben (2026-10-09): Feld auf der Detailseite heisst jetzt „Bemerkungen Gerät“ (`uebersicht/geraete/[id]/page.tsx`); `npm test` 228/228, Lint, `tsc --noEmit`, Build grün

### Automatisierte Tests
- `npm test`: 228/228 grün
- `npm run test:e2e`: 38/38 grün (gegen das Portal auf Port 3100; Port 3000 belegt der Dev-Server des Admin-Tools)

### Summary
- **Acceptance Criteria (Nachtrag):** 7/7 erfüllt
- **Bugs Found:** 1 (0 critical, 0 high, 0 medium, 1 low), **behoben**
- **Security:** keine Findings
- **Production Ready:** **JA**, Status Approved. Live-Prüfung der Darstellung beim Deploy

## Deployment
- **Production URL:** https://obsi-hoferkundenportal.vercel.app
- **Deployed:** 2026-09-18
- **Verifiziert:** `/uebersicht`, Status-Filter (`Freigabe`, `keine Freigabe`, `letzte Freigabe`) und mehrere Geräte-Detailseiten (`/uebersicht/geraete/[id]`) live auf Production aufgerufen — alle 200, Artikel-Info/Lagerort/Suche wie erwartet dargestellt.

**Nachtrag 2026-10-09 — Spalte „Bemerkung Prüfung“:**
- **Deployed:** 2026-10-09 (automatisch via Vercel bei Push auf `main`, letzter Code-Commit `9a31bba`)
- **Migration:** keine
- **Verifiziert:** `npm test` 228/228, `npm run test:e2e` 38/38, Lint, `tsc --noEmit`, Build grün; Smoke-Test `/login` → 200, `/uebersicht` ohne Sitzung → 307. **Live durch den Nutzer:** neue Spalte inkl. Kürzung und Tooltip, „Bemerkungen Gerät“ in Zusatzspalte und Detailseite, CSV-Export mit ungekürzter Spalte nach „Letzte Prüfung“
- **Tag:** `v1.12.0-PROJ-3`
