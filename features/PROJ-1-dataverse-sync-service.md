# PROJ-1: Dataverse-Sync-Service

## Status: Planned
**Created:** 2026-09-15
**Last Updated:** 2026-09-16

## Dependencies
- None

## User Stories
- Als Kunde möchte ich, dass meine Geräte- und Prüfberichtsdaten im Portal spätestens einen Tag nach einer Änderung in Dataverse aktuell sind, damit ich mich auf die angezeigten Informationen verlassen kann.
- Als OBSI Hofer AG möchte ich, dass Dataverse-Daten automatisch täglich ins Portal übernommen werden, ohne manuellen Exportschritt.
- Als OBSI Hofer AG (Admin) möchte ich benachrichtigt werden, wenn der tägliche Sync-Lauf fehlschlägt, damit ich das zeitnah beheben kann, bevor die Portal-Daten zu stark veralten.

## Out of Scope
- Ereignisgesteuerter Push via Power Automate — **Entscheidung am 2026-09-16 geändert**: ersetzt durch einen täglichen, vollständigen Pull-Sync (Vercel Cron Job), siehe Decision Log
- Separates einmaliges Backfill-Skript — der tägliche Job übernimmt Erstbefüllung und laufenden Sync einheitlich (der bisherige einmalige Lauf hat die Datenbank am 2026-09-16 bereits initial befüllt: ~302 Firmen, 588 Kontakte, 1279 Artikel, 203 Standorte, 8243 Geräte, 19'693 Prüfberichte)
- Inkrementeller Sync (nur geänderte Datensätze seit letztem Lauf) — bewusst nicht gewählt, siehe Decision Log
- Bidirektionaler Sync (Schreiben vom Portal zurück nach Dataverse) — Portal ist read-only (siehe PRD)
- Konfliktbehandlung bei gleichzeitigen Änderungen — Dataverse ist immer Source of Truth, jeder Lauf überschreibt den Datenbankstand vollständig ohne Merge-Logik
- Echtzeit-Benachrichtigung an Kunden bei neuen Daten — Non-Goal laut PRD, evtl. späteres Feature
- Login/Zugriffssteuerung — siehe PROJ-2
- Anzeige der Daten im Portal — siehe PROJ-3, PROJ-4, PROJ-5

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen es ist 03:00 Uhr, wenn der tägliche Vercel-Cron-Job auslöst, dann werden alle Datensätze aller 7 Entitäten (Firmen, Kontakte, Artikel, Standorte, Geräte, Prüfberichte, Relationen) vollständig aus Dataverse gelesen und per Upsert in die Datenbank übernommen
- [ ] Angenommen ein Prüfbericht existierte beim letzten Lauf noch, kommt im aktuellen Lauf aber nicht mehr aus Dataverse zurück, wenn der Abgleich nach dem Lesen durchgeführt wird, dann wird der Prüfbericht in der Datenbank als gelöscht markiert (Soft-Delete), nicht physisch entfernt
- [ ] Angenommen ein Datensatz einer anderen Entität existierte beim letzten Lauf noch, kommt im aktuellen Lauf aber nicht mehr zurück, wenn der Abgleich durchgeführt wird, dann wird er endgültig aus der Datenbank entfernt (Hard-Delete)
- [ ] Angenommen der Cron-Endpoint wird ohne oder mit falschem Secret aufgerufen, dann wird der Request mit HTTP 401 abgelehnt und es läuft kein Sync
- [ ] Angenommen der tägliche Lauf schlägt fehl (z.B. Dataverse nicht erreichbar), dann wird der Fehler protokolliert und der Verantwortliche benachrichtigt (genauer Mechanismus: siehe Open Questions)
- [ ] Angenommen der tägliche Job läuft zum ersten Mal überhaupt, wenn er ausgeführt wird, dann übernimmt er die vollständige Erstbefüllung ohne separates Skript
- [ ] Angenommen ein Datensatz wird gelesen und existiert bereits in der Datenbank, wenn der Upsert verarbeitet wird, dann wird der bestehende Datensatz aktualisiert statt dupliziert

## Edge Cases
- Der tägliche Job wird aus irgendeinem Grund zweimal am selben Tag ausgelöst → unkritisch, da jeder Lauf vollständig und idempotent ist (Upsert + Abgleich)
- Ein Prüfbericht existiert in der Datenbank, dessen Gerät im selben Lauf noch nicht verarbeitet wurde (Reihenfolge innerhalb eines Laufs) → lockere Fremdschlüssel (siehe Tech Design) lösen das weiterhin unabhängig von der Verarbeitungsreihenfolge
- Dataverse liefert bei einem Lauf aus einem technischen Grund nur einen Teil der Datensätze einer Entität (z.B. abgebrochene Pagination) → Risiko fälschlicher Löschungen; siehe Open Questions
- Der Job überschreitet die maximale Laufzeit einer Vercel-Funktion bei ~30'000 Datensätzen → siehe Open Questions, technische Lösung in `/architecture` (Batching statt einzelner Zeilen)
- Ein Kunde/Account oder Gerät verschwindet aus Dataverse, obwohl noch abhängige Geräte/Prüfberichte darauf referenzieren → unkritisch dank loser Fremdschlüssel (ON DELETE SET NULL bereits verifiziert)

## Technical Requirements (optional)
- Sicherheit: Authentifizierung des Cron-Aufrufs via Secret (Vercel Cron unterstützt das nativ, z.B. `Authorization`-Header)
- Datenaktualität: maximal 24 Stunden Verzögerung (täglicher Lauf um 03:00 Uhr), kein Echtzeit-Anspruch mehr

## Open Questions
- [x] Wie soll die Sync-Verarbeitung mit "verwaisten" Referenzen umgehen (Prüfbericht trifft vor zugehörigem Gerät ein, oder übergeordneter Datensatz wird hart gelöscht während Kinder-Datensätze noch existieren)? → Gelöst durch lockere (nicht strikt erzwungene) Fremdschlüssel in der Sync-Datenbank, siehe Tech Design (2026-09-16)
- [ ] Genauer PDF-Speicherort für Prüfberichte (Notes/Attachments vs. sonstiges) — `bmvcc_Pruefbericht` hat `IsDocumentManagementEnabled = 0` (kein SharePoint), es existiert kein Datei-/Bild-Feld unter den Attributen → sehr wahrscheinlich Dataverse Notes/Attachments (Annotationen), aber vom Nutzer noch in Dataverse zu verifizieren. Relevant für PROJ-4.
- [x] Wie genau wird der Admin bei einem fehlgeschlagenen Cron-Lauf benachrichtigt? → E-Mail (Nutzerentscheidung), Dienst-Auswahl bei `/backend` (2026-09-16)
- [x] Wie wird verhindert, dass eine unvollständige Dataverse-Antwort fälschlich zu Massen-Löschungen führt? → Sicherheitsschwelle: ab mehr als 20% "verschwundenen" Zeilen pro Entität wird nicht gelöscht, nur gewarnt (2026-09-16)
- [x] Wie wird die Laufzeit bei ~30'000 Datensätzen innerhalb der Vercel-Funktionslimits gehalten? → Batches statt Einzelzeilen beim Supabase-Schreiben; genaue Batch-Grösse bei `/backend` final festgelegt (2026-09-16)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Datenabgrenzung erfolgt auf Account-Ebene (Firma = Kunde), nicht pro einzelnem Kontakt | Geräte gehören typischerweise einer Firma, nicht einer Einzelperson; jeder Kontakt mit Login sieht alle Geräte/Prüfberichte seines Accounts | 2026-09-15 |
| Sync erfolgt ereignisgesteuert via Power Automate (Push bei Datenänderung), nicht als pollender Scheduled Job | Power Automate ist bereits als Steuerungsmechanismus vorgesehen; ermöglicht near-real-time Updates ohne unnötige Polling-Last auf Dataverse | 2026-09-15 |
| Pro Entität (Gerät, Prüfbericht, Kunde/Account, Artikel) löst jede Änderung einen eigenen Flow aus | Bestätigt durch Nutzer — granularste und einfachste Umsetzung in Power Automate | 2026-09-16 |
| Authentifizierung via Shared Secret/API-Key im Header | Einfach in Power Automate konfigurierbar, kein OAuth-Flow nötig | 2026-09-16 |
| Erstbefüllung (Backfill) erfolgt einmalig manuell via Dataverse Web API, nicht über Power Automate | Power Automate triggert nur zukünftige Änderungen; ein einmaliges Backfill-Skript ist einfacher als bestehende Datensätze künstlich per Flow "anzustossen" | 2026-09-16 |
| Fehlerbehandlung nutzt Power Automates eingebaute Retry-Logik + E-Mail-Benachrichtigung bei endgültigem Fehlschlag | Ausreichend robust für MVP-Umfang; eigene Dead-Letter-Queue wäre Overengineering | 2026-09-16 |
| Löschungen lösen einen separaten Flow pro Entität aus; Prüfberichte werden Soft-Deleted, andere Entitäten Hard-Deleted | Prüfberichte sind sicherheitsrelevante Nachweise und sollen nachvollziehbar bleiben; andere Entitäten benötigen das nicht | 2026-09-16 |
| Bei jedem Trigger wird der vollständige Datensatz (nicht nur Delta) übertragen | Einfacher in Power Automate zu bauen, macht den Sync-Endpoint robuster gegen verlorene Events (reines Upsert, keine Feld-Merge-Logik nötig) | 2026-09-16 |
| **Architektur-Wechsel:** Sync erfolgt ab jetzt über einen täglichen, vollständigen Pull-Job (Vercel Cron, 03:00 Uhr) statt über ereignisgesteuerten Power-Automate-Push. Ersetzt die entsprechenden Entscheidungen vom 2026-09-15 oben. | Nutzerentscheidung — Power Automate soll nicht genutzt werden; bei ~30'000 Datensätzen ist tägliche Aktualität ausreichend für den Anwendungsfall (Inspektionen sind keine Echtzeit-Ereignisse) | 2026-09-16 |
| Löschungs-Erkennung erfolgt per Differenz-Abgleich (Datensätze, die im aktuellen Lauf nicht mehr zurückkommen, gelten als gelöscht) statt über explizite Lösch-Events | Ohne Power Automate gibt es keine expliziten Lösch-Trigger mehr; ein voller Re-Sync kann Löschungen so trotzdem zuverlässig erkennen | 2026-09-16 |
| Die Power-Automate-Push-Endpoints (`/api/sync/[entity]`) werden entfernt | Nicht mehr genutzt; ungenutzter, API-Key-geschützter Endpoint wäre unnötige Angriffsfläche und Wartungsaufwand. Bei Bedarf über Git-History wiederherstellbar | 2026-09-16 |
| Kein separates Backfill-Skript mehr — der tägliche Job übernimmt auch die Erstbefüllung einheitlich | Einfacher: nur ein Mechanismus zu warten/testen statt zwei. Die Datenbank wurde am 2026-09-16 bereits einmalig über das (jetzt zu ersetzende) Backfill-Skript befüllt | 2026-09-16 |
| Voller Re-Sync jeden Tag statt inkrementellem Sync (z.B. via "geändert am"-Filter) | Bei ~30'000 Datensätzen unkritisch von der Datenmenge her; ermöglicht zuverlässige Löschungs-Erkennung ohne zusätzlichen Änderungsverfolgungs-Mechanismus | 2026-09-16 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Fremdschlüssel-Spalten (`geraet_id`, `standort_id`, `artikel_id`, `firma_id`, `kontakt_id`) haben KEINEN Datenbank-Constraint (kein `references`), nur einen Index | QA-Fund (BUG-1): echte FK-Constraints erzwingen bei jedem Insert eine existierende Eltern-Zeile, was Out-of-Order-Sync-Events (explizit vorgesehen) zum Scheitern brachte; Referenzintegrität bleibt Aufgabe von Dataverse als Source of Truth | 2026-09-16 |
| Kunden-Zuordnung für Geräte läuft über `bmvcc_equipmentrecord.bmvcc_Standort` → `bmvcc_organizationlocation.bmvcc_BexioFirma` → `bmvcc_firma` | Geräte haben keinen direkten Lookup auf Firma, nur ein unzuverlässiges Textfeld (`bmvcc_KundenID`); der Standort-Lookup ist die einzige echte Dataverse-Relation dorthin | 2026-09-16 |
| Login-Zuordnung (Kontakt → Kunde) läuft über die Junction-Entität `bmvcc_relation` (Firma↔Person mit Rolle), nicht über `bmvcc_Kontakt.bmvcc_parent_account` | Ein Kontakt kann laut Datenmodell zu mehreren Firmen gehören; `bmvcc_relation` bildet das korrekt ab, das einfache Parent-Lookup nicht | 2026-09-16 |
| Gerätestatus wird aus `bmvcc_equipmentrecord.bmvcc_Betriebsmittelstatus` übernommen (feste Werteliste laut Nutzer, auch wenn das Feld technisch nvarchar ist) | Wird für die Dashboard-Gruppierung "Anzahl Geräte pro Status" (PROJ-5) benötigt | 2026-09-16 |
| "Letzte Prüfung" wird direkt aus `bmvcc_equipmentrecord.bmvcc_Letztepruefung` gelesen, nicht aus den Prüfberichten abgeleitet | Feld existiert bereits direkt am Gerät und ist die einfachste, konsistente Quelle für PROJ-5 | 2026-09-16 |
| Die bestehende `cr5d2_Dashboard`/`cr5d2_DashboardStatistik`-Entität wird NICHT mitsynchronisiert | Laut Nutzer ein unabhängiges internes Tool ohne Bezug zu unserem Kundenportal-Dashboard | 2026-09-16 |
| Fremdschlüssel in der Sync-Datenbank sind lose (nullable), nicht strikt referenziell erzwungen | Löst das Problem nicht garantierter Reihenfolge beim Sync (z.B. Prüfbericht vor Gerät); volle Konsistenz stellt sich beim nächsten Event oder Backfill her | 2026-09-16 |
| Next.js API-Routen als Sync-/Delete-Endpoints, Supabase/Postgres als Spiegel-Datenbank | Bereits Teil des Templates/Stacks, kein separates Backend-Hosting nötig | 2026-09-16 |
| Authentifizierung eingehender Power-Automate-Aufrufe via einzelnem Shared-Secret/API-Key im Header | Einfach in Power Automate konfigurierbar, ausreichend für Ein-Personen-Team | 2026-09-16 |
| Backfill-Skript nutzt `@azure/msal-node` zur Authentifizierung gegen die Dataverse Web API | Einzige zusätzliche Abhängigkeit, nur für den einmaligen Erstimport benötigt | 2026-09-16 |
| Supabase/Postgres nochmals gegen Azure Database for PostgreSQL abgewogen (bei /architecture für PROJ-2) und bestätigt | Geringerer Setup-Aufwand, bereits im Template vorbereitet; akzeptierter Kompromiss trotz fehlender Schweizer Supabase-Region | 2026-09-16 |
| Sync-Trigger: Vercel Cron Job (`vercel.json`, täglich 03:00 Uhr) statt Power-Automate-Webhook | Kein zusätzlicher Dienst nötig, da ohnehin auf Vercel deployed wird; passt zur neuen Pull-Architektur | 2026-09-16 |
| Cron-Endpoint wird über Vercels eigenen Cron-Secret-Mechanismus abgesichert (Vergleich des `Authorization`-Headers), nicht über den bisherigen `SYNC_API_KEY` | Der bisherige API-Key war für Power-Automate-Aufrufe gedacht; Vercel Cron hat einen eigenen, einfacheren Standard-Mechanismus dafür | 2026-09-16 |
| Supabase-Schreibzugriffe erfolgen in Batches (z.B. 500 Zeilen pro Upsert-Aufruf) statt einer Zeile pro Aufruf | Bei ~30'000 Datensätzen wäre ein Aufruf pro Zeile zu langsam und würde das Zeitlimit einer Vercel-Funktion riskieren; Batching reduziert die Anzahl Netzwerk-Aufrufe drastisch | 2026-09-16 |
| Löschungs-Sicherheitsschwelle: pro Entität wird nur gelöscht, wenn weniger als 20% der zuvor bekannten Zeilen fehlen — sonst nur Warnung, keine Löschung | Nutzerentscheidung; schützt vor einer fälschlich als "alles gelöscht" interpretierten unvollständigen Dataverse-Antwort | 2026-09-16 |
| E-Mail-Versand bei fehlgeschlagenem Lauf oder ausgelöster Löschungs-Sicherheitsschwelle über einen Transaktions-E-Mail-Dienst (Auswahl bei `/backend`, z.B. Resend) | Nutzerentscheidung für aktive Benachrichtigung statt nur Logs | 2026-09-16 |
| Die bisherigen Power-Automate-Push-Endpoints (`/api/sync/[entity]`) und das separate Backfill-Skript (`scripts/backfill-dataverse.ts`) werden bei `/backend` entfernt bzw. in die neue Cron-Route überführt | Nicht mehr Teil der Architektur; die Kernlogik (Dataverse lesen, Upsert-Mapping) wird in die neue Route verschoben statt dupliziert | 2026-09-16 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Datenfluss (kein UI — reines Infrastruktur-Feature)

> **Architektur-Wechsel 2026-09-16:** Ersetzt den ursprünglichen Power-Automate-Push-Ansatz (siehe Decision Log). Kein Power Automate mehr im Bild.

```
Vercel Cron (täglich 03:00 Uhr, konfiguriert in vercel.json)
  └─ HTTP GET/POST an /api/cron/sync-dataverse (mit Cron-Secret im Header,
     von Vercel automatisch mitgeschickt und von uns geprüft)

Next.js API-Route "/api/cron/sync-dataverse"
  └─ Für jede der 7 Entitäten (Firmen, Kontakte, Artikel, Standorte,
     Geräte, Prüfberichte, Relationen), nacheinander:
       1. Alle aktuellen Datensätze aus der Dataverse Web API lesen
          (paginiert, via @azure/msal-node authentifiziert)
       2. In Batches (nicht einzeln) per Upsert in die Supabase-Tabelle
          schreiben
       3. Abgleich: bestehende Zeilen in Supabase, deren Dataverse-ID
          NICHT im aktuellen Datensatz vorkommt, werden gelöscht
          (Soft-Delete bei Prüfberichten, Hard-Delete sonst) —
          ausser die Sicherheitsschwelle (siehe unten) schlägt an
  └─ Bei Erfolg: Lauf-Protokoll (Anzahl pro Entität) loggen
  └─ Bei Fehler: Fehler loggen UND E-Mail an den Admin senden

Sicherheitsschwelle gegen Massen-Löschung
  └─ Würden bei einer Entität mehr als 20% der zuvor bekannten Zeilen
     gelöscht, wird für DIESE Entität kein Löschen ausgeführt (Upserts
     laufen trotzdem durch), stattdessen eine Warnung geloggt + per
     E-Mail gemeldet — vermutlich ein technisches Problem, nicht echte
     Löschungen in Dataverse

Datenbank (Supabase/Postgres) — gespiegelte Tabellen
  └─ Wird von PROJ-2 (Login-Zuordnung) und PROJ-3/4/5 (Anzeige) gelesen — nie direkt von Dataverse
```

Das frühere separate Backfill-Skript entfällt: derselbe Job übernimmt beim allerersten Lauf automatisch die vollständige Erstbefüllung (die Datenbank wurde am 2026-09-16 bereits einmalig darüber befüllt: 302 Firmen, 1279 Artikel, 588 Kontakte, 203 Standorte, 8243 Geräte, 24'999 Prüfberichte, 548 Relationen). Die bisherigen Power-Automate-Push-Endpoints (`/api/sync/[entity]`) werden entfernt.

### Datenmodell (auf Basis der echten Dataverse-Solution `bmvcc`)

- **Kunden (aus `bmvcc_firma`):** Dataverse-ID, Firmenname, Adresse, E-Mail, Telefon, Website
- **Kontakte (aus `bmvcc_Kontakt`):** Dataverse-ID, Name, E-Mail (`bmvcc_mail` — Basis für Login-Zuordnung in PROJ-2), Telefon
- **Firma↔Kontakt-Zuordnung (aus `bmvcc_relation`):** Dataverse-ID, Kontakt-Referenz, Firma-Referenz, Rolle — ein Kontakt kann zu mehreren Firmen gehören
- **Standorte (aus `bmvcc_organizationlocation`):** Dataverse-ID, Bezeichnung, zugehörige Firma — Bindeglied zwischen Gerät und Kunde
- **Geräte (aus `bmvcc_equipmentrecord`):** Dataverse-ID, Gerätename, Seriennummer, Status (`bmvcc_Betriebsmittelstatus`), Datum letzte Prüfung (`bmvcc_Letztepruefung`), Standort-Referenz (→ Firma), Artikel-Referenz
- **Prüfberichte (aus `bmvcc_Pruefbericht`):** Dataverse-ID, Geräte-Referenz (`bmvcc_Gearaet`), Prüfdatum (`bmvcc_inspectiondate`), Ergebnis (`bmvcc_inspectionresult`), Prüfer, Archiviert-Kennzeichen, "gelöscht"-Kennzeichen (Soft-Delete, zusätzlich zu Dataverse' eigenem `bmvcc_isarchived`); PDF-Referenz folgt in PROJ-4
- **Artikel (aus `bmvcc_Artikel`):** Dataverse-ID, Bezeichnung, Artikelnummer, Norm/Standard, Hersteller

Jede Tabelle speichert die jeweilige Dataverse-ID als eindeutigen Schlüssel für den Upsert. Fremdschlüssel (z.B. Gerät → Standort, Standort → Firma) sind lose/nullable, damit die Reihenfolge eintreffender Sync-Events keine Rolle spielt.

### Technische Entscheidungen (Begründung)
Siehe Decision Log → Technical Decisions oben.

### Abhängigkeiten (Packages)
- `@supabase/supabase-js` — bereits aktiviert
- `zod` — bereits vorhanden
- `@azure/msal-node` — bereits vorhanden, jetzt vom täglichen Cron-Job genutzt statt nur vom (entfallenden) Backfill-Skript
- E-Mail-Versand: kein neues Paket nötig — direkter Aufruf der Resend-REST-API per `fetch` (bei `/backend` entschieden)

### Bekannte Datenqualitäts-Hinweise für `/backend`
- `bmvcc_equipmentrecord.bmvcc_KundenID` (Text) existiert parallel zur Standort-Relation — wird für den Sync ignoriert, könnte aber als Diagnose-Feld nützlich sein, falls ein Gerät keinen Standort hat
- `bmvcc_equipmentrecord.bmvcc_artikel_id` (int) und `cre77_artikel` (Lookup) referenzieren beide einen Artikel — vermutlich Altfeld vs. aktuelles Feld; `/backend` sollte klären, welches aktiv genutzt wird

## Implementation Notes (Backend)

> Diese Sektion wurde am 2026-09-16 komplett neu geschrieben — der ursprüngliche Power-Automate-Push-Ansatz (Endpoints, Backfill-Skript) wurde durch den täglichen Vercel-Cron-Job ersetzt, siehe Decision Log.

**Entfernt:** `src/app/api/sync/[entity]/`, `src/lib/sync/auth.ts`, `src/lib/sync/rate-limit.ts(.test.ts)`, `src/lib/sync/service.ts`, `scripts/backfill-dataverse.ts`, das `backfill:dataverse`-npm-Skript, die `tsx`-Dev-Dependency.

**Erstellt:**
- `vercel.json` — Cron-Konfiguration, täglich 03:00 Uhr (`0 3 * * *`)
- `src/app/api/cron/sync-dataverse/route.ts` — `GET`-Endpoint, den Vercel Cron täglich aufruft; prüft `CRON_SECRET`, ruft `runDataverseSync()` auf, verschickt bei Fehler/Warnung eine E-Mail (`maxDuration = 300`)
- `src/lib/sync/dataverse-client.ts` — Token-Beschaffung (`@azure/msal-node`, mit einfachem In-Memory-Cache) + paginiertes Lesen aus der Dataverse Web API
- `src/lib/sync/jobs.ts` — die 7 Entitäts-Jobs (Entity-Set, `$select`-Felder, Mapping-Funktion) — Feldnamen live gegen die echte Dataverse-Umgebung verifiziert
- `src/lib/sync/batch.ts` — `batchUpsert`/`batchDelete`/`batchSoftDelete` (Chunks à 500 Zeilen statt einzelner Aufrufe) sowie `fetchAllIds` (paginiertes Lesen bestehender IDs)
- `src/lib/sync/reconcile.ts` — reine Funktionen für die Differenz-Berechnung und die 20%-Sicherheitsschwelle
- `src/lib/sync/notify.ts` — E-Mail-Versand bei Fehler/Schwellenwert-Warnung via Resend-REST-API (`fetch`, kein SDK)
- `src/lib/sync/run-sync.ts` — Orchestrierung: pro Entität bestehende IDs lesen → Dataverse lesen → Batch-Upsert → Differenz-Abgleich → Löschen oder Warnen
- Tests: `src/lib/sync/reconcile.test.ts`, `src/lib/sync/run-sync.test.ts` (gemockte Dataverse-/Supabase-Aufrufe, inkl. Schwellenwert-Szenario), `src/app/api/cron/sync-dataverse/route.test.ts` (Auth, Erfolg, Warnung, Fehler) — 15 Tests, alle grün

**Umgebungsvariablen:**
- `SUPABASE_URL`, `SUPABASE_SECRET_KEY` — unverändert
- `CRON_SECRET` — vom Nutzer gesetzt, wird gegen den `Authorization: Bearer`-Header geprüft
- `DATAVERSE_URL`, `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` — unverändert, jetzt vom Cron-Job statt vom (entfallenen) Backfill-Skript genutzt
- `RESEND_API_KEY`, `ALERT_EMAIL_TO` — neu, für die E-Mail-Benachrichtigung
- `SYNC_API_KEY` wird nicht mehr benötigt (kann aus `.env.local` entfernt werden)

**Live gegen die echte Umgebung verifiziert (2026-09-16):**
- Voller Lauf über alle 7 Entitäten (~35'000 Datensätze) in ~21 Sekunden, HTTP 200 — weit innerhalb gängiger Vercel-Funktionslimits
- Löschungs-Erkennung: eine absichtlich eingefügte Test-Zeile in `dv_firmen` wurde beim nächsten Lauf korrekt erkannt und entfernt
- Auth: 401 ohne `CRON_SECRET`
- Ein einzelner Lauf schlug einmalig mit `TypeError: fetch failed` fehl (transienter Netzwerkfehler beim Batch-Upsert), der sofortige Retry lief fehlerfrei durch — falls das im Produktivbetrieb wiederholt auftritt, wäre eine Retry-Logik in `run-sync.ts` sinnvoll (aktuell nicht vorhanden)

**Abweichungen / offene Punkte:**
- Kein automatischer Retry bei einem transienten Fehler innerhalb eines Laufs (siehe oben) — für MVP akzeptiert, da der nächste tägliche Lauf es ohnehin erneut versucht
- `RESEND_API_KEY`/`ALERT_EMAIL_TO` wurden vom Nutzer gesetzt, aber der tatsächliche E-Mail-Versand bei einem echten Fehlschlag wurde noch nicht end-to-end getestet (nur der Aufruf-Pfad im Code)

## QA Test Results

**Tested:** 2026-09-16
**App URL:** http://localhost:3000 (API-only, keine UI)
**Tester:** QA Engineer (AI)

> Hinweis: PROJ-1 hat keine Oberfläche (reines Infrastruktur-Feature laut Tech Design). Cross-Browser-, Responsive- und Playwright-E2E-Tests entfallen daher; getestet wurde via `npm test` (Vitest, gemockter Supabase-Client) sowie manuell per `curl` gegen den laufenden Dev-Server **und das echte Supabase-Projekt** (keine Mocks) inkl. Aufräumen aller Testdaten danach.

### Acceptance Criteria Status

#### AC-1: Upsert bei Erstellen/Ändern (alle 7 Entitäten)
- [x] firmen, geraete, pruefberichte, kontakte, artikel, standorte, relationen — je einzeln getestet, alle per Upsert korrekt gespeichert

#### AC-2: Prüfbericht-Löschung = Soft-Delete
- [x] Verifiziert direkt in der Datenbank: Zeile bleibt bestehen, `deleted_at` wird gesetzt

#### AC-3: Andere Entitäten = Hard-Delete
- [x] Verifiziert: Zeile ist nach dem Löschen tatsächlich weg (0 Treffer bei Abfrage)

#### AC-4: Ungültiger/fehlender API-Key → 401
- [x] Ohne Header → 401; mit falschem Key → 401

#### AC-5: Power-Automate-Retry + E-Mail bei endgültigem Fehlschlag
- [ ] BUG: Nicht vollständig testbar — die Retry-/E-Mail-Logik liegt in Power Automate selbst, das noch nicht eingerichtet ist. Getestet wurde nur, dass unser Endpoint bei einem echten Serverfehler korrekt HTTP 500 liefert (Voraussetzung dafür, dass Power Automates Retry überhaupt greift) — siehe BUG-1, der zeigt, dass ein 500 aktuell in einem eigentlich gültigen Fall auftritt

#### AC-6: Initialer Backfill
- [ ] BUG: Nicht ausgeführt/verifiziert — noch keine echten Zugangsdaten-Tests gegen die produktive Dataverse-Umgebung, und die OData-Lookup-Feldnamen im Skript sind laut Implementation Notes unverifiziert. Vor Produktivbetrieb zwingend nachzuholen.

#### AC-7: Upsert ist idempotent (Update statt Duplikat)
- [x] Gleiche ID zweimal gesendet (unterschiedliche Werte) → ein Datensatz, aktualisierte Werte

### Edge Cases Status

#### EC-1: Race Condition (zwei schnelle Änderungen am selben Datensatz)
- [x] Last-Write-Wins bestätigt (Upsert überschreibt vollständig)

#### EC-2: Doppelter Trigger (Power-Automate-Retry nach vermeintlichem Fehler)
- [x] Idempotent — zweiter identischer Aufruf verändert nichts Unerwartetes

#### EC-3: Prüfbericht trifft vor zugehörigem Gerät ein (Reihenfolge nicht garantiert)
- [x] BUG-1 gefixt (siehe unten) und am 2026-09-16 live erneut verifiziert: Prüfbericht mit nicht-existierendem `geraet_id` wird jetzt korrekt gespeichert (HTTP 200, Zeile vorhanden)

#### EC-4: Übergeordneter Datensatz wird hart gelöscht, Kinder existieren noch
- [x] Verifiziert: `ON DELETE SET NULL` funktioniert korrekt — nach Hard-Delete des Geräts wurde `geraet_id` beim zugehörigen (soft-gelöschten) Prüfbericht automatisch auf `null` gesetzt

#### EC-5: Backfill-Skript versehentlich zweimal ausgeführt
- [ ] Nicht getestet (Skript wurde noch gar nicht live ausgeführt, siehe AC-6)

### Security Audit Results
- [x] Authentication: Kein Zugriff ohne (korrekten) `x-api-key` möglich
- [x] Input validation: SQL-Injection-artiger String (`'; DROP TABLE ...`) und `<script>`-Payload wurden als reiner Text gespeichert, nicht ausgeführt — Supabase-Client parametrisiert korrekt
- [x] Keine Secrets/Stack-Traces in Fehler-Antworten (500 liefert leeren Body, Details nur serverseitig im Log)
- [ ] BUG (Medium): Kein Rate-Limiting auf einem öffentlich erreichbaren Endpoint mit nur einem einzigen, langlebigen, statischen Shared Secret — bei einem Leak des `SYNC_API_KEY` hätte ein Angreifer unbegrenzten Schreib-/Löschzugriff auf alle 7 Tabellen, ohne Drosselung. Für MVP laut Checklist optional, aber als Risiko dokumentiert.
- [ ] Authorization (Autorisierung zwischen Kunden): nicht anwendbar für PROJ-1 — dieses Feature hat keine Endnutzer-Rollen, das ist Gegenstand von PROJ-2

### Bugs Found

#### BUG-1: Fremdschlüssel sind nicht wirklich "lose" — Sync schlägt bei Out-of-Order-Events fehl
- **Severity:** Critical
- **Steps to Reproduce:**
  1. `POST /api/sync/pruefberichte` mit einem `geraet_id`, das noch keine existierende Zeile in `dv_geraete` hat (z.B. weil das Gerät noch nicht synchronisiert wurde)
  2. Erwartet laut Spec/Tech Design: Der Datensatz wird trotzdem gespeichert (lose Referenz), die Verknüpfung vervollständigt sich, sobald das Gerät später eintrifft
  3. Tatsächlich: HTTP 500, der Datensatz wird gar nicht gespeichert (Postgres-Fehler `insert or update on table "dv_pruefberichte" violates foreign key constraint`)
- **Ursache:** `supabase/migrations/0001_dataverse_sync_schema.sql` definiert die Fremdschlüssel als echte `references ... on delete set null` — das steuert nur das Verhalten beim Löschen der Eltern-Zeile, verhindert aber nicht, dass Postgres beim Einfügen eine existierende Eltern-Zeile verlangt
- **Priority:** Fix before deployment (widerspricht einer explizit dokumentierten und vom Nutzer bestätigten Architektur-Entscheidung; betrifft mehrere Beziehungen: Prüfbericht→Gerät, Gerät→Standort, Gerät→Artikel, Standort→Firma, Relation→Firma/Kontakt)
- **Status:** ✅ Gefixt am 2026-09-16 (`supabase/migrations/0002_dataverse_sync_loose_foreign_keys.sql` entfernt die FK-Constraints, Spalten bleiben als normale, indizierte IDs bestehen). Live gegen das echte Supabase-Projekt erneut verifiziert.

#### BUG-2: Kein Rate-Limiting auf dem Sync-Endpoint
- **Severity:** Medium
- **Steps to Reproduce:** Beliebig viele Requests mit gültigem `x-api-key` hintereinander senden — keine Drosselung, kein 429
- **Priority:** Nice to have (für MVP laut Checklist optional), aber vor Produktiv-Go-Live mit echten Kundendaten empfehlenswert, gegen Key-Leak abzusichern

#### BUG-3: Backfill-Skript und Power-Automate-Retry/E-Mail-Verhalten unverifiziert
- **Severity:** High
- **Steps to Reproduce:** N/A — schlicht noch nicht gegen echte Dataverse-Zugangsdaten bzw. echte Power-Automate-Flows getestet
- **Priority:** Fix before deployment — muss vor Go-Live einmal echt durchgespielt werden, sonst bleibt AC-6 und AC-5 unbestätigt

### Retest 2026-09-16 (nach BUG-1-Fix)

- `npm test` — 8/8 grün
- Alle 5 betroffenen Beziehungen einzeln erneut mit absichtlich fehlendem Elternteil getestet (Standort→Firma, Gerät→Standort, Gerät→Artikel, Relation→Firma, Relation→Kontakt) — jeweils HTTP 200, Datensatz korrekt gespeichert statt HTTP 500
- AC-1 und EC-3 damit vollständig bestanden; BUG-1 geschlossen
- BUG-2 (Rate-Limiting) und BUG-3 (Backfill/Power-Automate live unverifiziert) bestehen weiterhin unverändert fort

### Summary
- **Acceptance Criteria:** 5/7 vollständig bestanden (inkl. AC-1 jetzt vollständig), 1 teilweise (AC-5, weiterhin nur indirekt testbar), 1 nicht verifizierbar in dieser Umgebung (AC-6 Backfill, siehe BUG-3)
- **Bugs Found:** 3 total, 1 behoben (1 Critical — gefixt, 1 High offen, 1 Medium offen)
- **Security:** Grundsätzlich solide (Auth, Injection-Schutz, keine Secret-Leaks), aber kein Rate-Limiting (Medium, offen)
- **Production Ready:** NO
- **Recommendation:** BUG-1 (Critical) ist behoben und verifiziert. BUG-3 (High — Backfill-Skript und Power-Automate-Retry/E-Mail-Verhalten live verifizieren) muss vor Go-Live noch nachgezogen werden, da Kernfunktionalität (Erstbefüllung) unbestätigt ist. BUG-2 (Rate-Limiting, Medium) kann für den MVP-Start akzeptiert werden, sollte aber zeitnah nachgezogen werden.

## Deployment
_To be added by /deploy_
