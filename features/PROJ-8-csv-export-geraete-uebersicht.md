# PROJ-8: CSV-Export der Geräte-Übersicht

## Status: Deployed
**Created:** 2026-09-22
**Last Updated:** 2026-09-22

## Dependencies
- Requires: PROJ-3 (Geräte-Übersicht) — exportiert deren gefilterte Geräteliste
- Requires: PROJ-7 (Kundenspezifische Spalten) — die im Export enthaltenen Zusatzspalten folgen derselben Firma-Konfiguration wie die Übersicht-Tabelle

## User Stories
- Als Kunde möchte ich meine (gefilterte) Geräteliste als CSV-Datei herunterladen können, damit ich sie in Excel oder einem eigenen Reporting-Tool weiterverwenden kann.
- Als Kunde mit vielen Geräten möchte ich beim Export nicht auf die aktuell angezeigte Seite (25 Einträge) beschränkt sein, sondern alle zu meinen Filtern passenden Geräte erhalten.
- Als Kunde möchte ich, dass der Export dieselben Zusatzspalten enthält, die für meine Firma aktiviert sind, damit ich keine Informationen manuell nachschlagen muss.
- Als Kunde möchte ich auch Detailinformationen (z.B. Standort, Prüfer, Hersteller), die nicht in der Tabelle sichtbar sind, im Export vorfinden, damit ich nicht jedes Gerät einzeln öffnen muss.
- Als OBSI Hofer GmbH möchte ich, dass der Export in Schweizer Excel korrekt aussieht (Umlaute, Spaltentrennung), damit Kunden keine technischen Probleme melden.

## Out of Scope
- Export der Prüfberichte-Liste (PROJ-4) — eigenes, separates Feature, falls später gewünscht
- Weitere Dateiformate (Excel .xlsx, PDF) — nur CSV in v1
- Geplante/automatische Exporte (z.B. wöchentlich per E-Mail) — Non-Goal laut PRD (keine automatischen Benachrichtigungen)
- Manuelle Spaltenauswahl durch den Kunden für den Export — folgt automatisch der bestehenden PROJ-7-Firma-Konfiguration, kein zusätzlicher UI-Schritt
- Export der Dashboard-Kennzahlen (PROJ-5) — nur die Geräte-Übersicht selbst
- Künstliche Obergrenze für die Anzahl exportierbarer Geräte — bewusst nicht limitiert, siehe Decision Log

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Kunde ist auf der Geräte-Übersicht mit mindestens einem Treffer, wenn er auf "Als CSV exportieren" klickt, dann wird eine CSV-Datei mit dem Namen `geraete-uebersicht-YYYY-MM-DD.csv` (aktuelles Datum) heruntergeladen
- [ ] Angenommen Status-Filter, Suche oder der "Zu prüfen"-Filter (PROJ-7) sind gesetzt, wenn der Export ausgelöst wird, dann enthält die CSV ausschliesslich die Geräte, die diesen Filtern entsprechen, über alle Seiten hinweg (nicht nur die aktuell angezeigte Seite)
- [ ] Angenommen für die Firma sind Zusatzspalten aktiviert (PROJ-7), wenn der Export erstellt wird, dann enthält die CSV zusätzlich zu den immer enthaltenen Feldern auch genau diese Zusatzspalten, in derselben festen Reihenfolge wie in der Übersicht-Tabelle
- [ ] Angenommen für die Firma sind keine Zusatzspalten aktiviert, wenn der Export erstellt wird, dann enthält die CSV nur die immer enthaltenen Standard-/Detailfelder, keine der PROJ-7-Zusatzspalten
- [ ] Angenommen die aktuellen Filter liefern keine Treffer, wenn der Kunde die Übersicht betrachtet, dann ist der "Als CSV exportieren"-Button deaktiviert
- [ ] Angenommen der Export schlägt fehl (z.B. Datenbank kurzzeitig nicht erreichbar), wenn der Kunde auf "Als CSV exportieren" klickt, dann erscheint eine Fehlermeldung, es wird keine Datei heruntergeladen, und der Kunde bleibt auf der Seite
- [ ] Angenommen ein Freitextfeld (z.B. Bemerkungen oder KundenID) beginnt mit einem Zeichen wie `=`, `+`, `-` oder `@`, wenn die CSV erstellt wird, dann wird der Wert so escaped, dass Excel ihn beim Öffnen nicht als Formel interpretiert
- [ ] Angenommen die Datei wird in Excel (Schweizer/deutsche Version) geöffnet, dann werden Spalten korrekt getrennt (Semikolon als Trennzeichen) und Umlaute korrekt dargestellt (UTF-8 mit BOM)

## Edge Cases
- Firma mit mehreren hundert Geräten → Export darf nicht am selben Problem scheitern wie der bereits behobene Dashboard-Bug (BUG-2, PROJ-5: zu lange Datenbank-Anfrage bei vielen IDs in einem Request) — muss intern batched/paginiert abgefragt werden, für den Kunden aber als ein einziger, vollständiger Export erscheinen
- Freitextfelder enthalten das Trennzeichen Semikolon selbst (z.B. in Bemerkungen) → Wert wird gemäss CSV-Standard in Anführungszeichen gesetzt, damit die Spaltenaufteilung nicht verrutscht
- Freitextfelder enthalten Zeilenumbrüche → ebenfalls korrekt gequotet, damit kein zusätzlicher CSV-Datensatz entsteht
- Kunde mit mehreren Firmen wechselt die aktive Firma (PROJ-2) → Export bezieht sich immer auf die aktuell ausgewählte Firma, exakt wie die Übersicht selbst
- Gerät ohne Wert für ein exportiertes Feld → Zelle bleibt leer (kein "—" wie in der UI, da CSV oft maschinell weiterverarbeitet wird)
- `bmvcc_KundenID` oder andere Freitextfelder enthalten potenziell schädliche Formel-Präfixe (`=`, `+`, `-`, `@`) → werden escaped (siehe AC), verhindert CSV-Injection beim Öffnen in Excel

## Technical Requirements (optional)
- Zugriffsbeschränkung: Export-Abfrage ist serverseitig auf die aktuell ausgewählte Firma beschränkt, identische Firma-Isolation wie PROJ-3/PROJ-7 — keine neue Angriffsfläche
- Performance: Muss auch bei Firmen mit mehreren hundert/tausend Geräten zuverlässig funktionieren (siehe Edge Cases) — Batching-Strategie analog zum PROJ-5-Fix
- Format: CSV mit Semikolon als Trennzeichen, UTF-8 mit BOM, Standard-Quoting für Werte mit Semikolon/Zeilenumbruch/Anführungszeichen
- Sicherheit: CSV-Injection-Schutz für alle Freitextfelder (siehe Acceptance Criteria)

## Open Questions
Keine offenen Fragen — alle Kernentscheidungen wurden im Interview getroffen.

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Export umfasst alle gefilterten Geräte über alle Seiten hinweg, nicht nur die aktuell angezeigte Seite (25 Einträge) | Ein Export, der bei grösseren Firmen nur einen Bruchteil der Geräte liefert, wäre für Reporting-Zwecke kaum brauchbar; Paginierung ist ein reines Anzeige-Detail | 2026-09-22 |
| Spalten = Standard-Tabellenspalten + alle Detailseite-Felder, die nicht Teil des PROJ-7-Zusatzspalten-Pools sind (Standort, Ablegereife, Prüfer, Herstelljahr, Hersteller, Norm) immer enthalten; die PROJ-7-Zusatzspalten (Seriennummer, Barcode, KundenID, Zubehör, Bemerkungen, Typ, Dimension) nur wenn für die Firma aktiviert | Nutzerentscheidung im Interview: möglichst vollständiger Export, aber die firmenspezifische Sichtbarkeits-Logik aus PROJ-7 (insbesondere für KundenID) bleibt konsistent erhalten statt sie im Export zu umgehen | 2026-09-22 |
| Trennzeichen: Semikolon statt Komma | Schweizer/deutsche Excel-Version nutzt Komma als Dezimaltrennzeichen und würde eine Komma-CSV nicht automatisch in Spalten aufteilen; passt zur bestehenden `de-CH`-Formatierung im Portal | 2026-09-22 |
| Encoding: UTF-8 mit BOM | Ohne BOM interpretiert Excel unter Windows UTF-8-Dateien oft fälschlich als ANSI, wodurch Umlaute (ä/ö/ü) als Zeichensalat erscheinen | 2026-09-22 |
| Export-Button neben der Filterleiste, exportiert automatisch mit den aktuell gesetzten Filtern | Kein zusätzlicher UI-Schritt nötig; Filter bereits gesetzt, wenn der Kunde exportieren möchte | 2026-09-22 |
| Button deaktiviert bei 0 Treffern | Ein Export mit nur der Kopfzeile ohne Daten wäre verwirrend und bietet keinen Mehrwert | 2026-09-22 |
| Fehler beim Export zeigt eine Inline-Fehlermeldung, keine leere/kaputte Datei | Gleiches Muster wie die bestehenden Fehler-Zustände in der Übersicht (PROJ-3) | 2026-09-22 |
| Dateiname: `geraete-uebersicht-YYYY-MM-DD.csv`, ohne Firmenname | Einfach und eindeutig genug; der Kunde kann ohnehin nur seine eigene Firma exportieren | 2026-09-22 |
| Keine Obergrenze für die Anzahl exportierbarer Geräte | Kunde soll immer alle seine Geräte exportieren können; die technische Herausforderung bei vielen Geräten wird bei `/architecture`/`/backend` gelöst, nicht dem Kunden als Limit auferlegt | 2026-09-22 |
| Fehlende Werte bleiben in der CSV leer statt "—" wie in der UI | CSV wird oft maschinell weiterverarbeitet (Formeln, Re-Import) — "—" als Text würde dort stören | 2026-09-22 |
| CSV-Injection-Schutz für Freitextfelder (Escaping bei `=`/`+`/`-`/`@`-Präfix) | Bekanntes Sicherheitsrisiko bei CSV-Exporten mit Freitext-Herkunft aus Dataverse; geringer Zusatzaufwand, verhindert dass Excel Werte als Formel ausführt | 2026-09-22 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Neuer Route Handler (`src/app/api/uebersicht/export`) statt Server Action | Ein Datei-Download braucht eine echte, navigierbare URL mit passenden HTTP-Headern (Dateiname, Dateityp); ein einfacher Link, den der Browser direkt aufruft, ist robuster als eine Server Action, die im Client erst eine Datei aus Rohdaten zusammenbauen müsste | 2026-09-22 |
| Route Handler prüft die Kunden-Session selbst (analog zum bestehenden Cron-Endpoint, nur mit normaler Supabase-Session statt Secret) | API-Routen liegen ausserhalb der automatischen Schutzschicht von `(protected)/layout.tsx`, die nur für Seiten gilt | 2026-09-22 |
| Export-Abfrage wiederverwendet dieselbe Firma→Standort-Auflösung und denselben Status-/Suche-/Zu-prüfen-Filter wie `getGeraeteList` (PROJ-3/PROJ-7), nur ohne `.range()`-Seitenbegrenzung | Vermeidet zwei unabhängige Implementierungen derselben Firma-Isolation und Filterlogik — ein künftiger Fix an einer Stelle wirkt automatisch auch am Export | 2026-09-22 |
| Artikel-Zusatzinformationen für den Export werden in Gruppen abgefragt (Batching), nicht in einer einzigen Anfrage mit allen Artikel-IDs | Gleiche Ursache wie der bereits behobene Dashboard-Bug (PROJ-5 BUG-2): eine `.in()`-Anfrage mit sehr vielen IDs kann die Anfrage-URL so lang machen, dass die zugrunde liegende Anfrage fehlschlägt, statt eine saubere Antwort zu liefern | 2026-09-22 |
| Die komplette CSV wird in einem Rutsch im Arbeitsspeicher erzeugt und zurückgegeben, kein Streaming | Bei der zu erwartenden Grössenordnung (deutlich unter 100'000 Geräte pro Firma) unproblematisch und deutlich einfacher umzusetzen als eine gestreamte Antwort | 2026-09-22 |
| Kein neues Package für die CSV-Erzeugung | Die nötigen Regeln (Semikolon-Trennung, Anführungszeichen bei Sonderzeichen, Formel-Escaping) sind einfach genug für eine kleine, selbst geschriebene Hilfsfunktion — spart eine zusätzliche Abhängigkeit für eine überschaubare Aufgabe | 2026-09-22 |
| Export-Button lebt als serverseitig gerenderter Link (kein Client-Component-Zustand nötig) | Der Deaktiviert-Zustand (0 Treffer) ist bereits auf der Seite bekannt (`result.total`); die aktuellen Filter stehen bereits als URL-Parameter zur Verfügung und werden 1:1 an den Export-Link weitergereicht | 2026-09-22 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponenten-Struktur

```
/uebersicht (bestehende PROJ-3/PROJ-7-Seite, erweitert)
├── AppHeader (unverändert)
├── GeraeteFilterBar (unverändert)
├── NEU: "Als CSV exportieren"-Link/Button
│   ├── Deaktiviert, wenn die aktuellen Filter 0 Treffer liefern
│   └── Trägt die aktuellen Filter (Status/Suche/Zu-prüfen) als URL-Parameter zum Export-Endpunkt weiter
└── Geräte-Tabelle (unverändert, PROJ-3/PROJ-7)

NEU: /api/uebersicht/export (Route Handler)
├── Prüft die Kunden-Session (wie jede geschützte Seite, aber selbst implementiert)
├── Löst die aktuell ausgewählte Firma auf (wie /uebersicht)
├── Liest dieselben Filter-Parameter wie /uebersicht (Status, Suche, Zu-prüfen)
├── Liest die Firma-Einstellungen (PROJ-7), um die aktivierten Zusatzspalten zu bestimmen
├── Baut die vollständige, ungepaginierte Geräteliste inkl. aller Detailfelder
└── Liefert eine CSV-Datei als Download-Antwort (Dateiname, Content-Type als HTTP-Header)
```

### Datenmodell (in Textform)

- Kein neues Datenfeld, keine neue Tabelle — der Export liest exakt dieselben Daten wie die Übersicht (Geräte, Artikel, Firma-Einstellungen), nur ohne die 25er-Seitenbegrenzung
- Jede Export-Zeile entspricht einem Gerät mit denselben Feldern, die im Interview festgelegt wurden (Standard-/Detailfelder immer, PROJ-7-Zusatzspalten nur wenn für die Firma aktiviert, in derselben festen Reihenfolge wie in der Übersicht-Tabelle)
- Die Datei wird nicht gespeichert — sie entsteht bei jedem Klick frisch aus der Datenbank und wird direkt zum Download geschickt, kein Zwischenspeichern in Supabase Storage o.ä.

### Technische Entscheidungen (Begründung)
Siehe Decision Log → Technical Decisions oben.

### Abhängigkeiten (Packages)
Keine neuen — nutzt die bestehende Supabase-Anbindung, keine externe CSV-Bibliothek nötig (siehe Decision Log).

## Implementation Notes (Frontend)

- `src/app/(protected)/uebersicht/page.tsx`: neuer "Als CSV exportieren"-Button neben `GeraeteFilterBar`, in einem gemeinsamen Flex-Wrapper (Verantwortung für den Zeilenabstand von `GeraeteFilterBar` in den Wrapper verschoben, um doppelten Abstand zu vermeiden — `GeraeteFilterBar` selbst dafür um `flex-1` ergänzt).
- Bei `result.total === 0` wird ein deaktivierter `Button` gerendert; sonst ein `Button` mit `asChild`, der einen echten `<a href="/api/uebersicht/export?...">` umschliesst — bewusst kein Client-Component-Zustand nötig, da sowohl der Deaktiviert-Zustand als auch die aktuellen Filter bereits server-seitig auf der Seite bekannt sind.
- Export-Link übernimmt `status`, `suche` und `zuPruefen` 1:1 aus den aktuellen `searchParams`, lässt `seite` bewusst weg (Export ist laut Spec nie auf eine Seite beschränkt).
- Der Route Handler `/api/uebersicht/export` existiert noch nicht — der Link führt bis `/backend` zu einem 404. Kein Mock nötig, da hier (anders als bei früheren Features) keine UI von den Antwortdaten abhängt, die getestet werden müsste — nur der Link selbst, sein deaktivierter Zustand und die Filter-Weitergabe.
- `npx tsc --noEmit`, `npx eslint`, `npx vitest run` (92 Tests, unverändert) und `npm run build` laufen fehlerfrei durch.
- Noch offen (für `/backend`): der eigentliche Route Handler inkl. Session-Prüfung, ungepaginierte Firma-gefilterte Geräteabfrage (mit Batching für die Artikel-Zusatzinfos), CSV-Erzeugung (Semikolon, UTF-8-BOM, Formel-Escaping, Quoting) und der Download-Response-Header.
- **Korrektur während `/backend` (2026-09-22):** Der ursprüngliche, rein serverseitig gerenderte `<a href>`-Link kann eine Acceptance Criterion nicht erfüllen — "der Kunde bleibt auf der Seite" bei einem fehlgeschlagenen Export. Ein Browser, der einem Link zu einer Fehler-Antwort folgt, navigiert weg von `/uebersicht`. Ersetzt durch die neue Client-Component `src/components/export-csv-button.tsx`: ruft den Export per `fetch()` auf, prüft `response.ok` **und** `Content-Type` (fängt auch den Fall ab, dass eine zwischenzeitlich abgelaufene Session zur HTML-Login-Seite umleitet, der `fetch()` sonst stillschweigend folgen würde), löst bei Erfolg den Download über einen `Blob`/`URL.createObjectURL` aus, und zeigt bei Fehler eine Inline-Fehlermeldung ohne Navigation. `uebersicht/page.tsx` reicht nur noch `href` und `disabled` als Props durch.

## Implementation Notes (Backend)

- `src/lib/geraete/queries.ts`: gemeinsame Filterlogik (Status/Suche/Zu-prüfen) aus `getGeraeteList` in eine private, generische Hilfsfunktion `applyGeraeteFilters` extrahiert, die jetzt von beiden Abfragen genutzt wird — verhindert, dass Übersicht und Export bei einem künftigen Filter-Fix auseinanderlaufen.
- Neue exportierte Funktion `getGeraeteExportRows(firmaId, filters)`: identische Firma→Standort-Auflösung wie `getGeraeteList`, aber ohne `.range()` — liefert immer **alle** zu den Filtern passenden Geräte einer Firma.
- `getArtikelMapFuerIds` batcht den Artikel-Lookup jetzt intern in Gruppen von 200 IDs (`ARTIKEL_LOOKUP_CHUNK_SIZE`), statt alle IDs in einer `.in()`-Abfrage zu bündeln — gleiche Ursache/Fix wie der bereits behobene Dashboard-Bug (PROJ-5 BUG-2: zu lange Anfrage-URL bei vielen IDs lässt `fetch()` fehlschlagen). Für die bestehende, paginierte `getGeraeteList` (max. 25 Geräte/Seite) ist das ein No-op, war aber für den unpaginierten PROJ-8-Export nötig.
- `getStandorteFuerFirma` (bisher privat) exportiert, da `getGeraeteExportRows` dieselbe Firma→Standort-Namensauflösung braucht wie `getGeraeteList`.
- Neues Modul `src/lib/geraete/export-csv.ts`: `ALWAYS_COLUMNS` (Gerät, Status, Lagerort, Letzte Prüfung, Standort, Ablegereife, Prüfer, Herstelljahr, Hersteller, Norm) + `buildGeraeteExportCsv(items, zusatzspalten)`, das diese mit den aufgelösten PROJ-7-Zusatzspalten kombiniert. `escapeCsvCell` übernimmt Semikolon-Quoting (bei `;`/`"`/Zeilenumbruch), Verdopplung von Anführungszeichen, und stellt bei `=`/`+`/`-`/`@`-Präfixen ein Apostroph voran (CSV-Injection-Schutz). Rückgabewert beginnt mit dem UTF-8-BOM-Zeichen (`﻿`), Zeilen mit `\r\n` getrennt (RFC-4180).
- Neuer Route Handler `src/app/api/uebersicht/export/route.ts` (`GET`): prüft Session/Zugriff selbst (`getCurrentUserEmail` + `getPortalAccess`, exakt wie `(protected)/layout.tsx`, da Route Handler ausserhalb dieser Schutzschicht liegen), löst die Firma über das bestehende `getCurrentFirmaId()` auf, liest Firma-Einstellungen (PROJ-7, gleiches Fail-open wie `/uebersicht` bei Ladefehler), baut die CSV und liefert sie mit `Content-Disposition: attachment` zurück. Fehler beim eigentlichen Datenabruf liefern `500` statt zu crashen.
- Kein neuer API-Endpoint für Zod-Validierung nötig — die Query-Parameter (`status`/`suche`/`zuPruefen`) sind einfache, optionale Strings, dieselbe Behandlung wie bei `getGeraeteList` (PROJ-3), das ebenfalls ohne Zod auskommt.
- 25 neue Tests: 15 in `export-csv.test.ts` (Escaping, Quoting, Formel-Schutz, BOM, Spaltenreihenfolge, leere Zellen statt "—"), 4 zusätzliche in `queries.test.ts` (`getGeraeteExportRows`: leeres Ergebnis, unpaginiert, Filter, gebatchter Artikel-Lookup mit 250 IDs), 6 in `route.test.ts` (Auth-Redirects, erfolgreicher Download inkl. Header/BOM-Bytes, Parameter-Weitergabe, 500 bei Fehler, Fail-open ohne Zusatzspalten) — insgesamt 117 Tests grün.
- `npx tsc --noEmit`, `npx eslint`, `npx vitest run` und `npm run build` laufen fehlerfrei durch.

**Nachträgliche additive Ergänzung (2026-09-23, Nutzerwunsch):** `ALWAYS_COLUMNS` um die Spalte "Gerätename" ergänzt, als **erste** Spalte vor "Gerät" (Nutzerwunsch, ursprünglich nach "Gerät" eingefügt, dann umgestellt) — zeigt das rohe Dataverse-Feld `dv_geraete.name`, unabhängig vom kombinierten Artikel-Info-Label in der "Gerät"-Spalte (siehe `formatArtikelInfo`, das dieses Feld nur als Fallback nutzt, wenn keine Artikel-Angaben vorhanden sind). Betrifft nur den CSV-Export, nicht die Geräte-Übersicht/Detailseite selbst. Rein additiv.

## QA Test Results

**Tested:** 2026-09-22
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)

> Hinweis: Wie bei allen bisherigen Features lässt sich der echte Login nicht automatisiert/wiederholbar durchspielen — ein echter Export mit echten Firma-Daten/Zusatzspalten-Konfiguration erfordert eine reale Session. Die komplette CSV-Erzeugungslogik (Spalten, Escaping, Quoting, BOM, Batching, Filterweitergabe) ist vollständig über Vitest-Unit-/Integrationstests abgedeckt; automatisiert per Playwright geprüft wurde, was ohne Session erreichbar ist (Routen-Schutz des neuen API-Endpoints). Dies ist der **erste kundenseitig erreichbare API-Endpoint** des Projekts (bisher nur der Secret-geschützte Cron-Endpoint) — entsprechend gründlicher Fokus auf den Security-Teil unten.

### Acceptance Criteria Status

#### AC-1: Klick auf "Als CSV exportieren" lädt eine Datei mit korrektem Namen herunter
- [x] `route.test.ts` ("returns a CSV download with the correct headers on success") prüft `Content-Disposition: attachment; filename="geraete-uebersicht-YYYY-MM-DD.csv"` + Code-Review von `export-csv-button.tsx` (übernimmt den Dateinamen aus dem Header, mit Fallback)

#### AC-2: Export enthält alle gefilterten Geräte über alle Seiten hinweg, nicht nur die aktuelle Seite
- [x] `queries.test.ts` ("returns ALL matching Geräte, not just a page") — 30 simulierte Geräte, keine `.range()`-Begrenzung in `getGeraeteExportRows`, alle 30 werden zurückgegeben

#### AC-3: Aktivierte Zusatzspalten (PROJ-7) erscheinen im Export
- [x] `export-csv.test.ts` ("appends activated Zusatzspalten after the always-included columns") + `route.test.ts` (Parameter-Weitergabe-Test bestätigt, dass `resolveZusatzspalten`-Ergebnis in die CSV-Erzeugung einfliesst)

#### AC-4: Keine Zusatzspalten aktiviert → nur Standard-/Detailfelder
- [x] `export-csv.test.ts` ("always includes the standard/detail columns in the fixed order, even with no Zusatzspalten")

#### AC-5: 0 Treffer → Export-Button deaktiviert
- [x] Code-Review: `ExportCsvButton disabled={result!.total === 0}` in `uebersicht/page.tsx`, `Button`-Komponente setzt bei `disabled` automatisch `pointer-events-none`/`opacity-50` (shadcn-Standard)

#### AC-6: Export schlägt fehl → Fehlermeldung, kein Download, Kunde bleibt auf der Seite
- [x] Code-Review: `ExportCsvButton` nutzt `fetch()` statt Navigation; `catch`-Block setzt nur lokalen `error`-State, keine Navigation/kein `window.location` im gesamten Feature. `route.test.ts` bestätigt 500 bei einem Datenbankfehler, ohne dass die Route crasht

#### AC-7: Formel-Präfixe (`=`/`+`/`-`/`@`) werden escaped, Excel interpretiert sie nicht als Formel
- [x] `export-csv.test.ts`, parametrisierter Test über alle vier Präfixe — führendes Apostroph wird korrekt vorangestellt; zusätzlicher Test bestätigt, dass ein Präfix-Zeichen *mitten* im Wert unangetastet bleibt (keine Über-Eskalation)

#### AC-8: Datei öffnet sich in Schweizer/deutschem Excel korrekt (Spalten, Umlaute)
- [x] `export-csv.test.ts` (Header/Zeilen mit `;` getrennt, `﻿`-Präfix vorhanden) + `route.test.ts` prüft die rohen Bytes der Antwort explizit auf die UTF-8-BOM-Byte-Sequenz (`EF BB BF`) — wichtig, da `Response.text()` den BOM beim Dekodieren automatisch entfernt und ein reiner String-Vergleich das Vorhandensein auf dem Wire fälschlich negativ hätte testen können

### Edge Cases Status

#### EC-1: Firma mit mehreren hundert Geräten (Batching)
- [x] `queries.test.ts` ("batches the Artikel lookup...") — 250 Geräte mit 250 distinct Artikel-IDs, `ARTIKEL_LOOKUP_CHUNK_SIZE = 200` erzwingt zwei Batches, alle 250 Zeilen korrekt angereichert

#### EC-2: Freitextfeld enthält das Trennzeichen Semikolon
- [x] `export-csv.test.ts` ("quotes values containing the semicolon delimiter")

#### EC-3: Freitextfeld enthält Zeilenumbrüche
- [x] `export-csv.test.ts` ("quotes values containing a line break")

#### EC-4: Firma-Wechsel → Export bezieht sich auf die neu gewählte Firma
- [x] Code-Review: `firmaId` wird bei jedem Request frisch über `getCurrentFirmaId()` aufgelöst (keine Server-seitige Zwischenspeicherung), identisches, bereits für PROJ-3/7 auditiertes Muster

#### EC-5: Fehlender Wert → Zelle bleibt leer statt "—"
- [x] `export-csv.test.ts` ("leaves cells empty (not '—') for missing values")

#### EC-6: CSV-Injection-Schutz
- [x] Deckt sich mit AC-7 oben — abgedeckt

### Security Audit Results
- [x] **Authentication:** `/api/uebersicht/export` ohne Session → Redirect zu `/login` (neuer Playwright-Test, live gegen die echte Next.js-Redirect-Implementierung, nicht nur gemockt) + `route.test.ts`
- [x] **Query-Parameter umgehen die Session-Prüfung nicht:** zweiter Playwright-Test mit `status`/`suche`/`zuPruefen` gesetzt, landet trotzdem auf `/login`
- [x] **Autorisierung/Firma-Isolation:** `firmaId` kommt ausschliesslich aus `getCurrentFirmaId()` (Session/Cookie-abgeleitet), nie aus einem Query-Parameter — es gibt keinen Parameter, über den eine fremde Firma-ID angefordert werden könnte (kein IDOR-Vektor)
- [x] **Auth-Reihenfolge korrekt:** Route prüft E-Mail + Portal-Zugriff **selbst**, bevor `getCurrentFirmaId()` aufgerufen wird — wichtig, da `getCurrentFirmaId()` allein einen nicht angemeldeten Besucher fälschlich zu `/firmen-auswahl` statt `/login` geschickt hätte (verifiziert per Code-Review und den zwei redirect-Tests in `route.test.ts`)
- [x] **Injection:** Suche über `kunden_id`/Seriennummer/Barcode/Lagerort nutzt dieselbe bereits auditierte `escapeOrListValue`-Funktion wie die Übersicht (PROJ-3) — kein neuer Vektor
- [x] **CSV-Injection:** Alle Zellwerte durchlaufen ausnahmslos `escapeCsvCell` (keine Sonderbehandlung, die ein Feld auslässt) — verifiziert per Code-Review des `buildGeraeteExportCsv`-Spaltenmappings
- [x] **Response-Header-Injection:** `Content-Disposition`-Dateiname wird ausschliesslich aus dem serverseitig berechneten Datum gebildet, nie aus Request-Daten — Query-Parameter fliessen nirgends in HTTP-Header ein
- [x] **Content-Type/Content-Disposition verhindert Inline-Rendering:** `attachment`-Disposition + `text/csv`-Content-Type zwingen den Browser zum Download statt zur Anzeige — kein XSS-Vektor über den CSV-Inhalt
- [x] **Keine Secrets im Client-Code:** `getSupabaseAdmin` wird ausschliesslich in serverseitigen Dateien verwendet (Route Handler läuft per Definition nur serverseitig); `export-csv-button.tsx` (Client Component) enthält keinerlei DB-Zugriff, nur `fetch()` gegen die eigene, bereits geschützte Route
- [ ] **BUG-1 gefunden (Low, siehe unten):** Kein Rate-Limiting auf dem neuen Endpoint

### Bugs Found

#### BUG-1: Kein Rate-Limiting auf `/api/uebersicht/export`
- **Severity:** Low
- **Steps to Reproduce:**
  1. Als eingeloggter Kunde wiederholt `/api/uebersicht/export` aufrufen (z.B. Skript/Postman)
  2. Erwartet: irgendeine Drosselung bei exzessiven Anfragen
  3. Tatsächlich: keine Begrenzung — jeder Aufruf löst eine volle, ungepaginierte Datenbankabfrage aus
- **Kontext:** Dies ist der erste kundenseitig erreichbare API-Endpoint des Projekts; alle bisherigen Seiten (PROJ-3/5/7) haben dasselbe, bereits akzeptierte Risikoprofil ("kein neuer öffentlicher API-Endpoint" war dort die Begründung, hier trifft sie nicht mehr zu). Kein Autorisierungs-Bypass möglich — ein Angreifer könnte nur wiederholt seine **eigenen** Firma-Daten abfragen, kein Zugriff auf fremde Daten
- **Priority:** Nice to have — kein Blocker, da kein Datenzugriff über die eigene Firma hinaus möglich ist; guter Kandidat für einen späteren Rate-Limiting-Durchgang (siehe `docs/production/rate-limiting.md`), falls weitere API-Endpoints dazukommen

### Automatisierte Tests
- **Unit-/Integrationstests (Vitest):** 117/117 grün gesamt — 15 neu in `export-csv.test.ts`, 4 neu in `queries.test.ts` (`getGeraeteExportRows`), 6 neu in `route.test.ts`
- **E2E-Tests (Playwright):** 30/30 grün gesamt (26 unverändert + 4 neu in `tests/PROJ-8-csv-export.spec.ts` für Chromium + Mobile Safari: Routen-Schutz mit und ohne Query-Parameter)
- **Regression:** Alle bisherigen PROJ-1–7-Tests weiterhin grün — keine Regressionen durch PROJ-8. `npx tsc --noEmit`, `npm run lint` und `npm run build` laufen vollständig fehlerfrei

### Summary
- **Acceptance Criteria:** 8/8 abgedeckt
- **Bugs Found:** 1 total (0 Critical, 0 High, 0 Medium, 1 Low) — nicht blockierend
- **Security:** Solide für den ersten kundenseitig erreichbaren API-Endpoint — korrekte Auth-Reihenfolge, keine IDOR-/Injection-/CSV-Injection-/Header-Injection-Vektoren gefunden; einzige Lücke (Rate-Limiting) ist Low-Priority und ohne Datenzugriffs-Risiko
- **Production Ready:** JA
- **Recommendation:** Status auf "Approved" setzen. BUG-1 (Rate-Limiting) optional bei einem künftigen, projektweiten Rate-Limiting-Durchgang mitnehmen, kein Grund für einen Deployment-Aufschub.

## Deployment
- **Production URL:** https://obsi-hoferkundenportal.vercel.app
- **Deployed:** 2026-09-22 (automatisch via Vercel bei Push auf `main`, Commit `88d10ad` und alle vorherigen PROJ-8-Commits liefen bereits vor diesem `/deploy`-Schritt live)
- **Verifiziert:** `npm run build`/`npm run lint` lokal fehlerfrei vor jedem Push; keine neuen Umgebungsvariablen nötig (nutzt ausschliesslich die bestehende Supabase-Anbindung); Deployment-Log ohne Warnungen. Live-Verifikation des eigentlichen Downloads (echte Firma-Daten, Zusatzspalten, Excel-Öffnen) steht beim Nutzer noch aus — bitte nach dem Rollout kurz auf `/uebersicht` gegenprüfen.
- **Bekannte, nicht blockierende Restarbeit:** BUG-1 aus den QA-Ergebnissen (kein Rate-Limiting) — optional bei einem künftigen, projektweiten Rate-Limiting-Durchgang.
