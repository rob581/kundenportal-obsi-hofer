# PROJ-8: CSV-Export der Geräte-Übersicht

## Status: Planned
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

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
