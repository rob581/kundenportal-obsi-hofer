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

> **Diese QA-Runde (2026-09-16) ersetzt die vorherige vollständig** — die alte Runde testete den inzwischen entfernten Power-Automate-Push-Ansatz. Alle Bugs/ACs von damals (BUG-1/2/3, AC-1 bis AC-7 alter Nummerierung) sind mit dem Architektur-Wechsel gegenstandslos geworden, ausser dem losen-Fremdschlüssel-Fix, der unverändert übernommen wurde.

**Tested:** 2026-09-16
**App URL:** http://localhost:3001 (API-only, keine UI; Dev-Server lief auf 3001, da 3000 belegt war)
**Tester:** QA Engineer (AI)

> Hinweis: PROJ-1 hat keine Oberfläche. Cross-Browser-, Responsive- und Playwright-E2E-Tests entfallen daher. Getestet wurde via `npm test` (Vitest, gemockte Dataverse-/Supabase-Aufrufe) sowie live per `curl` gegen den laufenden Dev-Server **und die echte Dataverse-/Supabase-Umgebung** (keine Mocks), inkl. Aufräumen der Testdaten danach.

### Acceptance Criteria Status

#### AC-1: Täglicher Cron-Job liest alle 7 Entitäten und upserted sie
- [x] Live verifiziert: voller Lauf über alle 7 Entitäten (302 Firmen, 1279 Artikel, 588 Kontakte, 203 Standorte, 8243 Geräte, 24'999 Prüfberichte, 548 Relationen) in ~21s, HTTP 200

#### AC-2: Verschwundener Prüfbericht → Soft-Delete
- [x] Durch Unit-Test abgedeckt (`run-sync.test.ts`); Mechanismus identisch zum bereits live verifizierten Löschpfad unten

#### AC-3: Verschwundener Datensatz einer anderen Entität → Hard-Delete
- [x] Live verifiziert: absichtlich eingefügte Test-Zeile in `dv_firmen` wurde beim nächsten Lauf korrekt und endgültig entfernt

#### AC-4: Cron-Endpoint ohne/mit falschem Secret → 401
- [x] Live verifiziert (ohne Header → 401) + Unit-Test für falschen Wert

#### AC-5: Fehlgeschlagener Lauf wird protokolliert + Admin benachrichtigt
- [ ] BUG: Teilweise erfüllt — bei einem Fehler **innerhalb** von `runDataverseSync()` funktioniert das (siehe Unit-Test). Bei fehlendem `CRON_SECRET` (Konfigurationsfehler) gibt es aber **weder Log noch E-Mail** — siehe BUG-1

#### AC-6: Erster Lauf übernimmt automatisch die Erstbefüllung
- [x] Faktisch bereits erfolgt — die Datenbank war vor dem allerersten Cron-Lauf leer und wurde vollständig befüllt (ursprünglich über das jetzt entfallene Backfill-Skript, das dieselbe Upsert-Logik nutzte)

#### AC-7: Upsert ist idempotent
- [x] Zweiter Lauf direkt nacheinander (ohne Datenänderung) → keine Duplikate, `deleted: 0` für alle Entitäten

### Edge Cases Status

#### EC-1: Job läuft zweimal am selben Tag
- [x] Live getestet (zwei Läufe direkt nacheinander) — unkritisch, wie erwartet

#### EC-2: Reihenfolge innerhalb eines Laufs (lose Fremdschlüssel)
- [x] Bereits aus der vorherigen QA-Runde bestätigt, Migration `0002` unverändert in Kraft

#### EC-3: Unvollständige Dataverse-Antwort → Risiko von Massen-Löschungen
- [x] 20%-Sicherheitsschwelle durch Unit-Test abgedeckt (50% fehlend → Löschung übersprungen + Warnung)

#### EC-4: Laufzeit bei ~30'000 Datensätzen
- [x] Live verifiziert: ~21 Sekunden für ~35'000 Datensätze — weit innerhalb selbst konservativer Vercel-Funktionslimits

#### EC-5: Gerät/Kunde verschwindet, obwohl Kinder-Datensätze noch referenzieren
- [x] Bereits aus der vorherigen QA-Runde bestätigt (`ON DELETE SET NULL`)

### Security Audit Results
- [x] Authentication: Kein Zugriff ohne korrektes `CRON_SECRET` möglich (401 live verifiziert)
- [x] Keine Secrets in Fehlermeldungen (Stichprobe der Fehlermeldungen enthält nur Tabellen-/Entitätsnamen)
- [ ] BUG (Low): `CRON_SECRET`-Vergleich nutzt `===` (kein zeitkonstanter Vergleich) — theoretisches Timing-Angriffs-Risiko, praktisch sehr gering relevant für ein Secret, das nur Vercel selbst kennt
- [ ] Kein Rate-Limiting auf dem Cron-Endpoint — bewusst akzeptiert (einziger vorgesehener Aufrufer ist Vercel Cron selbst), kein Bug
- [ ] Authorization (zwischen Kunden): nicht anwendbar für PROJ-1, siehe PROJ-2

### Bugs Found

#### BUG-1: Fehlendes `CRON_SECRET` führt zu unbehandeltem Absturz statt Fehlermeldung — keine Benachrichtigung
- **Severity:** High
- **Steps to Reproduce:**
  1. `CRON_SECRET` in der Umgebung nicht setzen (z.B. vergessen bei einem neuen Vercel-Deployment)
  2. Cron-Endpoint aufrufen
  3. Erwartet: irgendeine Fehlerantwort, idealerweise mit Log + Admin-E-Mail
  4. Tatsächlich: `isAuthorized()` wirft eine Exception **vor** dem try/catch-Block in der Route — kein Log über `console.error`, keine E-Mail, nur ein generischer unbehandelter Next.js-Fehler
- **Bestätigt durch:** neuen Test `"BUG: throws unhandled instead of responding gracefully when CRON_SECRET is unset"` in `route.test.ts`
- **Warum das wichtig ist:** widerspricht direkt AC-5 ("Admin wird benachrichtigt") — ausgerechnet im Konfigurationsfehler-Fall bleibt der Ausfall unbemerkt, bis jemand händisch nachschaut
- **Priority:** Fix before deployment

#### BUG-2: Ein fehlgeschlagener Entity-Job verhindert das Sync aller nachfolgenden Entitäten im selben Lauf
- **Severity:** High
- **Steps to Reproduce:**
  1. Der Job für eine Entität (z.B. Artikel) schlägt fehl (dies ist während der Entwicklung tatsächlich einmal live passiert, mit einem transienten `TypeError: fetch failed` bei Geräte)
  2. Erwartet: die übrigen, unabhängigen Entitäten (Standorte, Geräte, Prüfberichte, Relationen) werden trotzdem synchronisiert
  3. Tatsächlich: `runDataverseSync()` verarbeitet die 7 Entitäten in einer einzigen Schleife ohne Try/Catch pro Job — ein Fehler bricht die gesamte restliche Schleife ab, alle danach kommenden Entitäten werden diesen Lauf gar nicht erst versucht
- **Bestätigt durch:** neuen Test `"BUG: a failure on one entity prevents every later entity from syncing that run"` in `run-sync.test.ts`
- **Warum das wichtig ist:** genau dieses Verhalten trat während der Implementierung real auf; ein einzelner transienter Netzwerkfehler bei einer Entität lässt mehrere andere, an sich fehlerfreie Entitäten einen ganzen Tag lang veraltet
- **Priority:** Fix before deployment — Vorschlag: pro Entität try/catch, alle Fehler sammeln und am Ende in einer E-Mail zusammenfassen, statt beim ersten Fehler ganz abzubrechen

### Summary
- **Acceptance Criteria:** 6/7 vollständig bestanden, 1 teilweise (AC-5, siehe BUG-1)
- **Bugs Found:** 2 total (2 High, davon 0 behoben)
- **Security:** Grundsätzlich solide, ein Low-Finding (Timing-Vergleich, praktisch irrelevant)
- **Production Ready:** NO
- **Recommendation:** Beide High-Bugs sollten vor dem produktiven Go-Live behoben werden — BUG-1, weil ausgerechnet der Ausfallmelde-Mechanismus selbst lautlos versagen kann, und BUG-2, weil er real reproduziert wurde und die Zuverlässigkeit des täglichen Syncs direkt untergräbt. Beide sind mit überschaubarem Aufwand behebbar (try/catch pro Job in `run-sync.ts`, try/catch um die Auth-Prüfung in der Route).

## Deployment
_To be added by /deploy_
