# PROJ-14: PDF-Export der Prüfberichte

## Status: Planned
**Created:** 2026-10-07
**Last Updated:** 2026-10-07

## Dependencies
- Requires: PROJ-3 (Geräte-Übersicht): Der PDF-Export übernimmt deren Filter (Status, Suche, „zu prüfen“)
- Requires: PROJ-7 (Kundenspezifische Spalten): Die Zusatzspalten der Firma erscheinen auch im PDF
- Requires: PROJ-1 (Dataverse-Sync-Service): Der Sync muss zusätzlich das Feld „Erstgebrauch“ der Geräte übertragen
- Requires: PROJ-11 (Erfolgsmessung): Der PDF-Export wird als eigene Export-Art gezählt
- Requires: PROJ-15 (Portal-Zugang pro Standort, geplant 2026-10-09): Das PDF darf nur Geräte der Standorte enthalten, für die der Kunde einen Zugang hat (gleiche Einschränkung wie Übersicht und CSV-Export)
- Vorbild: PROJ-8 (CSV-Export der Geräte-Übersicht): gleicher Ablauf (Knopf auf der Übersicht, Filter werden übernommen, Fehler inline)
- **Cross-Repo-Vorlage:** `obsi-hofer-admin` PROJ-7 („PDF-Export Prüfberichte“). Layout, Spaltenlogik und Farben werden von dort übernommen. Ideen-Notiz: `obsi-hofer-admin/docs/kundenportal-pdf-export-idee.md` (2026-10-07)

## User Stories
- Als Kunde möchte ich den Prüfbericht meiner Geräte selbst als PDF herunterladen, damit ich ihn nicht bei OBSI Hofer anfordern muss.
- Als Kunde möchte ich, dass das PDF genauso aussieht wie der Prüfbericht, den ich von OBSI Hofer kenne, damit ich es intern weitergeben und ablegen kann.
- Als Kunde möchte ich das PDF auf die aktuell gefilterten Geräte beschränken (z. B. nach Status oder Suchbegriff), damit ich gezielt einen Teilbericht erstellen kann.
- Als Kunde möchte ich im PDF dieselben zusätzlichen Spalten sehen wie in meiner Geräte-Übersicht (z. B. KundenID), damit ich die Geräte meinen eigenen Bezeichnungen zuordnen kann.
- Als Kunde möchte ich auf einen Blick sehen, welche Geräte freigegeben sind und welche nicht, damit ich handeln kann.
- Als Betreiber (OBSI Hofer) möchte ich sehen, wie oft Kunden das PDF herunterladen, damit ich den Nutzen des Features beurteilen kann.

## Out of Scope
- Firmenspezifische Excel-Vorlagen aus dem internen SharePoint (wie im Admin-Tool): Das Portal hat keinen Zugriff darauf und soll keinen bekommen. Stattdessen fester Standardsatz plus Portal-Zusatzspalten (siehe Decision Log)
- Ablage des PDFs in einem Archiv (im Admin-Tool: SharePoint-Archiv): Ein Kunden-Selbstexport braucht kein OBSI-Archiv
- Geräte ohne Prüfbericht im PDF: werden bewusst ausgelassen (siehe Decision Log)
- Auswahl einzelner Geräte per Häkchen: es gilt immer die ganze gefilterte Liste (wie beim CSV-Export)
- Spaltenauswahl durch den Kunden selbst
- Fusszeile oder Hinweis „Erstellt im Kundenportal“: das PDF ist identisch zum Admin-Tool (siehe Decision Log)
- Einzel-PDF pro Gerät oder pro Prüfbericht, PDF-Export der Prüfberichte-Übersicht (PROJ-9)
- Zeitgesteuerte oder automatisch per E-Mail verschickte PDFs: PRD-Non-Goal „keine automatischen Benachrichtigungen“
- Excel-Export (xlsx)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Auslösen und Umfang**
- [ ] Angenommen ein Kunde ist auf der Geräte-Übersicht, wenn er die Seite betrachtet, dann sieht er neben dem CSV-Export einen Knopf für den PDF-Export
- [ ] Angenommen auf der Geräte-Übersicht sind Filter aktiv (Status, Suche, „zu prüfen“), wenn der Kunde den PDF-Export auslöst, dann enthält das PDF genau die Geräte, die zu diesen Filtern passen, über alle Seiten hinweg (die Seitenaufteilung von 25 Geräten gilt nicht)
- [ ] Angenommen unter den gefilterten Geräten sind Geräte ohne Prüfbericht, wenn das PDF erzeugt wird, dann erscheinen nur Geräte mit mindestens einem Prüfbericht, je eine Zeile pro Gerät mit den Angaben des letzten Prüfberichts
- [ ] Angenommen die Filter liefern 0 Geräte, wenn der Kunde die Übersicht betrachtet, dann ist der PDF-Knopf deaktiviert (wie beim CSV-Export)
- [ ] Angenommen die Filter liefern Geräte, aber keines davon wurde je geprüft, wenn der Kunde den PDF-Export auslöst, dann erscheint eine verständliche Meldung (z. B. „Für diese Auswahl gibt es keine geprüften Geräte.“) und es wird keine Datei heruntergeladen
- [ ] Angenommen ein Kunde hat Zugriff auf mehrere Firmen, wenn er den PDF-Export auslöst, dann enthält das PDF ausschliesslich Geräte der aktuell gewählten Firma

**Inhalt und Layout**
- [ ] Angenommen das PDF wird erzeugt, wenn der Kunde es öffnet, dann ist es im Querformat und hat denselben Kopfbereich wie im Admin-Tool: Logo, Titel „Prüfbericht Absturzsicherungen“ mit dem Firmennamen, OBSI-Hofer-Kontaktblock rechts
- [ ] Angenommen das PDF wird erzeugt, wenn der Kunde die Tabelle betrachtet, dann enthält sie für jede Firma diese Standardspalten in dieser Reihenfolge: Lagerort, Artikel, Typ, Serien-Nr., Scancode, Hersteller, Herstelljahr, Erstgebrauch, Ablegereife, Zubehör, Geprüft, Prüfer, Prüfergebnis, Bemerkungen
- [ ] Angenommen für die Firma sind Zusatzspalten der Geräte-Übersicht eingeschaltet (PROJ-7), wenn das PDF erzeugt wird, dann erscheinen die Zusatzspalten, die nicht schon im Standardsatz enthalten sind, zusätzlich nach den Standardspalten (z. B. KundenID, Dimension)
- [ ] Angenommen für die Firma ist die Zusatzspalte „Bemerkungen“ eingeschaltet, wenn das PDF erzeugt wird, dann zeigt die Standardspalte „Bemerkungen“ die Bemerkung des letzten Prüfberichts und eine zusätzliche Spalte „Bemerkungen Gerät“ die Bemerkung am Gerät
- [ ] Angenommen ein Gerät hat das Prüfergebnis „Freigabe“, „keine Freigabe“ oder „letzte Freigabe“, wenn das PDF erzeugt wird, dann ist die Zelle „Prüfergebnis“ grün, rot bzw. gelb/orange eingefärbt (unabhängig von Gross-/Kleinschreibung); andere oder leere Werte bleiben ohne Farbe
- [ ] Angenommen die Tabelle reicht über mehrere Seiten, wenn der Kunde das PDF durchblättert, dann steht die Kopfzeile der Tabelle auf jeder Seite und keine Gerätezeile ist über einen Seitenumbruch geteilt
- [ ] Angenommen Daten wie Herstelljahr, Erstgebrauch, Ablegereife und Geprüft sind vorhanden, wenn das PDF erzeugt wird, dann erscheinen sie im gleichen Datumsformat wie im Admin-Tool (Herstelljahr, Erstgebrauch, Ablegereife als MM.JJJJ; Geprüft als TT.MM.JJJJ); fehlende Werte bleiben leer
- [ ] Angenommen der Download startet, wenn der Kunde die Datei speichert, dann heisst sie „<JJJJ-MM-TT> Prüfbericht Absturzsicherungen - <Firma>.pdf“ (Sonderzeichen im Firmennamen bereinigt)

**Daten**
- [ ] Angenommen ein Gerät hat in Dataverse ein Erstgebrauchsdatum, wenn der Sync seiner Firma gelaufen ist, dann ist der Wert im Portal vorhanden und erscheint im PDF in der Spalte „Erstgebrauch“

**Fehler, Zugriff, Zählung**
- [ ] Angenommen die PDF-Erzeugung schlägt fehl, wenn der Kunde den Export auslöst, dann erscheint eine verständliche Fehlermeldung auf der Seite, es wird keine (defekte) Datei heruntergeladen und der Kunde bleibt auf der Übersicht
- [ ] Angenommen jemand ruft den PDF-Export ohne gültige Sitzung oder ohne Zugang (PROJ-2/PROJ-13) auf, wenn die Anfrage ankommt, dann wird kein PDF erzeugt (gleiches Verhalten wie beim CSV-Export)
- [ ] Angenommen ein PDF-Export war erfolgreich, wenn der Download ausgeliefert wird, dann wird er in der Erfolgsmessung als eigene Export-Art „PDF Prüfbericht“ erfasst; schlägt die Erfassung fehl, wird das PDF trotzdem ausgeliefert
- [ ] Angenommen der wöchentliche Erfolgsmessungs-Report wird erzeugt, wenn er die Export-Auswertung enthält, dann erscheinen PDF-Exporte getrennt neben den CSV-Exporten der Geräte- und der Prüfberichte-Übersicht

## Edge Cases
- **Filter „zu prüfen“:** liefert vor allem nie geprüfte Geräte. Diese fallen im PDF weg, es bleiben nur Geräte, deren letzte Prüfung über 360 Tage zurückliegt. Sind alle nie geprüft → Meldung „keine geprüften Geräte“ statt leerem PDF
- **Zusatzspalten, die im Standardsatz schon vorkommen** (Seriennummer, Barcode/Scancode, Zubehör, Typ): erscheinen nicht doppelt
- **Firma ohne Zusatzspalten-Einstellung oder Einstellungen nicht ladbar:** PDF nur mit Standardspalten (gleiches fail-open wie bei Übersicht und CSV, PROJ-7)
- **Erstgebrauch noch nicht synchronisiert** (Firma seit Einführung noch nicht über das Admin-Tool synchronisiert): Spalte bleibt leer, kein Fehler
- **Sehr lange Texte** (z. B. mehrzeilige Bemerkungen, Seriennummern mit Bindestrich): werden innerhalb der Zelle umgebrochen, ohne Wörter oder Seriennummern sinnlos zu zerschneiden; die Zeile wird höher, nicht abgeschnitten
- **Viele Spalten** (Standardsatz plus mehrere Zusatzspalten): Tabelle bleibt im Querformat lesbar (Schrift wird bei Bedarf kleiner, wie im Admin-Tool)
- **Grosse Firma mit sehr vielen Geräten:** PDF wird trotzdem vollständig erzeugt; Laufzeit siehe Open Questions
- **Prüfergebnis in anderer Schreibweise** („Letzte Freigabe“ vs. „letzte Freigabe“): gleiche Farbe
- **Geprüftes Gerät ohne Prüfer- oder Bemerkungsangabe:** Zelle bleibt leer
- **Gelöschte Prüfberichte** (in Dataverse entfernt, im Portal als gelöscht markiert): zählen nicht als „letzter Prüfbericht“; hat ein Gerät nur gelöschte Prüfberichte, gilt es als nicht geprüft
- **Mehrfach schnelles Klicken auf den Knopf:** während der Erzeugung ist der Knopf gesperrt, es entsteht nur ein Download

## Technical Requirements (optional)
- Security: Firma wird ausschliesslich serverseitig aus der Sitzung bestimmt (wie beim CSV-Export), nie aus der Anfrage
- Security: Gleiche Zugriffsprüfung wie alle anderen Kundendaten (aktiv, freigegeben, Firma zugeordnet; PROJ-2/PROJ-13)
- Portal bleibt read-only, keine Ablage oder Änderung von Daten ausser dem Export-Zählereintrag
- Das erzeugte PDF muss auf Vercel funktionieren (Schriften und Logo im Deployment enthalten; bekannte Stolpersteine aus dem Admin-Tool siehe Ideen-Notiz)

## Open Questions
- [ ] Laufzeit bei sehr grossen Firmen: Im Admin-Tool wird das PDF in einem Schritt erzeugt, bisher unkritisch. Grösste Portal-Firma und tatsächliche Dauer bei `/architecture` bzw. `/qa` prüfen
- [ ] Code-Teilung mit dem Admin-Tool: Module kopieren oder gemeinsames Paket? Entscheidung bei `/architecture` (Ideen-Notiz empfiehlt Kopieren, solange sich der Code selten ändert)
- [ ] Soll das PDF-Layout später angepasst werden, falls das Admin-Tool sein Layout ändert? Bei Kopie entsteht kein automatischer Gleichlauf

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Spalten = fester Standardsatz (wie Standard-Vorlage im Admin-Tool) plus die Portal-Zusatzspalten der Firma (PROJ-7); keine firmenspezifischen Excel-Vorlagen | Das Portal hat keinen Zugriff auf das interne SharePoint und soll keine internen Zugangsdaten bekommen. Die Zusatzspalten geben trotzdem etwas Anpassung pro Firma, ohne neue Konfiguration, und entsprechen dem CSV-Export | 2026-10-07 |
| Doppelte Spalten (Zusatzspalte schon im Standardsatz) erscheinen nur einmal | Seriennummer, Barcode, Zubehör und Typ sind bereits Standardspalten | 2026-10-07 |
| Gefilterte Geräte, aber nur solche mit Prüfbericht; eine Zeile pro Gerät mit dem letzten Prüfbericht | Entspricht dem Prüfbericht aus dem Admin-Tool. Ein „Prüfbericht“ ohne Prüfung hätte keinen Inhalt. Die Filter der Übersicht gelten trotzdem, wie beim CSV-Export | 2026-10-07 |
| Keine Datei, sondern eine Meldung, wenn nach dem Ausfiltern ungeprüfter Geräte nichts übrig bleibt | Ein leeres PDF wäre verwirrend | 2026-10-07 |
| „Erstgebrauch“ wird als Teil von PROJ-14 in den Sync aufgenommen | Gehört zum Standardsatz des Admin-Tools; ohne die Spalte wiche das PDF ab. Gefüllt wird sie pro Firma mit ihrem nächsten Sync | 2026-10-07 |
| Zwei Bemerkungen: „Bemerkungen“ = letzter Prüfbericht (Standard), „Bemerkungen Gerät“ = Zusatzspalte | Beide Informationen sind verschieden; klare Benennung verhindert Verwechslung | 2026-10-07 |
| Layout, Kopfbereich, Tabellen-Optik und Dateiname identisch zum Admin-Tool, kein Portal-Hinweis | Der Kunde bekommt dasselbe Dokument, das er von OBSI Hofer kennt | 2026-10-07 |
| Prüfergebnis-Farben fest: Freigabe grün, keine Freigabe rot, letzte Freigabe gelb/orange | Ohne Excel-Vorlage braucht es ein festes Schema; Gelb/Orange entspricht der Status-Farbe der Portal-Übersicht | 2026-10-07 |
| PDF-Exporte werden als eigene Export-Art in der Erfolgsmessung gezählt | Zeigt, ob das Feature genutzt wird, getrennt von den CSV-Exporten | 2026-10-07 |
| Knopf auf der Geräte-Übersicht neben dem CSV-Export | Gleicher Ort und Ablauf wie der bekannte CSV-Export; die Filter der Übersicht bestimmen den Umfang | 2026-10-07 |
| Priorität P2 | Erleichtert Kunden die Ablage, ersetzt aber keine Kernfunktion; CSV-Export und Übersicht decken den Datenzugriff bereits ab | 2026-10-07 |

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
