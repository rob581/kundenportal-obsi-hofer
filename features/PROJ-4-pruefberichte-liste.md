# PROJ-4: Prüfberichte-Liste

## Status: Approved
**Created:** 2026-09-17
**Last Updated:** 2026-09-17

## Dependencies
- Requires: PROJ-1 (Dataverse-Sync-Service) — liefert die Prüfberichts-Daten; braucht dafür eine kleine Ergänzung: neues `bemerkungen`-Feld an `dv_pruefberichte`, gemappt von `bmvcc_remark` (aktuell nicht mitsynchronisiert)
- Requires: PROJ-3 (Geräte-Übersicht) — die Prüfberichte erscheinen als neuer Abschnitt auf der dort gebauten Geräte-Detailseite (`/uebersicht/geraete/[id]`)

## User Stories
- Als Kunde möchte ich auf der Detailseite eines Geräts alle bisherigen Prüfberichte sehen, damit ich die Prüfhistorie nachvollziehen kann.
- Als Kunde möchte ich für jeden Prüfbericht Datum, Ergebnis, Bemerkungen und Prüfer sehen, damit ich weiss, was bei der letzten Prüfung festgestellt wurde.
- Als Kunde eines Geräts ohne bisherige Prüfberichte möchte ich eine klare Meldung sehen, statt eines leeren/verwirrenden Abschnitts.
- Als OBSI Hofer GmbH möchte ich, dass Kunden ausschliesslich Prüfberichte ihrer eigenen Geräte sehen können, damit keine fremden Daten offengelegt werden.

## Out of Scope
- PDF-Download der Prüfberichte — zurückgestellt, bis der PDF-Speicherort in Dataverse geklärt ist (offene Frage aus PROJ-1: `IsDocumentManagementEnabled = 0`, kein Datei-/Bild-Feld am Entity, vermutlich Dataverse Notes/Attachments, aber unverifiziert); wird nachgezogen, sobald geklärt (per `/refine PROJ-4` oder als eigenes Feature)
- Globale/firmenweite Prüfberichte-Liste über alle Geräte hinweg — bewusst nur pro Gerät (siehe Decision Log); kann später ergänzt werden
- Eigene Detailseite pro Prüfbericht — die vier Felder passen kompakt als Tabelle direkt auf die Geräte-Detailseite
- Filtern/Suchen innerhalb der Prüfberichte-Liste eines Geräts — bei durchschnittlich 2–3 Berichten pro Gerät nicht nötig für MVP
- Bearbeiten, Erstellen oder Löschen von Prüfberichten — Portal ist read-only (siehe PRD)
- Ausblenden archivierter Prüfberichte — werden ganz normal mit den aktiven Berichten angezeigt (siehe Decision Log)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Kunde ist auf der Detailseite eines eigenen Geräts, wenn die Seite lädt, dann werden alle nicht gelöschten Prüfberichte dieses Geräts mit Datum, Ergebnis, Bemerkungen und Prüfer angezeigt
- [ ] Angenommen ein Gerät hat noch keine Prüfberichte, wenn die Detailseite lädt, dann wird im Prüfberichte-Abschnitt eine Leermeldung angezeigt ("Für dieses Gerät sind noch keine Prüfberichte hinterlegt.")
- [ ] Angenommen die Prüfberichte-Liste wird angezeigt, dann ist sie nach Prüfdatum absteigend sortiert (neuester Bericht zuerst)
- [ ] Angenommen ein Prüfbericht ist als "archiviert" markiert, wenn die Liste angezeigt wird, dann erscheint er ganz normal zusammen mit den aktiven Berichten
- [ ] Angenommen ein Prüfbericht wurde per PROJ-1-Sync als gelöscht markiert (Soft-Delete), wenn die Liste angezeigt wird, dann erscheint dieser Bericht nicht
- [ ] Angenommen die Prüfberichte können nicht geladen werden (z.B. Datenbank kurzzeitig nicht erreichbar), wenn der Fehler auftritt, dann wird im Prüfberichte-Abschnitt eine Fehlermeldung mit "Erneut versuchen" angezeigt, ohne den Rest der Geräte-Detailseite unbrauchbar zu machen
- [ ] Angenommen ein Kunde versucht, über die ID eines fremden Geräts auf dessen Prüfberichte zuzugreifen, dann wird ihm kein Zugriff gewährt (identisch zum bestehenden Zugriffsschutz der Geräte-Detailseite aus PROJ-3)

## Edge Cases
- Ein Prüfbericht referenziert laut Dataverse ein Gerät, das im Sync (noch) nicht existiert (lose Fremdschlüssel, siehe PROJ-1) → kann in diesem Feature nicht auftreten, da die Liste immer über die `geraet_id` der bereits geladenen, existierenden Geräte-Detailseite abgefragt wird
- Sehr viele Prüfberichte an einem Gerät (untypisch, aber möglich) → keine Paginierung im MVP, da der historische Durchschnitt bei ca. 2–3 Berichten pro Gerät liegt; wird bei Bedarf später ergänzt
- Bemerkungsfeld ist leer/nicht gesetzt → Zelle zeigt "—" statt leerem Feld (konsistent mit PROJ-3)
- Zwei Prüfberichte am selben Datum → Sortierung bleibt stabil, keine zusätzliche Sekundärsortierung nötig für MVP

## Technical Requirements (optional)
- Zugriffsbeschränkung: Prüfberichte-Abfrage nutzt dieselbe bereits durch PROJ-3 etablierte Firma-Prüfung (Gerät → Standort → Firma), keine zusätzliche clientseitige Filterung
- Abhängigkeit: `dv_pruefberichte` benötigt das neue `bemerkungen`-Feld (gemappt von `bmvcc_remark`), bevor der Backend-Teil dieses Features gebaut werden kann

## Open Questions
- [x] Exakter Dataverse-Feldname für das Bemerkungsfeld an `bmvcc_Pruefbericht` → `bmvcc_remark` (vom Nutzer bestätigt, 2026-09-17)
- [ ] PDF-Speicherort weiterhin ungeklärt (aus PROJ-1 übernommen) — betrifft nur eine spätere PDF-Download-Erweiterung dieses oder eines neuen Features, nicht diese Version

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| PDF-Download vorerst komplett aus dem Scope genommen | PDF-Speicherort in Dataverse ist noch nicht verifiziert (offene Frage aus PROJ-1); Prüfberichte-Metadaten (Datum/Ergebnis/Bemerkungen/Prüfer) liefern bereits eigenständigen Kundennutzen ohne PDF | 2026-09-17 |
| Prüfberichte werden pro Gerät angezeigt, nicht als globale firmenweite Liste | Passt zum natürlichen Kunden-Workflow ("ich schaue mir dieses eine Gerät an") und zum bereits in PROJ-3 vorgesehenen Anknüpfungspunkt | 2026-09-17 |
| Archivierte Prüfberichte werden normal angezeigt, nicht ausgeblendet | "Archiviert" bedeutet abgeschlossen/historisch, nicht ungültig; für sicherheitsrelevante Geräte ist die vollständige Prüfhistorie relevant | 2026-09-17 |
| Direkt als neuer Abschnitt auf der bestehenden Geräte-Detailseite, keine eigene Unterseite | Kompakte Datenmenge (Ø 2–3 Berichte/Gerät), kein zusätzlicher Klick nötig | 2026-09-17 |
| Keine Paginierung/Filterung innerhalb der Liste im MVP | Historischer Durchschnitt von ca. 2–3 Prüfberichten pro Gerät macht das für die aktuelle Datenlage unnötig | 2026-09-17 |
| Neues Bemerkungsfeld (`bmvcc_remark` → `bemerkungen`) erfordert eine kleine PROJ-1-Ergänzung (Schema + Sync-Mapping) | Feld existiert in Dataverse, wurde aber beim ursprünglichen PROJ-1-Schema nicht mitgenommen | 2026-09-17 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Prüfberichte werden als Teil derselben Server-Component-Anfrage auf der Geräte-Detailseite geladen, kein separater API-Endpoint | Konsistent mit dem in PROJ-3 etablierten Muster (reine Leseoperation); keine zusätzliche Client-Server-Rundreise nötig | 2026-09-17 |
| Prüfberichte-Abfrage verlangt keinen eigenen `firmaId`-Parameter, sondern verlässt sich auf einen bereits geprüften `geraetId` | Die Autorisierung ("gehört das Gerät zur Firma?") ist bereits durch den vorgelagerten `getGeraetById`-Aufruf der PROJ-3-Detailseite sichergestellt; Prüfberichte werden erst geladen, nachdem dieser ein gültiges Gerät zurückgegeben hat. Diese Reihenfolge muss beim Bauen zwingend beibehalten werden (nicht parallel/vorher laden) | 2026-09-17 |
| Sortierung (neuestes Datum zuerst) und Ausschluss Soft-gelöschter Berichte erfolgen direkt in der Datenbankabfrage, nicht im Speicher | Gleiche Begründung wie bei PROJ-3: skaliert besser und bleibt konsistent mit dem bestehenden Muster | 2026-09-17 |
| Neues `bemerkungen`-Feld wird als rein additive Spalte an die bestehende `dv_pruefberichte`-Tabelle angehängt, keine neue Tabelle | Reine Spalten-Ergänzung ohne strukturelle Änderung an PROJ-1; einfachste Umsetzung, keine bestehenden PROJ-1-Verhaltensweisen betroffen | 2026-09-17 |
| Die PROJ-1-Ergänzung (Migration + Sync-Mapping für `bemerkungen`/`bmvcc_remark`) wird zu Beginn von `/backend PROJ-4` miterledigt, kein separater `/refine PROJ-1`-Durchgang | Rein additiv, betrifft ausschliesslich dieses Feature; ein eigener Durchgang wäre unnötiger Overhead für ein Ein-Personen-Team | 2026-09-17 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponenten-Struktur

```
/uebersicht/geraete/[id] (bestehende PROJ-3-Detailseite, erweitert)
├── AppHeader (bestehend)
├── Zurück-Link (bestehend)
├── Geräte-Detail-Karte (bestehend, unverändert)
└── NEU: Prüfberichte-Karte
    ├── Tabelle: Datum, Ergebnis, Bemerkungen, Prüfer — neuester Bericht zuerst
    ├── Leer-Zustand ("Für dieses Gerät sind noch keine Prüfberichte hinterlegt.")
    └── Eigener Fehler-Zustand mit "Erneut versuchen" (unabhängig vom Rest der Seite — ein Ladefehler bei den Prüfberichten darf die Gerätedetails nicht mit lahmlegen)
```

### Datenmodell (in Textform)

- Die bestehende PROJ-1-Tabelle `dv_pruefberichte` wird um ein Feld `bemerkungen` (Text) ergänzt, synchronisiert aus dem Dataverse-Feld `bmvcc_remark` — eine kleine, rein additive Erweiterung an PROJ-1
- Die Geräte-Detailseite lädt zusätzlich zu den bestehenden Gerätedaten alle Prüfberichte, deren `geraet_id` mit dem bereits (über PROJ-3) autorisierten Gerät übereinstimmt und die nicht per Soft-Delete als gelöscht markiert sind
- Archivierte Prüfberichte werden ganz normal mitgeladen (kein zusätzlicher Filter, siehe Product Decision)
- Sortierung nach Prüfdatum absteigend erfolgt direkt in der Datenbankabfrage
- Keine Paginierung (siehe Edge Cases im Spec — historischer Durchschnitt ~2–3 Berichte/Gerät)

### Technische Entscheidungen (Begründung)
Siehe Decision Log → Technical Decisions oben.

### Abhängigkeiten (Packages)
Keine neuen — nutzt weiterhin die bereits installierten shadcn-Komponenten (Card, Table) und die vorhandene Supabase-Anbindung (`src/lib/supabase-admin.ts`).

### Voraussetzung für `/backend`
Bevor der Backend-Teil von PROJ-4 gebaut werden kann, braucht `dv_pruefberichte` das neue `bemerkungen`-Feld (Migration + Ergänzung des Sync-Mappings um `bmvcc_remark`). Wird zu Beginn von `/backend PROJ-4` als erster Schritt miterledigt (siehe Technical Decisions).

## Implementation Notes (Frontend)

- Neue "Prüfberichte"-Karte direkt in `src/app/(protected)/uebersicht/geraete/[id]/page.tsx` eingebaut (unterhalb der bestehenden Bemerkungen-Karte aus PROJ-3): shadcn `Table` mit Spalten Datum/Ergebnis/Bemerkungen/Prüfer, eigener Leer-Zustand und eigener Fehler-Zustand mit "Erneut versuchen" — unabhängig vom Rest der Seite (eigener try/catch, wie im Tech Design festgelegt).
- Datenzugriff über eine neue Mock-Data-Schicht (`src/lib/pruefberichte/types.ts`, `src/lib/pruefberichte/mock-data.ts`) mit `getPruefberichteFuerGeraet(geraetId)`. Anders als bei PROJ-3s Mock-Phase ist die Geräte-Detailseite selbst schon an echte Supabase-Daten angebunden (PROJ-3-Backend ist fertig) — die Mock-Funktion ignoriert daher den `geraetId`-Parameter bewusst und liefert für jedes Gerät dieselbe feste Beispiel-Liste (3 Einträge, unterschiedliche Ergebnisse/Bemerkungen), rein um die UI-Form zu verifizieren. `/backend` ersetzt nur die Funktionsinnereien durch eine echte Supabase-Abfrage (gefiltert nach `geraetId`, ohne Soft-gelöschte Einträge), gleiche async Signatur, keine Änderung an der aufrufenden Seite nötig.
- Die Reihenfolge aus dem Tech Design ist eingehalten: Prüfberichte werden erst nach einem erfolgreichen `getGeraetById`-Aufruf geladen (nach dem `notFound()`-Check), nie parallel oder davor.
- `npx tsc --noEmit` und `npx vitest run` (38 Tests, unverändert) laufen fehlerfrei durch; manueller Smoke-Test bestätigt, dass die Detailseite ohne Session weiterhin korrekt zu `/login` umleitet (kein Server-Fehler).
- Noch offen (für `/backend`): PROJ-1-Ergänzung (`bemerkungen`-Spalte + Sync-Mapping von `bmvcc_remark`), danach echte Supabase-Abfrage für `getPruefberichteFuerGeraet` inkl. Sortierung/Soft-Delete-Filterung in der Datenbank.

## Implementation Notes (Backend)

- **PROJ-1-Ergänzung zuerst umgesetzt** (additiv, wie im Tech Design vorgesehen): Migration `supabase/migrations/0003_pruefberichte_bemerkungen.sql` fügt die Spalte `bemerkungen` zu `dv_pruefberichte` hinzu (vom Nutzer im Supabase SQL Editor ausgeführt); `src/lib/sync/entities.ts` (`pruefberichtSchema`) und `src/lib/sync/jobs.ts` (Pruefberichte-Job) um `bemerkungen`/`bmvcc_remark` ergänzt. Keine bestehenden Sync-Tests mussten angepasst werden, da keiner davon einzelne Pruefbericht-Felder hart codiert prüft.
- `src/lib/pruefberichte/queries.ts` ersetzt die Mock-Data-Schicht mit einer echten Supabase-Abfrage: `dv_pruefberichte` gefiltert nach `geraet_id`, ohne Soft-gelöschte Einträge (`deleted_at is null`), archivierte Berichte inklusive, sortiert nach `pruefdatum` absteigend (Berichte ohne Datum sortieren ans Ende, kein Vorrang wie bei "nie geprüften Geräten" in PROJ-3, da hier keine akute Handlungsdringlichkeit signalisiert wird).
- **Wie im Tech Design festgelegt:** kein eigener `firmaId`-Parameter an der Prüfberichte-Abfrage — die Autorisierung ist bereits durch den vorgelagerten `getGeraetById`-Aufruf der Detailseite sichergestellt (Prüfberichte werden erst nach dessen erfolgreichem, nicht-null Ergebnis geladen). Kein separater API-Endpoint nötig, wie bei PROJ-3.
- 6 neue Integrationstests in `src/lib/pruefberichte/queries.test.ts` (gleiches Fluent-Mock-Muster wie `src/lib/geraete/queries.test.ts`): Filterung nach Gerät, Ausschluss Soft-gelöschter Berichte, archivierte Berichte werden normal zurückgegeben, Sortierung (inkl. Berichte ohne Datum), Bemerkungen/Prüfer werden durchgereicht, leeres Ergebnis für ein Gerät ohne Berichte.
- `npx tsc --noEmit` und `npx vitest run` (44 Tests total, davon 6 neu) laufen fehlerfrei durch; manueller Smoke-Test bestätigt weiterhin keinen Server-Fehler auf der Geräte-Detailseite ohne Session.
- **Live verifiziert (2026-09-17):** Manueller Sync-Lauf gegen die echte Dataverse-/Supabase-Umgebung ausgeführt (`pruefberichte`-Batch schlug beim ersten Versuch mit dem bekannten transienten `TypeError: fetch failed` fehl, siehe PROJ-1 Implementation Notes; Retry lief sauber durch). Nutzer hat danach eine Geräte-Detailseite mit echten Prüfberichten aufgerufen — Bemerkungen werden korrekt angezeigt.
- **Nachträglich ergänzt (2026-09-18, `/design`-Nachtrag):** Prüfbericht-Ergebnis wird jetzt farblich markiert (gleiche Zuordnung wie Geräte-Status) statt neutralem Text, in der Prüfberichte-Tabelle auf der Geräte-Detailseite — siehe `docs/design-system.md` Component Conventions und `src/lib/status-badge.ts` (gemeinsam mit PROJ-3 genutzt, ein Test in `src/lib/status-badge.test.ts`).

## QA Test Results

**Tested:** 2026-09-17
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)

> Hinweis: Wie bei PROJ-2/PROJ-3 lässt sich der echte Entra-External-ID-Login nicht automatisiert/wiederholbar durchspielen. Da PROJ-4 keine neue Route und keinen neuen API-Endpoint einführt (nur einen neuen Abschnitt auf der bereits durch PROJ-3 authentifizierten/autorisierten Geräte-Detailseite), wurde die eigentliche Zugriffskontrolle bereits vollständig durch PROJ-3s Tests abgedeckt (siehe unten). Automatisiert geprüft wurden: die Datenlogik (Vitest-Integrationstests gegen die echte Query-Funktion) und der Sicherheitsaspekt per Code-Review. Die tatsächliche Anzeige wurde vom Nutzer live gegen echte Daten bestätigt (siehe Implementation Notes, Backend).

### Acceptance Criteria Status

#### AC-1: Prüfberichte-Liste zeigt Datum, Ergebnis, Bemerkungen, Prüfer
- [x] Integrationstest (`passes through Bemerkungen and Prüfer fields`) + Code-Review der Tabellen-Spalten in `page.tsx` + live vom Nutzer mit echten Daten bestätigt

#### AC-2: Leermeldung bei Gerät ohne Prüfberichte
- [x] Integrationstest (`returns an empty array for a Gerät with no reports`) deckt die Datengrundlage ab; UI-Zweig für die Leermeldung durch Code-Review bestätigt

#### AC-3: Sortierung nach Prüfdatum absteigend
- [x] Integrationstest grün (inkl. Berichte ohne Datum, die ans Ende sortieren) — siehe aber BUG-1 unten zu einer Einschränkung bei gleichem Datum

#### AC-4: Archivierte Berichte erscheinen normal
- [x] Integrationstest grün (kein Filter auf `ist_archiviert` in der Abfrage)

#### AC-5: Soft-gelöschte Berichte erscheinen nicht
- [x] Integrationstest grün (`deleted_at is null`-Filter greift)

#### AC-6: Fehler-Zustand mit "Erneut versuchen", Rest der Detailseite bleibt nutzbar
- [x] Code-Review bestätigt: eigener try/catch um `getPruefberichteFuerGeraet`, unabhängig vom bereits erfolgreich geladenen `geraet`-Objekt; ein Fehler in diesem Abschnitt kann die restliche Seite nicht mehr betreffen, da diese zu diesem Zeitpunkt schon vollständig gerendert würde. Kein künstlich provozierter echter Datenbank-Ausfall (gleiche Konvention wie PROJ-1/2/3)

#### AC-7: Kein Zugriff auf Prüfberichte eines fremden Geräts
- [x] Kein neuer Autorisierungscode nötig/vorhanden — die Prüfberichte werden ausschliesslich mit einer bereits durch `getGeraetById` (PROJ-3) autorisierten `geraetId` abgefragt, und zwar erst nach dessen erfolgreichem (nicht-null) Ergebnis (`notFound()` bricht vorher ab). Die eigentliche IDOR-Prüfung ist also durch die bereits in PROJ-3 getesteten `getGeraetById`-Fälle abgedeckt; hier zusätzlich per Code-Review verifiziert, dass die Reihenfolge (erst Gerät, dann Prüfberichte) tatsächlich eingehalten wird

### Edge Cases Status

#### EC-1: Prüfbericht referenziert nicht (mehr) existierendes Gerät
- [x] Kann laut Code-Konstruktion nicht auftreten (Abfrage läuft nur mit einer bereits als existent bestätigten `geraetId`) — nicht separat testbar, da kein eigener Codepfad dafür existiert

#### EC-2: Sehr viele Prüfberichte an einem Gerät
- [x] Bewusste Produktentscheidung (keine Paginierung, siehe Decision Log) — Code-Review bestätigt, dass keine `.limit()`/`.range()` die Ergebnisse künstlich beschneidet; die Abfrage selbst begrenzt die Zeilenzahl nicht

#### EC-3: Leeres Bemerkungsfeld
- [x] Code-Review: `{bericht.bemerkungen ?? "—"}` in `page.tsx`

#### EC-4: Zwei Prüfberichte am selben Datum
- [ ] **BUG-1 gefunden** (siehe unten) — Spec geht von stabiler Sortierung aus, die Abfrage hat aber kein Sekundär-Sortierkriterium

### Security Audit Results
- [x] Authentication: Route bereits durch PROJ-3s E2E-Test abgedeckt (`tests/PROJ-3-geraete-uebersicht.spec.ts`: Detailseite ohne Session → Redirect zu `/login`) — kein neuer Test nötig, da PROJ-4 dieselbe Route erweitert statt eine neue anzulegen
- [x] Autorisierung/IDOR: Keine neue Angriffsfläche — Prüfberichte werden ausschliesslich über eine bereits autorisierte `geraetId` abgefragt (siehe AC-7); die zugrunde liegende Firma-Prüfung ist durch PROJ-3s `getGeraetById`-Integrationstests abgedeckt (fremde Firma, unbekannte ID, kein Standort)
- [x] Keine Secrets im Client-Code: Weder `src/lib/pruefberichte/queries.ts` noch `getSupabaseAdmin` werden von einer `"use client"`-Datei importiert (per Grep geprüft)
- [x] Injection: `geraetId` wird ausschliesslich über `.eq("geraet_id", geraetId)` (parametrisierter Supabase-Query-Builder) verwendet, keine String-Konkatenation — kein Injektionsvektor
- [x] XSS: `bemerkungen` (von Dataverse, nicht kundeneingegeben) wird nur über JSX-Textinterpolation ausgegeben, React escaped automatisch; kein `dangerouslySetInnerHTML`
- [x] Rate-Limiting: kein neuer öffentlicher API-Endpoint — reine Server-Component-Erweiterung einer bereits geschützten Seite

### Bugs Found

#### BUG-1: Sortierung bei gleichem Prüfdatum ist nicht garantiert stabil
- **Severity:** Low
- **Steps to Reproduce:**
  1. Ein Gerät mit zwei oder mehr Prüfberichten am exakt selben `pruefdatum` betrachten
  2. Erwartet (laut Edge Case in diesem Spec): "Sortierung bleibt stabil"
  3. Tatsächlich: Die Datenbankabfrage sortiert nur nach `pruefdatum absteigend`, ohne Sekundär-Kriterium (z.B. `id`); PostgreSQL garantiert bei gleichem Sortierwert **keine** feste Reihenfolge zwischen Ausführungen — die Anzeigereihenfolge zweier gleichdatierter Berichte könnte sich theoretisch zwischen zwei Seitenaufrufen unterscheiden
- **Priority:** Nice to have — bei durchschnittlich 2–3 Berichten pro Gerät und typischerweise unterschiedlichen Prüfdaten ein seltener Fall; einfacher Fix wäre ein zusätzliches `.order("id")` als Tie-Breaker, aber kein Blocker für den Release

### Automatisierte Tests
- **Unit-/Integrationstests (Vitest):** 44/44 grün gesamt. Für PROJ-4: 6 Tests in `src/lib/pruefberichte/queries.test.ts` (Filterung nach Gerät, Ausschluss Soft-gelöschter Berichte, archivierte Berichte normal enthalten, Sortierung inkl. Berichte ohne Datum, Bemerkungen/Prüfer durchgereicht, leeres Ergebnis)
- **E2E-Tests (Playwright):** 12/12 grün gesamt — kein neuer PROJ-4-spezifischer Test nötig, da die einzige berührte Route (`/uebersicht/geraete/[id]`) bereits vollständig durch `tests/PROJ-3-geraete-uebersicht.spec.ts` auf Routen-Schutz getestet ist
- **Regression:** Alle bisherigen PROJ-1-, PROJ-2- und PROJ-3-Tests weiterhin grün — keine Regressionen durch PROJ-4
- **Live-Verifikation:** Echter Sync-Lauf gegen Dataverse/Supabase (inkl. `bemerkungen`-Feld) durchgeführt, echte Prüfberichte auf einer echten Geräte-Detailseite vom Nutzer bestätigt (siehe Implementation Notes, Backend)

### Summary
- **Acceptance Criteria:** 7/7 abgedeckt (Integrationstests + Code-Review; UI-Anzeige zusätzlich live vom Nutzer gegen echte Daten bestätigt)
- **Bugs Found:** 1 total (0 Critical, 0 High, 0 Medium, 1 Low) — nicht blockierend
- **Security:** Solide — keine neue Angriffsfläche gegenüber PROJ-3, kein Secret-Leak, kein Injection- oder XSS-Vektor
- **Production Ready:** JA
- **Recommendation:** Status auf "Approved" setzen. BUG-1 (fehlender Tie-Breaker bei gleichem Prüfdatum) ist optional und kann bei Gelegenheit (z.B. zusammen mit BUG-1 aus PROJ-3, der Tabellen-Trunkierung) nachgezogen werden.

## Deployment
- **Production URL:** https://obsi-hoferkundenportal.vercel.app
- **Deployed:** 2026-09-18
- **Verifiziert:** Über die auf Production aufgerufenen Geräte-Detailseiten (`/uebersicht/geraete/[id]`) mitgetestet — Prüfberichte-Liste wird korrekt angezeigt.
