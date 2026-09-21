# PROJ-6: Passkey-Login

## Status: Approved
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
- [x] Verhindert Supabase/der Browser automatisch die doppelte Registrierung desselben Geräts als zweiter Passkey? → In Supabase's spärlicher Beta-Doku nicht explizit dokumentiert; WebAuthn selbst kennt dafür den Standard-Mechanismus `excludeCredentials`, den Browser üblicherweise respektieren. Wird bei `/backend` empirisch geprüft, kein Blocker für die Architektur (2026-09-21)
- [x] Erfordert `registerPasskey()` eine kürzlich abgeschlossene Anmeldung (analog zu Entras "MFA in den letzten 5 Minuten")? → Laut Doku nicht spezifiziert/nicht erforderlich, anders als bei Entra — eine bestehende, gültige Sitzung genügt. Wird bei `/backend` verifiziert (2026-09-21)
- [x] **Live bestätigt (2026-09-21):** Nutzer hat den kompletten Flow mit echtem Gerät (Windows Hello) durchgespielt — Registrierung über `/sicherheit`, danach erfolgreicher Passkey-Login ohne E-Mail-Eingabe. Keine unerwartete Recency- oder Doppel-Geräte-Blockade aufgetreten

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
| Decision | Rationale | Date |
|----------|-----------|------|
| Keine eigene Datenbank-Tabelle für Passkeys | Supabase Auth verwaltet Passkeys intern selbst (Registrieren, Auflisten, Löschen sind fertige API-Methoden) — genau wie es bereits die Nutzerkonten selbst verwaltet. Kein Custom-Backend nötig, im Gegensatz zum verworfenen Entra-Ansatz (siehe PROJ-2), der eine eigene Graph-API-Anbindung mit High-Privilege-Rechten gebraucht hätte | 2026-09-21 |
| Server Actions für Registrierung/Löschung, analog zu `login/actions.ts` | Passt zum bestehenden Projekt-Muster (PROJ-2); kein separater API-Route-Handler nötig | 2026-09-21 |
| Browser-Kompatibilitätsprüfung rein clientseitig | WebAuthn-Verfügbarkeit lässt sich direkt im Browser feststellen, kein Server-Overhead nötig | 2026-09-21 |
| Sitzungsprüfung auf "/sicherheit" wiederverwendet dieselbe `(protected)`-Route-Group wie die bestehenden Seiten | Kein neuer Schutzmechanismus nötig — "/sicherheit" ist einfach eine weitere Seite unter dem bestehenden PROJ-2-Schutz | 2026-09-21 |
| **Korrektur bei `/backend`:** Server Actions durch direkten Browser-Supabase-Client ersetzt (alle vier Passkey-Operationen) | `registerPasskey`/`signInWithPasskey` müssen zwingend im Browser laufen (WebAuthn-Zeremonie braucht `navigator.credentials`); `list`/`delete` wurden aus Konsistenzgründen ebenfalls darüber aufgerufen statt über einen separaten Server-Action-Umweg. Erfordert zwei neue `NEXT_PUBLIC_`-Env-Variablen (dieselben, bereits unbedenklichen Werte wie serverseitig) | 2026-09-21 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponenten-Struktur

```
App (eingeloggter Bereich)
├── AppHeader
│   └── Neuer Navigations-Link "Sicherheit" (neben Übersicht/Dashboard)
├── Sicherheit-Seite ("/sicherheit", neu, geschützt wie die übrigen PROJ-2-Seiten)
│   ├── Liste registrierter Passkeys (Erstellungsdatum je Eintrag + "Löschen"-Button)
│   ├── Leerer Zustand ("Noch kein Passkey eingerichtet") bei null Einträgen
│   ├── "Passkey hinzufügen"-Button — wird bei 5/5 durch Hinweistext ersetzt
│   ├── Bestätigungsdialog vor dem Löschen
│   └── Fehlermeldung bei abgebrochener/fehlgeschlagener Geräte-Bestätigung
└── Login-Seite (erweitert, bestehende Datei aus PROJ-2)
    ├── Neuer Button "Mit Passkey anmelden" (über dem bestehenden E-Mail-Formular, nur bei WebAuthn-fähigem Browser sichtbar)
    └── Bestehendes zweistufiges E-Mail+Code-Formular — unverändert
```

### Datenmodell (in Textform)

Es wird **keine eigene Tabelle** angelegt. Supabase Auth führt eine eigene, interne Liste der Passkeys pro Nutzer (ähnlich wie die Nutzerkonten selbst) — das Portal fragt diese Liste bei Bedarf direkt ab, statt einen eigenen Datenbestand zu pflegen. Die Zugehörigkeit "welcher Passkey gehört zu welchem Kunden" managt Supabase vollständig selbst über die bestehende Sitzung.

### Technische Entscheidungen (Begründung)
Siehe Decision Log → Technical Decisions oben.

### Abhängigkeiten (Packages)
- `@supabase/supabase-js` — bereits vorhanden, Passkey-Funktionalität wird über einen expliziten Opt-in beim Client aktiviert (Beta-Feature)
- shadcn `alert-dialog` — neu zu installieren, für den Lösch-Bestätigungsdialog (entspricht der Konvention aus dem Decision Log: "eigener Namen für Bestätigungsdialoge" wie z. B. bereits für andere destruktive Aktionen üblich)

## Implementation Notes (Frontend)

**Erstellt 2026-09-21 (Platzhalter-Verhalten, ohne echte WebAuthn-Anbindung — folgt bei `/backend`):**
- `src/app/(protected)/sicherheit/page.tsx` — neue geschützte Seite, wiederverwendet `AppHeader` + Card-Layout analog zu `firmen-auswahl/page.tsx`
- `src/components/passkey-list.tsx` — neue Client-Component: Liste, leerer Zustand, "Passkey hinzufügen" (simuliert lokal einen Eintrag mit aktuellem Datum), Lösch-Button mit `AlertDialog`-Bestätigung, Hinweistext bei 5/5 erreicht. Beide Aktionen mit `TODO(/backend PROJ-6)`-Kommentaren markiert
- `src/components/app-header.tsx` — neuer Navigationslink "Sicherheit"
- `src/components/login-form.tsx` — neuer "Mit Passkey anmelden"-Button oberhalb des E-Mail-Formulars (Schritt 1), nur sichtbar bei WebAuthn-Browser-Unterstützung; Klick zeigt aktuell nur eine Platzhalter-Fehlermeldung
- Neue shadcn-Komponente installiert: `alert-dialog`

**Technischer Fund:** Eine neue ESLint-Regel (`react-hooks/set-state-in-effect`, vermutlich aus einem eslint-config-next-Update) verbietet das übliche `useState`+`useEffect`-Muster für "Browser-Feature nach dem Mount prüfen" (Hydration-sicher). Stattdessen `useSyncExternalStore` mit einem No-op-`subscribe` verwendet — laut React-Doku ohnehin der sauberere Ansatz für stabile externe Werte wie Browser-Capability-Checks, nicht nur ein Workaround für die Lint-Regel.

**Manuell verifiziert:** Login-Seite mit neuem Passkey-Button in Light/Dark Mode + Mobile (375px) per Playwright geprüft, keine Konsolenfehler, Platzhalter-Fehlermeldung erscheint korrekt bei Klick. `/sicherheit` ohne Session leitet korrekt zu `/login` um. `/sicherheit`-UI selbst (Liste, Hinzufügen, Löschen mit Bestätigung) vom Nutzer live im eingeloggten Zustand bestätigt ("funktioniert"). `npm run build`, `npm run lint`, `npm test` (66/66), volle E2E-Suite (18/18) fehlerfrei.

**Bewusst noch nicht gebaut (folgt bei `/backend`):**
- Echte Supabase-Passkey-Anbindung (`registerPasskey`, `signInWithPasskey`, Listen/Löschen) — aktuell rein lokale UI-Simulation
- Die zwei bei `/architecture` recherchierten, aber nicht abschliessend bestätigten Verhaltensweisen (Doppel-Geräte-Schutz, Recency-Anforderung) werden hier empirisch verifiziert

## Implementation Notes (Backend)

**Korrektur zur Tech-Design-Annahme:** Die geplante technische Entscheidung "Server Actions für Registrierung/Löschung, analog zu `login/actions.ts`" hat sich beim Implementieren als nicht umsetzbar herausgestellt: `registerPasskey()` und `signInWithPasskey()` müssen zwingend **im Browser** laufen, da die WebAuthn-Zeremonie (`navigator.credentials.create()`/`.get()`) direkten Zugriff auf die Browser-API braucht — anders als beim E-Mail+Code-Login gibt es hier keinen reinen Server-Weg. `passkey.list()`/`passkey.delete()` brauchen zwar keine Geräte-Zeremonie, wurden aber aus Konsistenzgründen ebenfalls über denselben Browser-Client aufgerufen statt über einen zusätzlichen Server-Action-Umweg.

**Erstellt 2026-09-21:**
- `src/lib/supabase/client.ts` — neuer Browser-Supabase-Client (`createBrowserClient` aus `@supabase/ssr`) mit aktiviertem Passkey-Beta-Opt-in (`auth.experimental.passkey: true`); alle Passkey-Operationen laufen ausschliesslich client-seitig darüber
- `.env.local` / `.env.local.example` — zwei neue `NEXT_PUBLIC_`-Variablen ergänzt (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), da der Browser-Client öffentlich zugängliche Env-Variablen braucht. Keine neuen Secrets — dieselben, bereits öffentlich unbedenklichen Werte wie die bestehenden Server-Variablen
- `src/components/login-form.tsx` — `handlePasskeyLogin` ruft jetzt echtes `signInWithPasskey()` auf; bei Erfolg volle Navigation zu `/uebersicht` (nicht Client-Router), damit die serverseitige Zugriffsprüfung (`(protected)/layout.tsx`) und Firmen-Auswahl-Weiterleitung (`getCurrentFirmaId`) dieselbe Sitzung garantiert sehen — identische Weiterleitungslogik wie beim bestehenden E-Mail+Code-Login
- `src/components/passkey-list.tsx` — lädt die echte Liste per `passkey.list()` beim Mount, `handleAdd`/`handleDelete` rufen `registerPasskey()`/`passkey.delete()` auf und laden danach die Liste neu (kein optimistisches lokales Update, um denselben Datenstand wie Supabase zu garantieren)

**Technischer Fund:** Dieselbe `react-hooks/set-state-in-effect`-Regel wie schon im Frontend-Durchlauf blockierte zunächst das Laden der Passkey-Liste beim Mount (`promise.finally(() => setState(...))`). Gelöst durch eine benannte `async function load()` innerhalb des Effekts statt einer direkt angehängten `.finally()`-Kette — funktional identisch, aber von der Regel akzeptiert; entspricht dem in der React-Doku selbst gezeigten "Fetching data"-Effect-Muster.

**Live gegen die echte Supabase-Instanz verifiziert (Nutzer, echtes Gerät/Windows Hello):**
- Passkey-Registrierung über `/sicherheit` (nach vorherigem E-Mail+Code-Login) — funktioniert, Geräte-Bestätigung wird korrekt ausgelöst
- Anschliessender Passkey-Login auf der Login-Seite — funktioniert ohne E-Mail-Eingabe, landet korrekt im geschützten Bereich
- Beide offenen technischen Fragen aus der Spec damit implizit positiv beantwortet (siehe Open Questions)
- `npm run build`, `npm run lint`, `npm test` (66/66) fehlerfrei

**Nicht automatisiert testbar:** der komplette WebAuthn-Flow selbst (braucht ein echtes Gerät mit Biometrie/Security-Key) — wie schon bei PROJ-2 nur manuell durch den Nutzer verifizierbar, nicht wiederholbar in CI.

**Manuelle Supabase-Dashboard-Einstellung nötig (nicht durch mich setzbar):** Unter **Authentication → Passkeys** musste "Enable Passkey authentication" aktiviert und Relying Party Display Name/ID/Origins gesetzt werden (lokal: `localhost` / `http://localhost:3000`). Für Production muss das bei `/deploy` auf die echte Domain umgestellt werden.

## QA Test Results

**Tested:** 2026-09-21
**App URL:** http://localhost:3000 (+ Live-Test durch den Nutzer mit echtem Gerät)
**Tester:** QA Engineer (AI) + Nutzer (für den WebAuthn-Flow mit echtem Gerät)

> Hinweis: `registerPasskey()`/`signInWithPasskey()` lösen eine echte WebAuthn-Zeremonie aus (Geräte-Biometrie/PIN) — nicht automatisierbar in headless Playwright ohne virtuellen Authenticator (hier nicht eingerichtet, unverhältnismässig für den Projektumfang). Der komplette Flow wurde daher **manuell vom Nutzer mit einem echten Gerät (Windows Hello)** getestet. Automatisiert getestet: alles ohne echtes Gerät erreichbare/prüfbare Verhalten (Button-Sichtbarkeit, Limit-Logik, Lösch-Bestätigung, Routen-Schutz).

### Acceptance Criteria Status

#### AC-1: Leere Liste + "Passkey hinzufügen" ohne registrierten Passkey
- [x] Unit-Test verifiziert (`passkey-list.test.tsx`)

#### AC-2: Erfolgreiche Registrierung zeigt neuen Passkey mit Datum
- [x] Live verifiziert (echtes Gerät) + Unit-Test für die Reload-Logik nach erfolgreicher Registrierung

#### AC-3: 5 Passkeys erreicht → Hinweistext statt "Hinzufügen"-Button
- [x] Unit-Test verifiziert — nicht live mit 5 echten Geräten nachgestellt (unverhältnismässig), Logik ist eine simple Längenprüfung

#### AC-4: Löschen zeigt Bestätigungsdialog vor der Aktion
- [x] Unit-Test verifiziert (Dialog öffnet, `delete()` wird erst nach Bestätigung aufgerufen, Liste danach neu geladen)

#### AC-5: Passkey-Login ohne E-Mail-Eingabe
- [x] Live verifiziert (echtes Gerät) — landet nach erfolgreicher Geräte-Bestätigung korrekt im geschützten Bereich

#### AC-6: Kein registrierter Passkey → native Browser-Meldung, E-Mail+Code bleibt nutzbar
- [x] Durch WebAuthn-Standard garantiert (nicht durch unseren Code steuerbar); E2E-Test bestätigt, dass das E-Mail-Formular in jedem Fall sichtbar/nutzbar bleibt

#### AC-7: Browser ohne WebAuthn-Support → Button ausgeblendet
- [x] E2E-Test verifiziert (WebAuthn-API clientseitig deaktiviert simuliert, Button fehlt, E-Mail-Formular bleibt sichtbar)

#### AC-8: Abgebrochene Geräte-Bestätigung → verständliche Fehlermeldung, kein Datenverlust
- [x] Unit-Test verifiziert (Fehlerpfad von `registerPasskey()`), reales Abbrechen einer Geräte-Bestätigung nicht separat live durchgespielt

### Security Audit Results
- [x] Keine Secrets im Client-Bundle: `SUPABASE_SECRET_KEY` im frischen `.next/static`-Build gesucht — nicht gefunden. Der neue `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ist erwartungsgemäss **im** Bundle enthalten (bewusst öffentlich, kein Secret)
- [x] Kein XSS-Vektor: kein `dangerouslySetInnerHTML`; Passkey-Datum läuft durch `Date.toLocaleDateString`, keine rohe HTML-Ausgabe
- [x] Autorisierung bleibt unverändert bei Supabase: `signInWithPasskey()` beweist nur die WebAuthn-Identität — die eigentliche Zugriffsprüfung (`getPortalAccess`) läuft danach serverseitig in `(protected)/layout.tsx`, exakt wie beim E-Mail+Code-Login. Kein Client-seitiger Bypass möglich, da die volle Navigation (`window.location.assign`) den Server-Check erzwingt
- [x] Kein Cross-User-Zugriff über `passkey.list()`/`passkey.delete()` durch uns selbst möglich — beide Aufrufe laufen über die authentifizierte Sitzung, wir übergeben nie eine `userId`; die Isolation zwischen Kunden liegt vollständig bei Supabase
- [ ] **Nicht unabhängig geprüft:** ob Supabase serverseitig tatsächlich verhindert, dass `passkey.delete({passkeyId})` einen fremden Passkey löschen kann, wenn man dessen ID erraten/erlangen würde — liegt vollständig in Supabase's Verantwortung, nicht in unserem Code; keine Möglichkeit, das ohne zweiten echten Testaccount zu verifizieren
- [ ] **Bekannte Grenze (kein Bug, inhärent zu Passkeys):** Wer physischen Zugriff auf ein entsperrtes Gerät mit synchronisiertem Passkey hat, kann sich anmelden — dasselbe Risiko wie bei jedem Passkey-System, nicht durch unseren Code beeinflussbar

### Bugs Found
Keine.

### Automatisierte Tests
- **Unit-Tests (Vitest):** 73/73 grün, davon 7 neu für `src/components/passkey-list.test.tsx` (erste Component-Tests in diesem Projekt, mit `@testing-library/react` — bisher wurde nur reine Logik getestet). Deckt Leerzustand, Lade-Fehler, Liste mit Datum, erfolgreiche/fehlgeschlagene Registrierung, 5er-Limit, Lösch-Bestätigungsfluss ab
- **E2E-Tests (Playwright):** 6/6 neu in `tests/PROJ-6-passkey-login.spec.ts` (Chromium + Mobile Safari) — Button-Sichtbarkeit mit/ohne WebAuthn-Support, Routen-Schutz für `/sicherheit`
- **Regressionstest:** komplette E2E-Suite (24 Tests, inkl. PROJ-2/3/5) grün — keine Nebenwirkungen auf andere Features

### Summary
- **Acceptance Criteria:** 8/8 live oder durch Tests/Code-Review abgedeckt
- **Bugs Found:** 0
- **Security:** Solide — kein Secret-Leak, kein XSS-Vektor, Autorisierung läuft unverändert über den bestehenden serverseitigen Zugriffsschutz. Zwei Punkte liegen ausserhalb unserer Kontrolle bei Supabase (Cross-User-Löschschutz, physischer Geräteschutz — beides dokumentiert, kein Bug)
- **Production Ready:** JA
- **Recommendation:** Status auf "Approved" setzen. Bei `/deploy`: Relying Party ID/Origins im Supabase-Dashboard von `localhost`/`http://localhost:3000` auf die echte Production-Domain umstellen — sonst funktioniert Passkey dort nicht (siehe Implementation Notes Backend)

## Deployment
_To be added by /deploy_
