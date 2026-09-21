# PROJ-6: Passkey-Login

## Status: Planned
**Created:** 2026-09-21
**Last Updated:** 2026-09-21

## Dependencies
- Requires: PROJ-2 (Kunden-Login, Supabase Auth) — Passkey-Registrierung setzt eine bestehende, aktive Supabase-Auth-Sitzung voraus; Passkey-Sign-in ist eine zusätzliche Methode innerhalb derselben Supabase-Auth-Instanz

## User Stories
- Als eingeloggter Kunde möchte ich einen Passkey für mein Konto einrichten können, damit ich mich künftig schneller und ohne E-Mail-Code anmelden kann.
- Als Kunde mit registriertem Passkey möchte ich mich beim nächsten Besuch direkt per Passkey anmelden können, ohne meine E-Mail einzugeben.
- Als Kunde möchte ich meine registrierten Passkeys einsehen und einzeln löschen können, damit ich die Kontrolle über meine Geräte behalte, z. B. wenn ich eines verliere.
- Als Kunde mit mehreren Geräten möchte ich mehrere Passkeys registrieren können (bis zu 5), damit ich mich von jedem meiner Geräte aus per Passkey anmelden kann.
- Als OBSI Hofer GmbH möchte ich, dass Passkey-Login zusätzlich zum bestehenden E-Mail+Code-Login angeboten wird, nicht als Ersatz, damit kein Kunde ausgesperrt wird, falls Passkeys auf seinem Gerät/Browser nicht funktionieren.

## Out of Scope
- Passkey als einzige/verpflichtende Anmeldemethode — bleibt immer zusätzlich zu E-Mail+Code
- Aktive Bewerbung/Banner zur Passkey-Einrichtung — für v1 rein optional, nur über einen Link erreichbar
- Eigene Namensvergabe für Passkeys durch den Kunden — automatische Datums-Benennung für v1
- Mehr als 5 Passkeys pro Kunde
- Admin-seitige Verwaltung/Löschung fremder Passkeys durch OBSI Hofer über das Portal — müsste bei Bedarf direkt im Supabase-Dashboard erfolgen, kein Portal-Feature (analog zur bestehenden Dataverse-Admin-Regel aus PROJ-2)
- Eigene UI für die Cross-Device-Registrierung per QR-Code — wird nativ vom Browser/Betriebssystem übernommen, kein eigener Code nötig
- Conditional UI / automatisches Passkey-Autofill beim Laden der Login-Seite — button-basiert für v1

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Kunde ist eingeloggt und hat noch keinen Passkey, wenn er die Seite "/sicherheit" öffnet, dann sieht er eine leere Liste mit einem "Passkey hinzufügen"-Button
- [ ] Angenommen ein Kunde ist auf "/sicherheit" eingeloggt, wenn er auf "Passkey hinzufügen" klickt und die Geräte-Bestätigung (Biometrie/PIN/Security Key) erfolgreich abschliesst, dann erscheint der neue Passkey mit Erstellungsdatum in der Liste
- [ ] Angenommen ein Kunde hat bereits 5 Passkeys registriert, wenn er "/sicherheit" öffnet, dann ist "Passkey hinzufügen" durch einen Hinweistext ersetzt ("Maximal 5 Passkeys erreicht")
- [ ] Angenommen ein Kunde hat mindestens einen Passkey, wenn er auf "Löschen" klickt, dann erscheint ein Bestätigungsdialog, bevor der Passkey entfernt wird
- [ ] Angenommen ein Kunde hat einen registrierten Passkey, wenn er die Login-Seite öffnet, auf "Mit Passkey anmelden" klickt und die Geräte-Bestätigung erfolgreich abschliesst, dann wird er ohne E-Mail-Eingabe angemeldet und landet je nach Zuordnung auf der Firmen-Auswahl oder der Übersicht
- [ ] Angenommen ein Besucher hat keinen registrierten Passkey für diese Seite, wenn er auf "Mit Passkey anmelden" klickt, dann zeigt der Browser die native "kein Passkey gefunden"-Meldung, und er kann weiterhin über E-Mail+Code fortfahren
- [ ] Angenommen der Browser unterstützt WebAuthn nicht, wenn ein Kunde die Login-Seite oder "/sicherheit" öffnet, dann wird der "Mit Passkey anmelden"- bzw. "Passkey hinzufügen"-Button nicht angezeigt
- [ ] Angenommen die Geräte-Bestätigung wird vom Kunden abgebrochen (z. B. Biometrie-Dialog geschlossen), wenn das passiert, dann bleibt er auf der aktuellen Seite mit einer verständlichen Fehlermeldung, ohne Datenverlust

## Edge Cases
- Kunde bricht die Passkey-Registrierung mitten in der Geräte-Bestätigung ab → keine Änderung, verständliche Fehlermeldung, Liste bleibt wie vorher
- Kunde versucht, seinen letzten verbleibenden Passkey zu löschen → erlaubt, da E-Mail+Code immer als Fallback bestehen bleibt (kein Lockout-Risiko)
- Kunde registriert versehentlich denselben Passkey (gleiches Gerät) zweimal → ob Supabase/der Browser das selbst verhindert (WebAuthn `excludeCredentials`) oder wir das prüfen müssen, ist technisch offen (siehe Open Questions)
- Kunde meldet sich per Passkey an, ist aber kein aktiver Dataverse-Kontakt (mehr) → dieselbe generische "Kein Zugang"-Seite wie beim E-Mail+Code-Login; die Zugriffsprüfung (`getPortalAccess`) läuft identisch, unabhängig von der Anmeldemethode
- Kunde hat Passkeys auf mehreren Geräten, verliert eines → kann sich mit einem anderen Gerät/Passkey oder per E-Mail+Code anmelden und den verlorenen Passkey über "/sicherheit" löschen
- Browser-Tab wird während der Geräte-Bestätigung geschlossen → kein Passkey wird angelegt, WebAuthn-Ceremony bricht sauber ab

## Technical Requirements (optional)
- Erfordert expliziten Passkey-Opt-in im `@supabase/supabase-js`-Client (bereits kompatible Version installiert: 2.114.0, benötigt ≥2.105.0)
- Relying Party ID = eigene Portal-Domain (kein Cross-Origin-Problem wie bei Entra External ID, siehe PROJ-2 Decision Log) — genaue Konfiguration folgt bei `/architecture`
- Supabase-Passkey-API ist Beta/experimentell (seit Mai 2026) — kann sich ohne Vorankündigung ändern

## Open Questions
- [ ] Verhindert Supabase/der Browser automatisch die doppelte Registrierung desselben Geräts als zweiter Passkey, oder müssen wir das selbst prüfen? → technische Klärung bei `/architecture`
- [ ] Erfordert `registerPasskey()` eine kürzlich abgeschlossene Anmeldung (analog zu Entras "MFA in den letzten 5 Minuten"), oder reicht eine bestehende Sitzung unabhängig von ihrem Alter? → technische Klärung bei `/architecture`

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Passkey ist zusätzlich zu E-Mail+Code, nicht Ersatz | Verhindert Aussperrung, falls Passkey auf einem Gerät nicht funktioniert oder nicht unterstützt wird | 2026-09-21 |
| Neue eigene Seite "/sicherheit" statt Header-Dropdown | Skaliert besser, falls später weitere Konto-Einstellungen dazukommen; genug Platz für Liste + Aktionen | 2026-09-21 |
| Maximal 5 Passkeys pro Kunde | Deckt typische Multi-Geräte-Nutzung ab (Laptop, Handy, evtl. Security Key), ohne unbegrenzte Listen zu riskieren | 2026-09-21 |
| Keine aktive Bewerbung (Banner) in v1 | Einfacheres MVP, kein zusätzlicher UI-Zustand (anzeigen/wegklicken/erinnern) nötig; kann später ergänzt werden | 2026-09-21 |
| Automatische Datums-Benennung statt eigener Namensvergabe durch den Kunden | Reicht bei max. 5 Passkeys zur Unterscheidung, spart einen Eingabeschritt bei der Registrierung | 2026-09-21 |
| Login-Button statt automatischem Passkey-Autofill (Conditional UI) | Einfacher umzusetzen für v1, funktioniert unabhängig davon, ob der Besucher bereits einen Passkey hat | 2026-09-21 |
| Feature-Detection auf WebAuthn-Browser-Support statt Pro-Kunde-Erkennung | Vor dem Klick ist nicht bekannt, ob der Kunde einen Passkey besitzt — nur echte Browser-Inkompatibilität wird herausgefiltert | 2026-09-21 |

### Technical Decisions
<!-- Added by /architecture -->

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
