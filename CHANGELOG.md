# Changelog

Alle für Kunden und Betrieb relevanten Änderungen am Kundenportal. Neueste Version zuerst. Versionen entsprechen den Git-Tags.

## [1.14.0] – 2026-10-11 · PROJ-3 Geräte-Übersicht
### Neu
- Die Geräte-Übersicht hat eine Spalte „Standort“ und einen Filter, mit dem sich die Liste auf einen Standort einschränken lässt.
- Der CSV-Export der Geräte-Übersicht folgt dem gewählten Standort-Filter.
### Behoben
- Der gewählte Status-Filter bleibt beim Wechsel des Standorts erhalten.

## [1.13.0] – 2026-10-09 · PROJ-16 Sync pro Standort
### Neu
- Das Admin-Tool kann den Abgleich aus Dataverse jetzt gezielt für einen einzelnen Standort auslösen; die übrigen Standorte der Firma bleiben dabei unverändert.
- Portalzugänge werden auch bei einem Standort-Abgleich übertragen und bereinigt.
- Die Betriebs-E-Mail zu einem Abgleich nennt bei Standort-Läufen den betroffenen Standort.

## [1.12.0] – 2026-10-09 · PROJ-3 Geräte-Übersicht
### Neu
- Die Geräte-Übersicht zeigt in der neuen Spalte „Bemerkung Prüfung“ die Bemerkung des aktuellen Prüfberichts; der CSV-Export enthält sie ungekürzt.
### Geändert
- Die Bemerkung zum Gerät heisst jetzt „Bemerkungen Gerät“, in der Zusatzspalte wie auf der Detailseite.

## [1.11.0] – 2026-10-09 · PROJ-15 Portal-Zugang pro Standort
### Geändert
- Der Zugang zum Portal wird jetzt pro Standort vergeben: Kunden sehen nur noch die Standorte (mit Geräten, Prüfberichten, Dashboard und Exporten), für die sie freigegeben sind.
- Das bisherige Häkchen „Kundenportal“ am Kontakt wird vom Portal nicht mehr ausgewertet; Freigaben pro Standort werden im Admin-Tool gepflegt und mit dem Abgleich übernommen.
### Behoben
- Zugänge zu Standorten, die in Dataverse nicht mehr existieren, werden beim Abgleich entfernt.

## [1.10.0] – 2026-10-07 · PROJ-11 Erfolgsmessung Kundenportal
### Geändert
- Die Login-Quote im wöchentlichen Betriebs-Report zählt nur noch Kontakte, die für das Portal freigegeben sind.

## [1.9.0] – 2026-10-07 · PROJ-13 Kontakt-Freigabe für Kundenportal-Zugang
### Geändert
- Zugang zum Portal haben nur noch Kontakte, bei denen im Admin-Tool das Häkchen „Kundenportal“ gesetzt und mit dem Abgleich ihrer Firma übernommen wurde.
- Der Abgleich aus Dataverse läuft nur noch für eine angegebene Firma; ein Abgleich aller Firmen auf einmal ist nicht mehr möglich.
### Behoben
- Die Anmeldung funktioniert auch für E-Mail-Adressen, die bei mehreren Kontakten hinterlegt sind.

## [1.8.0] – 2026-10-07 · PROJ-12 Firma-Filter für Dataverse-Sync
### Geändert
- Der Abgleich aus Dataverse kann jetzt gezielt für eine einzelne Firma ausgelöst werden; das übernimmt künftig das Admin-Tool.
- Der wöchentliche Betriebs-Report zeigt zusätzlich die CSV-Exports pro Firma.
### Entfernt
- Der automatische nächtliche Abgleich um 03:00 Uhr entfällt; Daten werden nur noch aktualisiert, wenn eine Firma im Admin-Tool freigegeben wird.
### Behoben
- Bemerkungen werden aus dem richtigen Dataverse-Feld übernommen.

## [1.7.1] – 2026-09-23 · PROJ-11 Erfolgsmessung Kundenportal
### Neu
- Der wöchentliche Betriebs-Report zeigt die Anzahl Logins pro Firma, nicht nur ob sich eine Firma angemeldet hat.
### Geändert
- Die Liste der noch nicht eingeloggten Firmen wurde aus dem Report entfernt.

## [1.7.0] – 2026-09-23 · PROJ-11 Erfolgsmessung Kundenportal
### Neu
- OBSI Hofer erhält jeden Montag einen Betriebs-Report per E-Mail mit Login-Quote und Anzahl CSV-Exports pro Monat.
- Beide CSV-Exports enthalten neu den Gerätenamen als erste Spalte.
### Geändert
- Der Menüpunkt „Übersicht“ heisst jetzt „Geräte“; die Reihenfolge im Kopfbereich wurde angepasst.
- Die Erfolgsmeldung zum Abgleich nennt neu die Anzahl hinzugefügter und aktualisierter Datensätze.

## [1.6.0] – 2026-09-22 · PROJ-10 CSV-Export der Prüfberichte-Übersicht
### Neu
- Kunden können die nach Zeitraum gefilterte Prüfberichte-Übersicht als CSV-Datei herunterladen, z.B. für Excel.

## [1.5.0] – 2026-09-22 · PROJ-9 Prüfberichte-Übersicht
### Neu
- Neue Seite mit allen Prüfberichten der Firma, filterbar nach Zeitraum und erreichbar über das Menü sowie die Dashboard-Kachel „Total Prüfberichte“.

## [1.4.0] – 2026-09-22 · PROJ-8 CSV-Export der Geräte-Übersicht
### Neu
- Kunden können die (gefilterte) Geräteliste als CSV-Datei herunterladen, inklusive der für ihre Firma aktivierten Zusatzspalten.

## [1.3.0] – 2026-09-22 · PROJ-7 Kundenspezifische Spalten in der Geräte-Übersicht
### Neu
- OBSI Hofer kann pro Firma zusätzliche Spalten in der Geräte-Übersicht und auf der Detailseite einblenden, z.B. die Kunden-Gerätebezeichnung (KundenID), die dann auch durchsuchbar ist.
- Kunden können ihren Passkeys einen eigenen Namen geben.
### Geändert
- Nach der Anmeldung landen Kunden auf dem Dashboard; die Kacheln „Zu prüfen“ und „Total Geräte“ führen direkt zur passenden Geräteliste, und der Kopfbereich hat auf dem Handy ein Menü.
### Behoben
- Das Dashboard lädt auch bei Firmen mit sehr vielen Geräten zuverlässig.

## [1.2.0] – 2026-09-21 · PROJ-6 Passkey-Login
### Neu
- Kunden können auf der Seite „Sicherheit“ einen Passkey einrichten und sich danach ohne E-Mail-Code anmelden.

## [1.1.0] – 2026-09-21 · PROJ-2 Kunden-Login (Supabase Auth)
### Neu
- Das Portal unterstützt einen dunklen Anzeigemodus (Dark Mode).
### Geändert
- Die Anmeldung erfolgt neu mit E-Mail-Adresse und Einmal-Code statt über Microsoft Entra External ID.

## [1.0.0] – 2026-09-18 · PROJ-1 bis PROJ-5 Erste Produktivversion
### Neu
- Kunden melden sich im Portal an und sehen die Geräte ihrer Firma in einer durchsuchbaren Übersicht mit Status-Filter.
- Die Detailseite eines Geräts zeigt alle bisherigen Prüfberichte.
- Ein Dashboard zeigt Kennzahlen zu Geräten und Prüfberichten, darunter die Kachel „Zu prüfen“ für überfällige oder nie geprüfte Geräte.
- Geräte- und Prüfberichtsdaten werden jede Nacht um 03:00 Uhr automatisch aus Dataverse übernommen.
