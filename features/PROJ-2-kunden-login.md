# PROJ-2: Kunden-Login (Supabase Auth)

## Status: Approved
**Created:** 2026-09-16
**Last Updated:** 2026-09-21

> **Fundamentale Neuausrichtung (2026-09-21):** Auth-Provider gewechselt von Microsoft Entra External ID zu Supabase Auth (Details siehe Decision Log). "Tech Design" (`/architecture`), Frontend (`/frontend`), Backend (`/backend`) und "QA Test Results" sind vollständig für Supabase Auth aktualisiert und **production-ready** (7/7 Acceptance Criteria, siehe QA Test Results). Nur "Deployment" ganz unten beschreibt noch die **bisherige, produktiv gelaufene Entra-Implementierung** — die aktuell auf Vercel deployte Version läuft unverändert mit Entra External ID weiter, bis `/deploy` erneut läuft.

## Dependencies
- Requires: PROJ-1 (Dataverse-Sync-Service) — für den Abgleich der E-Mail-Adresse gegen synchronisierte Kontakt-/Relation-/Firma-Daten

## User Stories
- Als Kunde möchte ich mich mit meiner Geschäfts-E-Mail und einem Einmal-Code registrieren/anmelden, damit ich Zugriff auf meine Geräte- und Prüfberichtsdaten erhalte.
- Als Kunde mit mehreren zugeordneten Firmen möchte ich zwischen diesen wechseln können, damit ich jeweils nur die für mich relevanten Daten sehe.
- Als Kunde ohne gültige Zuordnung möchte ich eine klare Meldung mit Kontaktmöglichkeit sehen, damit ich weiss, wie ich Zugang bekomme.
- Als OBSI Hofer AG möchte ich, dass nur Kunden mit einer aktiven, gültigen Kontakt-Zuordnung in Dataverse Zugriff auf Daten erhalten, damit keine Fremd- oder veralteten Daten offengelegt werden.
- Als Kunde möchte ich mich abmelden können, damit ich meine Sitzung sicher beenden kann.

## Out of Scope
- Eigene Konto-Verwaltung (Profil bearbeiten) — entfällt ohnehin grösstenteils durch reinen E-Mail-Einmal-Code-Login (kein Passwort zu verwalten)
- Sofortige Sperrung einer laufenden Sitzung bei Entzug des Zugriffs — die Zuordnung wird nur beim (nächsten) Login geprüft
- Automatisiertes Ticket-/Support-System bei "Kein Zugang" — nur statischer Kontakthinweis
- Admin-Verwaltung der Kontakt-Zuordnung im Portal — erfolgt weiterhin ausschliesslich in Dataverse
- Rollenbasierte Rechte innerhalb einer Firma (z.B. Kontakt X sieht weniger als Kontakt Y derselben Firma) — alle aktiven Kontakte einer Firma sehen dieselben Daten dieser Firma
- Eigene MFA-Konfiguration/-Logik — es werden die Standard-Sicherheitseinstellungen von Supabase Auth verwendet
- Passkey (FIDO2)-Login für Kunden — durch den Wechsel zu Supabase Auth technisch nicht mehr blockiert (siehe Decision Log, 2026-09-21), aber bewusst nicht Teil dieser Spec-Version; eigene, spätere Erweiterung

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Kunde ist noch nicht registriert, wenn er sich mit seiner Geschäfts-E-Mail per Einmal-Code anmeldet und die E-Mail-Adresse verifiziert, dann wird geprüft, ob diese E-Mail (unabhängig von Gross-/Kleinschreibung) einem synchronisierten, **aktiven** Kontakt entspricht
- [ ] Angenommen die E-Mail eines Kunden entspricht einem aktiven Kontakt mit genau einer zugeordneten Firma, wenn der Login erfolgreich ist, dann wird der Kunde direkt zur Übersicht dieser Firma weitergeleitet
- [ ] Angenommen die E-Mail eines Kunden entspricht einem aktiven Kontakt mit mehreren zugeordneten Firmen, wenn der Login erfolgreich ist, dann sieht der Kunde eine Firmen-Auswahl, bevor er auf Geräte/Prüfberichte zugreifen kann
- [ ] Angenommen die E-Mail eines Kunden entspricht keinem bekannten Kontakt oder einem inaktiven Kontakt, wenn der Login-Vorgang abgeschlossen ist, dann wird dieselbe generische "Kein Zugang"-Meldung mit Kontaktmöglichkeit angezeigt und keine Kundendaten werden geladen
- [ ] Angenommen ein Kunde ist eingeloggt, wenn er auf "Abmelden" klickt, dann wird seine Sitzung beendet und er landet auf der Login-Seite
- [ ] Angenommen ein Kunde wählt in der Firmen-Auswahl eine Firma, wenn er zur Übersicht wechselt, dann werden auf allen folgenden Seiten (Geräte, Prüfberichte, Dashboard) ausschliesslich Daten dieser Firma angezeigt
- [ ] Angenommen die Kontakt-Zuordnung oder der Aktiv-Status eines Kunden ändert sich in Dataverse, wenn der Kunde sich das nächste Mal einloggt, dann spiegelt sein Zugriff den aktuellen Stand wider

## Edge Cases
- Der Kontakt existiert bereits in Dataverse, wurde aber vom PROJ-1-Sync noch nicht übernommen (Race Condition) → wird wie "kein Zugang" behandelt, mit Hinweis, es später erneut zu versuchen
- Die zugeordnete Firma wurde in Dataverse gelöscht/deaktiviert → Zugriff auf diese Firma entfällt (bei nur einer Firma: "kein Zugang"; bei mehreren: sie verschwindet aus der Auswahl)
- Ein Kontakt wird von "aktiv" auf "inaktiv" gesetzt, während er gerade eingeloggt ist → keine sofortige Auswirkung auf die laufende Sitzung (siehe Out of Scope), erst beim nächsten Login
- E-Mail-Abgleich erfolgt unabhängig von Gross-/Kleinschreibung
- Ein Kunde mit mehreren Firmen meldet sich erneut an → es wird bei jedem Login erneut die Firmen-Auswahl gezeigt, keine gespeicherte "zuletzt verwendete Firma"

## Technical Requirements (optional)
- Sicherheit: Zugriffsprüfung ausschliesslich serverseitig gegen synchronisierte Dataverse-Daten (Kontakt-Status + Relation zu Firma), nie rein clientseitig
- Auth-Provider: Supabase Auth (E-Mail-Einmal-Code; selbes Supabase-Projekt wie die PROJ-1-Spiegeldaten)

## Open Questions
- [x] Gibt es Rollen in `bmvcc_relation.bmvcc_role_description`, die keinen Zugriff mehr rechtfertigen (z.B. "ehemalig")? → Gelöst: `bmvcc_Kontakt` hat ein eigenes Status-Feld (aktiv/inaktiv); massgeblich für Zugriff ist dieser Status, nicht die Rollenbeschreibung (2026-09-16)
- [x] Neuer Microsoft-Entra-External-ID-Tenant musste vom Nutzer erstellt werden (der bisherige App-Registrierungs-Versuch lag im normalen Mitarbeiter-Tenant, der keine Self-Service-Fremdanmeldung erlaubt — AADSTS90072) → erledigt, neuer Tenant erstellt, Login-Flow live verifiziert (2026-09-17)
- [x] Können wir Kunden das Anmelden per Passkey (FIDO2) ermöglichen, statt/zusätzlich zu E-Mail+Einmalcode? → Ursprünglich (mit Entra External ID) recherchiert und zurückgestellt, siehe Decision Log für die vier Blocker (2026-09-21). Durch den Wechsel zu Supabase Auth (selbes Datum) sind diese Blocker hinfällig; Passkey bleibt trotzdem vorerst Out of Scope, siehe oben
- [x] Gibt es einen bewussten Grund für die ursprüngliche PRD-Festlegung "Auth: Microsoft Entra External ID (nicht Supabase Auth)"? → Nutzer erinnert keinen bewussten Grund; Einschränkung aufgehoben, solange das Portal noch keine Produktivnutzer hat (2026-09-21)
- [ ] Was passiert mit dem bestehenden Entra-External-ID-Tenant ("B2C Obsi-Hofer GmbH") und der App-Registrierung "Kundenportal" — abbauen oder unverändert stehen lassen? Nicht entschieden, keine Dringlichkeit (keine Kosten bei Nichtnutzung unterhalb der Free-Tier-Grenzen)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Self-Service-Anmeldung über Entra External ID statt manueller Einzel-Einladung | Kein manueller Aufwand pro neuem Kunden für ein Ein-Personen-Team; Datenzugriff bleibt trotzdem strikt auf bekannte, aktive Kontakte beschränkt | 2026-09-16 |
| Bei mehreren zugeordneten Firmen wählt der Kunde nach Login aktiv eine Firma aus (kein kombinierter Multi-Firmen-Blick) | Vermeidet Vermischung von Daten unterschiedlicher Kundenbeziehungen; einfachere Anzeige-Logik für PROJ-3/4/5 | 2026-09-16 |
| Zuordnung/Status wird bei jedem Login neu geprüft, nicht dauerhaft in einem Portal-Konto gespeichert | Änderungen in Dataverse wirken sich automatisch beim nächsten Login aus, ohne zusätzlichen Abgleichsmechanismus während einer laufenden Sitzung | 2026-09-16 |
| Zugriffsvoraussetzung ist der Aktiv-Status des Kontakts (`bmvcc_Kontakt`-Statusfeld), nicht die Rollenbeschreibung in `bmvcc_relation` | Klareres, bereits vorhandenes Signal in Dataverse für "nicht mehr aktuell" | 2026-09-16 |
| "Kein Zugang" zeigt für unbekannte UND inaktive Kontakte dieselbe generische Meldung | Verhindert, dass von aussen erkennbar ist, ob eine E-Mail-Adresse existiert(e) oder nur deaktiviert wurde | 2026-09-16 |
| Passkey (FIDO2)-Login für Kunden wird vorerst nicht umgesetzt | Vier Blocker laut offizieller Microsoft-Doku ([Sign in with passkeys in Microsoft Entra External ID](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-sign-in-with-passkey), Stand 2026-09-21): (1) Passkey-Registrierung ist nur für E-Mail+Passwort-/Username+Passwort-Konten möglich — unser aktuelles Modell (E-Mail + Einmal-Passcode) wird explizit noch nicht unterstützt ("on the roadmap", kein Datum); Umstieg auf Passwort-Konten wäre eine eigene Produktentscheidung. (2) Erfordert eine für den Tenant konfigurierte Custom-URL-Domain als Relying Party — ohne diese fällt `rp.id` auf Microsofts eigene Domain zurück (im passkey-sample-Test verifiziert: `login.microsoft.com`, was zu einem WebAuthn-Origin-Fehler führt). (3) Microsoft liefert keine fertige Registrierungs-UI — wir müssten eine eigene "Passkey verwalten"-Seite im Portal bauen. (4) Die einzige verfügbare Graph-API nutzt hochprivilegierte Application Permissions statt delegierter Nutzer-Rechte; Microsoft selbst rät für Kunden-Self-Service davon ab, die passende Low-Privilege-API ist noch nicht verfügbar ("on the roadmap"). Bei Bedarf erneut prüfen, sobald Microsoft E-Mail-OTP-Unterstützung oder Low-Privilege-APIs liefert. | 2026-09-21 |
| Nachtrag: Admin-Provisionierung (statt Self-Service-OTP-Anmeldung) würde nur Blocker (1) auflösen, nicht die Gesamteinschätzung ändern | Kunden liessen sich per Graph-API `Create User` direkt als E-Mail+Passwort-Lokalkonto anlegen (statt Self-Service-Registrierung mit Einmalcode) — das macht sie passkey-fähig bezüglich Kontotyp. Aber: Microsoft bietet dafür keinen automatischen Passwort-Setup-Mailversand (nur für Workforce-Tenants vorgesehen); wir müssten Initial-Passwort-Vergabe und -Versand (z.B. über unseren bestehenden Resend-Versand) sowie den Account-Lifecycle selbst bauen — zusätzlicher eigener Aufwand, der durch die jetzige Self-Service-OTP-Anmeldung komplett entfällt. Blocker (2) Custom-Domain, (3) fehlende Microsoft-UI und (4) High-Privilege-API bleiben unabhängig vom Onboarding-Weg bestehen. Ändert die Entscheidung oben nicht. | 2026-09-21 |
| **Fundamentaler Wechsel: Auth-Provider von Microsoft Entra External ID auf Supabase Auth** | Auslöser: die vier Passkey-Blocker bei Entra External ID (s. oben) plus der PRD-Constraint "nicht Supabase Auth" hatte keinen erinnerlichen Grund mehr. Für Supabase Auth spricht: (1) natives Passkey/WebAuthn-Support ohne die vier Entra-Blocker (keine Custom-Domain-Pflicht, kein Passwort-Kontozwang, fertige SDK-Methoden statt Eigenbau-Registrierungs-UI, keine High-Privilege-Graph-API nötig); (2) ein System statt zwei — Supabase wird durch PROJ-1 ohnehin schon für die Dataverse-Spiegeldaten genutzt, ein separater Entra-Tenant nur fürs Login entfällt; (3) NextAuth/Middleware-Komplexität entfällt (u.a. Ursache von BUG-1, siehe QA-Abschnitt unten); (4) kostenlos im aktuellen Rahmen — Supabase Free Plan enthält 50'000 MAU, bei 588 Kontakten irrelevant, kein Unterschied zu vorher. Entscheidender Zeitpunkt-Faktor: Portal hat noch **keine Produktivnutzer**, nur Testuser — Wechsel jetzt ohne Migrationsrisiko, wäre nach echtem Kunden-Rollout deutlich teurer gewesen. E-Mail-Verifizierung bleibt bewusst als **Einmal-Code** (nicht Magic Link), um dieselbe Nutzer-UX wie bisher beizubehalten. Passkey selbst wird durch diesen Wechsel nicht automatisch gebaut — bleibt weiterhin Out of Scope dieser Spec-Version, ist aber jetzt eine machbare spätere Erweiterung statt eine mit vier offenen Blockern. | 2026-09-21 |

### Technical Decisions
<!-- Added by /architecture -->

> **Hinweis (2026-09-21):** Die Einträge ab "NextAuth.js (Auth.js) mit Microsoft-Entra-External-ID-Provider" bis einschliesslich "Issuer-URL für den Entra-Provider" beschreiben die **superseded** Entra-External-ID/NextAuth-Implementierung (siehe Fundamentaler Wechsel oben in den Product Decisions) und bleiben nur als historische Referenz stehen. Die Einträge darüber sind die aktuellen, für Supabase Auth gültigen Entscheidungen.

| Decision | Rationale | Date |
|----------|-----------|------|
| `@supabase/ssr` für Session-Verwaltung statt NextAuth | Ersetzt NextAuth vollständig; Supabase's Standardmuster für Next.js-Sitzungscookies, arbeitet über Fetch-Aufrufe und ist dadurch Edge-Runtime-kompatibel (im Gegensatz zum bisherigen vollen `auth.ts` mit Supabase-Admin-Callback) | 2026-09-21 |
| Middleware kann die Sitzungsprüfung (eingeloggt/nicht) jetzt direkt selbst übernehmen, ohne die bisherige Aufteilung in `auth.config.ts`/`auth.ts` | Supabase's Session-Check ist Edge-kompatibel; die feine Zugriffsprüfung (Kontakt/Firma, braucht Datenbankzugriff) bleibt weiterhin im geschützten Layout (Node.js-Runtime) — dieselbe Grund-Aufteilung wie bisher, aber ohne die bisherige Zwei-Config-Krücke | 2026-09-21 |
| E-Mail-Einmal-Code (`signInWithOtp` mit OTP, nicht Magic Link) | Entspricht der bisherigen Nutzer-Erwartung (Entra lieferte ebenfalls einen Code, keinen Link); vermeidet zudem Probleme mit E-Mail-Scannern, die Links vorzeitig öffnen | 2026-09-21 |
| Kein separater "Registrieren"-Schritt — `shouldCreateUser` bleibt auf Standard (aktiviert) | Erhält die bisherige Self-Service-UX (Produktentscheidung 2026-09-16): unbekannte, aber aktive Dataverse-Kontakte sollen beim ersten Login direkt Zugriff bekommen, ohne Extra-Schritt | 2026-09-21 |
| Federated Logout (Redirect zu Microsofts `end_session_endpoint`) entfällt ersatzlos | War nur nötig, weil Entra zusätzlich zu unserer eigenen Sitzung eine eigene Microsoft-Sitzung führte, die sonst beim nächsten Login die E-Mail vorausgefüllt hätte; bei Supabase Auth gibt es keine separate externe Sitzung, normales Abmelden (`supabase.auth.signOut()`) reicht aus | 2026-09-21 |
| NextAuth.js (Auth.js) mit Microsoft-Entra-External-ID-Provider | Standard-Lösung im Next.js-Ökosystem für OIDC-Logins, übernimmt Redirects, Token-Prüfung und sichere Session-Cookies | 2026-09-16 |
| Zugriffsprüfung (Kontakt aktiv? + Relation zu Firma) läuft als eigener Schritt direkt nach dem Entra-Login, bevor eine gültige Portal-Sitzung entsteht | Trennt "bei Microsoft angemeldet" klar von "hat Zugriff auf Kundendaten" | 2026-09-16 |
| Keine eigene "Portal-Benutzer"-Tabelle — Kontakt/Firmen-Zuordnung wird bei jedem Login frisch aus den PROJ-1-Tabellen ermittelt und nur in der Session gehalten | Passt zur Produktentscheidung "Zuordnung wird bei jedem Login neu geprüft"; vermeidet eine zusätzliche, potenziell veraltende Tabelle | 2026-09-16 |
| Alle Seiten außer Login/"Kein Zugang" sind serverseitig geschützt (nicht nur im Frontend versteckt) | Verhindert Datenzugriff durch reines URL-Aufrufen ohne gültige Sitzung | 2026-09-16 |
| Speicherort der PROJ-1-Spiegeldaten bleibt Supabase/Postgres (nicht Azure Database for PostgreSQL) | Erneut abgewogen: geringerer Setup-Aufwand und bereits im Template vorbereitet, trotz fehlender Schweizer Supabase-Region — akzeptierter Kompromiss für ein Ein-Personen-Team, bestätigt PROJ-1 | 2026-09-16 |
| NextAuth-Konfiguration aufgeteilt in `auth.config.ts` (Edge-tauglich, nur Provider, für `middleware.ts`) und `auth.ts` (voll, mit Supabase-Callback, für alles andere) | Middleware/Proxy läuft in der Edge-Runtime ohne Datenbank-Zugriff; der volle Auth-Config mit Supabase-Callback schlug dort lautlos fehl (Standard-Auth.js-Muster für DB-Callbacks) | 2026-09-16 |
| Die eigentliche `hasAccess`-Prüfung + Firmen-Auswahl-Logik laufen in `src/app/(protected)/layout.tsx` bzw. den einzelnen Seiten (Node.js-Runtime), nicht mehr in der Middleware | Middleware kann nur die grobe "eingeloggt?"-Prüfung ohne DB-Zugriff übernehmen; die feine Zugriffsprüfung braucht Supabase | 2026-09-16 |
| Datei heisst weiterhin `middleware.ts`, nicht `proxy.ts` | In Next.js 16.1.1 löste `proxy.ts` trotz korrekter Konvention (Root-Verzeichnis, benannter/Default-Export) nicht aus; `middleware.ts` funktioniert (laut Next.js selbst "deprecated, aber noch verfügbar") | 2026-09-16 |
| Issuer-URL für den Entra-Provider: `https://<tenant-id>.ciamlogin.com/<tenant-id>/v2.0` statt `https://login.microsoftonline.com/<tenant-id>/v2.0` | Letzteres verursachte `AADSTS500208` beim Token-Austausch für den External-ID-Tenant; die `ciamlogin.com`-Domain mit Tenant-ID (nicht Firmenname) als Subdomain entspricht dem tatsächlichen `issuer`-Feld im OIDC-Discovery-Dokument, das Auth.js strikt validiert | 2026-09-17 |
| Login-Button-Text vereinfacht auf "Anmelden" statt "Mit Entra External ID anmelden" | Kunden kennen den Begriff "Entra External ID" nicht — internes Microsoft-Fachjargon gehört nicht in kundenseitige UI | 2026-09-17 |
| "Abmelden" nutzt "federated logout" (zusätzlicher Redirect zum `end_session_endpoint` des Tenants), statt nur `signOut()` unserer eigenen Session | `signOut()` allein beendet nur unsere App-Session; die Tenant-eigene Microsoft-Sitzung blieb bestehen und füllte beim nächsten Login-Versuch automatisch die zuletzt verwendete E-Mail wieder ein | 2026-09-17 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponenten-Struktur

```
App (mit Auth-Schutz)
├── Login-Seite
│   ├── Schritt 1: E-Mail-Adresse eingeben → "Code anfordern"
│   └── Schritt 2: 6-stelligen Einmal-Code eingeben → "Anmelden"
│       (unbekannte E-Mail erhält denselben Code-Versand — Konto entsteht
│       implizit beim ersten erfolgreichen Login, kein separater
│       "Registrieren"-Schritt, wie bisher bei Entra)
├── Nach erfolgreicher Code-Bestätigung: serverseitige Zugriffsprüfung (unverändert)
│   ├── Kein aktiver, passender Kontakt gefunden
│   │   └── "Kein Zugang"-Seite (Meldung + Kontakt-Link + "Abmelden/andere E-Mail versuchen")
│   ├── Genau eine zugeordnete Firma
│   │   └── direkte Weiterleitung zur Firma-Übersicht (PROJ-3/4/5)
│   └── Mehrere zugeordnete Firmen
│       └── Firmen-Auswahl-Seite (Liste zum Anklicken)
└── Navigation (eingeloggter Zustand)
    └── "Abmelden"-Button
```

### Datenmodell (in Textform)

Es wird weiterhin keine eigene "Portal-Benutzer"-Tabelle angelegt — diese Entscheidung ändert sich durch den Provider-Wechsel nicht. Supabase Auth führt intern eine eigene, für uns unsichtbare Nutzerliste (E-Mail + Verifizierungsstatus); wir greifen nur auf die verifizierte E-Mail der aktuellen Sitzung zu. Bei jedem Login läuft weiterhin dieser Ablauf:
1. Die von Supabase verifizierte E-Mail wird gegen die (aus PROJ-1 gespiegelten) Kontakt-Daten abgeglichen (Status muss aktiv sein)
2. Ist der Kontakt aktiv, werden über die Relation-Tabelle alle zugeordneten Firmen ermittelt
3. Kontakt-ID + Liste der Firmen + aktuell gewählte Firma werden nur für die Dauer der Sitzung gespeichert (Session), nicht dauerhaft in der Datenbank

Die Sitzung selbst wird von Supabase Auth verwaltet (sichere, serverseitig lesbare Cookies) — technisch vergleichbar mit dem bisherigen NextAuth-Session-Cookie, nur ohne den Zwischenschritt über einen externen Microsoft-Tenant.

### Technische Entscheidungen (Begründung)
Siehe Decision Log → Technical Decisions oben.

### Abhängigkeiten (Packages)
- `@supabase/ssr` — neu: verwaltet die Supabase-Sitzung serverseitig (Cookies) für Next.js, ersetzt die Rolle von `next-auth`
- `@supabase/supabase-js` — bereits vorhanden (PROJ-1), jetzt zusätzlich für Auth (E-Mail-Code anfordern/bestätigen) statt nur für den Abgleich gegen Kontakt/Relation/Firma
- `next-auth` — wird entfernt, nicht mehr benötigt

---

### Archiviert — ursprüngliches Tech Design (Entra External ID, 2026-09-16)

*Nur noch als historische Referenz, siehe Hinweis-Banner ganz oben. Beschreibt die Implementierung, die derzeit noch produktiv auf Vercel läuft.*

```
App (mit Auth-Schutz)
├── Login-Seite
│   └── "Mit Entra External ID anmelden" → leitet zur gehosteten Entra-Anmeldeseite weiter
├── Nach erfolgreichem Entra-Login: serverseitige Zugriffsprüfung
│   ├── Kein aktiver, passender Kontakt gefunden
│   │   └── "Kein Zugang"-Seite (Meldung + Kontakt-Link + "Abmelden/andere E-Mail versuchen")
│   ├── Genau eine zugeordnete Firma
│   │   └── direkte Weiterleitung zur Firma-Übersicht (PROJ-3/4/5)
│   └── Mehrere zugeordnete Firmen
│       └── Firmen-Auswahl-Seite (Liste zum Anklicken)
└── Navigation (eingeloggter Zustand)
    └── "Abmelden"-Button
```

Datenmodell war identisch aufgebaut (E-Mail gegen Kontakt/Relation abgleichen, keine eigene Portal-Benutzer-Tabelle), nur mit der Entra-Token-E-Mail statt der Supabase-verifizierten E-Mail als Quelle. Abhängigkeiten waren `next-auth` (Entra-External-ID-Anbindung) + `@supabase/supabase-js` (nur für den Datenabgleich, nicht für Auth selbst).

## Implementation Notes (Frontend)

**Erstellt 2026-09-21 (Supabase-Auth-UI, Platzhalter-Verhalten ohne echte Anbindung — folgt bei `/backend`):**
- `src/app/login/page.tsx` — umgebaut: kein NextAuth-`auth()`/`signIn()`-Aufruf mehr, rendert stattdessen `<LoginForm />`
- `src/components/login-form.tsx` — neuer zweistufiger Client-Component-Flow: Schritt 1 E-Mail eingeben ("Code anfordern"), Schritt 2 6-stelliger Einmal-Code (shadcn `InputOTP`) + "Anmelden" + "Andere E-Mail-Adresse verwenden" (springt zurück zu Schritt 1, leert E-Mail-Feld)
- Neue shadcn/ui-Komponenten installiert: `input-otp`, `label`
- Beide Schritte mit `TODO(/backend PROJ-2)`-Kommentaren markiert (`supabase.auth.signInWithOtp` / `supabase.auth.verifyOtp`); Absenden von Schritt 2 zeigt aktuell nur einen Platzhalter-Hinweis ("Anmeldung ist noch nicht angebunden")

**Manuell verifiziert (Playwright, `npm run dev`):** Beide Schritte durchgeklickt (Light + Dark Mode, 375px Mobile-Breite), Design-System-Farben (Stahlblau-Primärfarbe, Destructive-Rot für die Platzhalter-Fehlermeldung) korrekt angewendet, keine Konsolenfehler. `npm run build` und `npm run lint` fehlerfrei. Dabei einen kleinen UX-Bug gefunden und direkt behoben: "Andere E-Mail-Adresse verwenden" leerte das E-Mail-Feld nicht.

**Bewusst noch nicht gebaut (folgt bei `/backend`):**
- Echte Supabase-Auth-Anbindung (`@supabase/ssr`, `signInWithOtp`/`verifyOtp`) — Formulare zeigen aktuell nur Platzhalter-Verhalten
- Middleware/`(protected)/layout.tsx`/`app-header.tsx`/`kein-zugang/page.tsx` laufen technisch noch auf der alten NextAuth-`auth()`-Anbindung (unverändert in diesem Frontend-Durchlauf, wird bei `/backend` mit umgestellt)
- Serverseitiger Schutz von `/login` (Redirect bei bereits bestehender Session) — TODO-Kommentar in `login/page.tsx`

---

### Archiviert — ursprüngliche Implementation Notes (Entra External ID, 2026-09-16)

*Nur noch als historische Referenz, siehe Hinweis-Banner ganz oben.*

**Erstellt (Platzhalter-Verhalten, ohne echte Auth — folgt bei `/backend`):**
- `src/app/login/page.tsx` — Login-Seite mit "Mit Entra External ID anmelden"-Button
- `src/app/kein-zugang/page.tsx` — generische "Kein Zugang"-Meldung + Kontakt-E-Mail (`robert.bienz@obsi-hofer.ch`) + "Abmelden/andere E-Mail versuchen"
- `src/app/firmen-auswahl/page.tsx` — Firmen-Auswahl mit Platzhalter-Firmenliste
- `src/components/app-header.tsx` — wiederverwendbarer Header mit "Abmelden"-Button, wird auch von PROJ-3/4/5 genutzt werden
- `src/app/page.tsx` — Root-Route leitet jetzt auf `/login` weiter (ersetzt die Next.js-Default-Startseite)
- `src/app/layout.tsx` — Titel/Description aktualisiert, `<Toaster />` eingebunden (für Firmen-Auswahl-Feedback)

**Bewusst noch nicht gebaut (folgt bei `/backend`):**
- Echte Entra-External-ID-Anbindung (`next-auth`) — Buttons navigieren aktuell nur zwischen den Platzhalter-Seiten (mit `TODO(/backend PROJ-2)`-Kommentaren markiert)
- Serverseitiger Schutz der Seiten (aktuell sind alle Routen ohne Session erreichbar)
- Echte Kontakt-/Relation-Abfrage gegen die PROJ-1-Supabase-Tabellen

**Manuell verifiziert:** Alle drei Seiten + Root-Redirect liefern korrektes HTML (`curl` gegen laufenden Dev-Server), `npm run build` und `npx tsc --noEmit` fehlerfrei. Kein Playwright-Browser-Klicktest in dieser Session durchgeführt — folgt bei `/qa`.

## Implementation Notes (Backend)

**Erstellt 2026-09-21 (Supabase-Auth-Anbindung):**
- `src/lib/supabase/server.ts` — `createSupabaseServerClient()`, für Server Actions/Route Handlers/Server Components (Publishable Key, kein RLS-Bypass)
- `src/lib/supabase/middleware.ts` — `updateSession()`, Edge-taugliche Sitzungsprüfung für `middleware.ts` (nur Fetch-Aufrufe, kein Node-DB-Zugriff)
- `src/lib/auth/session.ts` — `getCurrentUserEmail()`, mit React `cache()` dedupliziert pro Request
- `src/lib/auth/access.ts` — `getPortalAccess()` jetzt ebenfalls mit `cache()` gewrappt; Logik selbst unverändert. Wird jetzt bei **jedem** Seitenaufruf frisch ausgeführt statt einmalig im Session-Token zwischengespeichert (einfacher, kein Custom-JWT-Claim-Mechanismus nötig; unkritisch bei 588 Kontakten)
- `src/app/login/actions.ts` — neue Server Actions `requestLoginCode` (`signInWithOtp`) und `verifyLoginCode` (`verifyOtp` + Redirect je nach `getPortalAccess`)
- `src/components/login-form.tsx` — Platzhalter-TODOs durch echte Aufrufe der obigen Server Actions ersetzt
- `src/lib/auth/sign-out.ts` — `supabase.auth.signOut()` statt Federated-Logout-Redirect (kein externer Tenant mehr, der eine eigene Sitzung hält)
- `src/app/(protected)/layout.tsx`, `kein-zugang/page.tsx`, `app-header.tsx`, `firmen-auswahl/actions.ts`, `firmen-auswahl/page.tsx`, `current-firma.ts` — `auth()`/`session.portal` durch `getCurrentUserEmail()` + `getPortalAccess()` ersetzt
- `middleware.ts` — nutzt jetzt `updateSession()` statt NextAuth
- **Entfernt:** `auth.ts`, `auth.config.ts`, `src/app/api/auth/[...nextauth]/route.ts`, Paket `next-auth`
- **Keine neuen Env-Variablen nötig** — `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` waren durch PROJ-1 bereits vorhanden

**Live gegen die echte Supabase-Instanz verifiziert (Playwright, Testkontakt `robert.bienz@cloudcab.ch`):**
- `signInWithOtp` — echter Request ohne Fehler, UI wechselt zu Schritt 2
- `verifyOtp` mit absichtlich falschem Code — korrekte Fehlermeldung "Der Code ist ungültig oder abgelaufen.", kein Redirect, keine Konsolenfehler
- Alle geschützten Routen (`/uebersicht`, `/dashboard`, `/firmen-auswahl`, `/kein-zugang`) leiten ohne Session korrekt zu `/login` um
- `npm run build`, `npm run lint`, `npm test` (61/61) fehlerfrei

**2026-09-21 nachgetragen — Erfolgsfall live mit echtem E-Mail-Code verifiziert:**
Der Nutzer hat den kompletten Flow manuell im Browser durchgespielt (Login mit `robert.bienz@cloudcab.ch`, echter Code aus der E-Mail) — funktioniert vollständig, inkl. Weiterleitung. Dabei drei zusätzliche, nur manuell im Supabase-/Resend-Dashboard lösbare Konfigurationsprobleme gefunden und behoben:

1. **E-Mail-Template:** Unter **Authentication → Emails → "Magic link or OTP"** muss `{{ .ConfirmationURL }}` durch `{{ .Token }}` ersetzt werden, sonst verschickt Supabase einen Magic Link statt eines Codes. Zusätzlicher Fund dabei: mit Supabase's Standard-Mailversand (kein eigenes SMTP) lässt sich der Template-Inhalt gar nicht erst bearbeiten — dafür ist zwingend eigenes SMTP nötig (siehe Punkt 2).
2. **Custom SMTP erforderlich:** Eigenes SMTP über den bereits vorhandenen Resend-Account eingerichtet (Host `smtp.resend.com`, User `resend`, Passwort = `RESEND_API_KEY`). **Port 465 (implizites SSL) schlug fehl** (`500 Error sending confirmation email`, Resend erhielt die Anfrage nie) — **Port 587 (STARTTLS) behoben**. Absender vorerst `robert.bienz@cloudcab.ch` (einzige in Resend verifizierte Domain); vor echtem Produktivstart auf eine `obsi-hofer.ch`-Adresse umstellen, sobald diese Domain in Resend verifiziert ist.
3. **OTP-Code-Länge:** Supabase-Projekte erzeugen standardmässig inzwischen **8-stellige** statt 6-stellige Codes (projektabhängig, hat sich bei Supabase geändert) — unsere UI (`InputOTP maxLength=6`) erwartete 6. Unter **Authentication → Sign In / Providers → Email → OTP Length** explizit auf `6` gesetzt, statt die UI auf 8 anzupassen (Server-Konfiguration bewusst auf unsere UX-Entscheidung fixiert, nicht umgekehrt).

`requestLoginCode` protokolliert den echten Supabase-Fehler jetzt serverseitig (`console.error`) statt ihn nur zu verschlucken — hat direkt beim Debuggen von Punkt 2 geholfen und bleibt drin für künftige Fehlersuche.

**Nicht automatisiert testbar (nur manuell durch den Nutzer):** der Erfolgsfall mit echtem, per E-Mail zugestelltem Code — jetzt live verifiziert (siehe oben).

---

### Archiviert — ursprüngliche Implementation Notes (Entra External ID, 2026-09-16/17)

*Nur noch als historische Referenz, siehe Hinweis-Banner ganz oben.*

**Erstellt:**
- `auth.config.ts` — schlanke, Edge-taugliche NextAuth-Konfiguration (nur Entra-Provider, keine Datenbank-Callbacks) — wird ausschliesslich von `middleware.ts` genutzt
- `auth.ts` — vollständige NextAuth-Konfiguration (Node.js-Runtime): Entra-External-ID-Provider + `jwt`/`session`-Callbacks, die bei jedem Login `getPortalAccess()` aufrufen
- `src/lib/auth/access.ts` — `getPortalAccess(email)` (Kontakt aktiv? + verknüpfte Firmen via `dv_relationen`) und `getFirmenNamen(ids)`, beide gegen die PROJ-1-Supabase-Tabellen
- `middleware.ts` — nur die grobe Prüfung "eingeloggt oder nicht" (Edge-Runtime, kein Datenbankzugriff möglich)
- `src/app/(protected)/layout.tsx` — die eigentliche Zugriffsprüfung (`hasAccess`), läuft serverseitig in Node.js, redirected nach `/kein-zugang` wenn nötig
- `src/app/(protected)/firmen-auswahl/` und `.../uebersicht/` — bisherige Seiten hierher verschoben (geschützte Route-Group)
- `src/app/(protected)/firmen-auswahl/actions.ts` — Server Action `selectFirma`, validiert die Auswahl gegen die Session und setzt das Auswahl-Cookie
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth-Route-Handler
- Login-, Kein-Zugang- und Firmen-Auswahl-Seiten auf echte `signIn`/`signOut`/`auth()`-Aufrufe umgestellt (keine Platzhalter mehr)

**Wichtiger technischer Fund — Next.js 16 `proxy.ts`:**
Next.js 16 benennt `middleware.ts` in `proxy.ts` um; eine alte `middleware.ts` wird beim Build **kommentarlos ignoriert** (kein Fehler, keine Warnung, Seiten bleiben einfach ungeschützt). Zusätzlich läuft Middleware/Proxy in der **Edge-Runtime**, die keine Datenbank-Aufrufe (Supabase) zulässt — Versuche, unseren vollen `auth.ts` (mit Supabase-Callback) direkt in der Middleware zu verwenden, scheiterten dadurch lautlos. Lösung: Konfiguration aufgeteilt in eine schlanke `auth.config.ts` (nur für Middleware) und die volle `auth.ts` (für alles andere) — Standard-Muster aus der Auth.js-Dokumentation für DB-Callbacks. Die Datei heisst hier bewusst weiterhin `middleware.ts` (laut Next.js-Blog "still available... but deprecated"), da `proxy.ts` in dieser Next.js-Version (16.1.1) trotz korrekter Platzierung/Export ebenfalls nicht auslöste — im Zweifel beide Namen testen.

**Blocker — Entra-Tenant-Typ falsch:**
Die zuerst verwendete App-Registrierung lag im **normalen Mitarbeiter-Tenant** von OBSI Hofer GmbH (demselben wie für den Dataverse-Sync), nicht in einem echten **External-ID (CIAM)**-Tenant. Ergebnis: `AADSTS90072` — fremde E-Mail-Adressen können sich nicht selbst registrieren, sie müssten manuell als Gast eingeladen werden, was der Self-Service-Anforderung widerspricht. **Nutzer muss einen separaten External-Tenant erstellen** (Entra Admin Center → Verwalten → Tenants → Neu → Typ "External") und darin die App-Registrierung wiederholen. Kosten: erste 50'000 MAU/Monat kostenlos (Quelle: [Microsoft Learn](https://learn.microsoft.com/en-us/entra/external-id/external-identities-pricing)) — bei aktuell 588 Kontakten unkritisch, Tenant muss aber trotzdem mit einer Azure-Subscription verknüpft werden.

**2026-09-17 nachgetragen — Login-Flow live verifiziert:**
- [x] Neuer External-ID-Tenant + App-Registrierung erstellt (Tenant "B2C Obsi-Hofer GmbH", Domäne `b2cobsihofer.onmicrosoft.com`, Typ korrekt "Extern")
- [x] User Flow "SignUpSignIn" erstellt und mit der App "Kundenportal" verknüpft (unter External Identities → User flows → Applications)
- [x] Kompletter Login-Flow im Browser durchgespielt: Anmeldung mit unbekannter E-Mail → korrekt auf "Kein Zugang" gelandet, mit Kontakt-E-Mail und "Abmelden/andere E-Mail versuchen"
- [x] Button-Text "Mit Entra External ID anmelden" → vereinfacht zu "Anmelden" (internes Microsoft-Fachjargon ist für Kunden bedeutungslos)

**Weiterer wichtiger technischer Fund — Issuer-URL für External-ID/CIAM-Tenants:**
`https://login.microsoftonline.com/<tenant-id>/v2.0` (Standard für Workforce-Tenants) funktioniert für External-ID-Tenants NICHT zuverlässig — der initiale Redirect zu Microsoft klappt zwar, aber der Token-Austausch schlägt mit `AADSTS500208: The domain is not a valid login domain for the account type` fehl. Die korrekte Issuer-URL für CIAM-Tenants nutzt die **tenant-eigene `ciamlogin.com`-Domain mit der Tenant-ID (nicht dem Firmennamen) als Subdomain**: `https://<tenant-id>.ciamlogin.com/<tenant-id>/v2.0` — verifiziert durch direktes Abrufen von `.well-known/openid-configuration` und Vergleich des `issuer`-Felds in der Antwort (Auth.js validiert das strikt gegen die konfigurierte Issuer-URL).

**2026-09-17 nachgetragen — Abmelden korrigiert:**
- [x] "Abmelden" setzte nur unsere eigene Sitzung zurück, nicht die von Microsoft — beim erneuten Anmelden blieb die zuletzt genutzte E-Mail vorausgefüllt/erinnert. Gefixt mit "federated logout": `src/lib/auth/sign-out.ts` beendet zusätzlich die Tenant-eigene Sitzung über den `end_session_endpoint` des Discovery-Dokuments. Live verifiziert: nach Abmelden wird beim nächsten Login-Versuch keine E-Mail mehr vorausgefüllt.

**2026-09-17 nachgetragen — Erfolgsfall + Firmen-Auswahl live verifiziert:**
- [x] Temporärer Test-Kontakt in Supabase angelegt: `test-kontakt-robert-1` (E-Mail `robert.bienz@cloudcab.ch`, aktiv, verknüpft mit zwei Firmen "4Viertel" und "Hauswartprofis AG") — **bewusst nicht gelöscht**, bleibt für weitere Tests (PROJ-3/4/5) bestehen. Kein echter Dataverse-Datensatz, taucht beim nächsten PROJ-1-Sync-Lauf ggf. wieder verschwunden auf, falls die IDs nicht in Dataverse existieren — dann vor PROJ-3-Tests neu anlegen.
- [x] Firmen-Auswahl mit zwei Firmen live getestet — korrekte Liste, Auswahl führt zu `/uebersicht` mit der richtigen Firma
- [x] Direkter Erfolgsfall bestätigt: aktiver Kontakt + Firma → landet korrekt auf `/uebersicht`

**Noch offen:**
- [ ] `.env.local.example` um die neuen Variablen ergänzen (`AUTH_SECRET`, `Kundenportal_AZURE_CLIENT_ID/SECRET/TENANT_ID`) — Nutzer muss das selbst tun, `.env.local.example` ist für mich gesperrt

## QA Test Results

**Tested:** 2026-09-21
**App URL:** http://localhost:3000 (+ Live-Test durch den Nutzer gegen die echte Supabase-Instanz)
**Tester:** QA Engineer (AI) + Nutzer (für den Erfolgsfall mit echtem E-Mail-Code)

> Hinweis: `signInWithOtp`/`verifyOtp` rufen die echte Supabase-Instanz auf — ein automatisierter, wiederholbarer E2E-Test des kompletten Flows würde bei jedem Lauf eine echte E-Mail verschicken und schnell Supabase's Rate-Limit (60s/E-Mail) treffen. Der Erfolgsfall wurde daher **manuell vom Nutzer live** getestet (siehe Implementation Notes Backend). Automatisiert getestet: alles ohne echten Code erreichbare/prüfbare Verhalten (Login-Seiteninhalt, Routen-Schutz, Fehlerpfad bei falschem Code).

### Acceptance Criteria Status

#### AC-1: Registrierung/Login prüft aktiven Kontakt
- [x] Live verifiziert (Testkontakt `robert.bienz@cloudcab.ch`, echter E-Mail-Code, Supabase legt beim ersten Login automatisch einen Auth-Nutzer an) → korrekt zur Firmen-Auswahl weitergeleitet

#### AC-2: Genau eine Firma → direkte Weiterleitung
- [x] Logik unverändert gegenüber der ursprünglichen (live verifizierten) Entra-Version, nur die Identitätsquelle wurde getauscht — durch `access.test.ts` weiterhin abgedeckt. Nicht erneut live mit einem Ein-Firma-Kontakt nachgestellt (Testkontakt hat zwei Firmen)

#### AC-3: Mehrere Firmen → Firmen-Auswahl
- [x] Live verifiziert: Testkontakt mit 2 Firmen zeigt nach echtem Code-Login korrekt die Firmen-Auswahl

#### AC-4: Unbekannt/inaktiv → generische "Kein Zugang"-Meldung
- [x] Logik unverändert (`getPortalAccess` gibt weiterhin `null` zurück, per Unit-Test abgedeckt); automatisiert bestätigt, dass `/kein-zugang` ohne Session zu `/login` umleitet. Nicht erneut live mit einem zweiten echten Supabase-Login für eine unbekannte E-Mail durchgespielt

#### AC-5: Abmelden beendet die Sitzung
- [x] Live nachgetestet (2026-09-21, nachgeholt): "Abmelden" beendet die Sitzung korrekt, landet auf `/login`. `signOutEverywhere()` ruft jetzt `supabase.auth.signOut()` statt des bisherigen Federated-Logout-Redirects — einfacher als vorher, da Supabase (anders als Entra) keine externe Tenant-Sitzung offen hält

#### AC-6: Datenscope pro gewählter Firma
- [x] Logik unverändert (`current-firma.ts`, Cookie-basiert), nur die Identitätsquelle für `firmaIds` getauscht. Regressions-E2E-Tests von PROJ-3 (die auf demselben Access-Mechanismus aufbauen) laufen weiterhin grün

#### AC-7: Zuordnung wird bei jedem Login neu geprüft
- [x] **Jetzt architektonisch garantiert, nicht nur beim Login:** `getPortalAccess` läuft seit dem Supabase-Wechsel bei **jedem** Seitenaufruf frisch (vorher: einmalig im Session-Token beim Login gecacht) — eine strengere Erfüllung der ursprünglichen Anforderung, kein Sonderfall-Test nötig

### Security Audit Results
- [x] Authentication: Alle geschützten Seiten ohne Session → Redirect zu `/login` (automatisiert verifiziert für `/uebersicht`, `/dashboard`, `/firmen-auswahl`, `/kein-zugang`)
- [x] Keine Secrets im Client-Bundle: `SUPABASE_SECRET_KEY` explizit im gebauten `.next/static`-Output gesucht — nicht gefunden. Kein neuer Auth-Code importiert `supabase-admin.ts` (RLS-Bypass-Client) von einer Client-Component aus
- [x] Kein XSS-Vektor: kein `dangerouslySetInnerHTML` im gesamten `src/`; E-Mail-Adresse wird nur über normales JSX-Escaping angezeigt
- [x] Keine E-Mail-/Konto-Enumeration: `requestLoginCode` gibt bei jeder E-Mail dieselbe Erfolgsmeldung zurück (Supabase legt unbekannte Kontakte bei Bedarf automatisch an); `verifyLoginCode` zeigt für falschen Code und für "kein Zugang" jeweils dieselbe generische Meldung
- [x] Autorisierung/IDOR: `selectFirma` (unverändert) validiert die gewählte Firma weiterhin gegen die eigene (frisch abgefragte) `firmaIds`-Liste, bevor das Cookie gesetzt wird
- [x] Rate-Limiting auf Code-Anfragen: durch Supabase serverseitig erzwungen (beobachtet: "Minimum interval per user: 60 seconds" beim Debugging live erlebt) — nicht mehr unser eigenes TODO wie noch beim ursprünglichen Entra-Audit
- [ ] **Nicht unabhängig geprüft:** Brute-Force-Schutz für `verifyOtp` (wiederholte Code-Rateversuche für dieselbe E-Mail) — liegt vollständig bei Supabase; Dashboard zeigt einen eigenen "Attack Protection"-Menüpunkt, dessen Konfiguration ich nicht eingesehen habe. Empfehlung: einmal kurz im Dashboard prüfen
- [ ] **Nicht unabhängig geprüft:** Cookie-Attribute (`HttpOnly`/`SameSite`) der von `@supabase/ssr` gesetzten Session-Cookies — verlasse mich auf die dokumentierten Defaults des offiziellen Pakets, aber nicht selbst am Netzwerk-Tab nachgemessen (bräuchte eine echte Session)

### Bugs Found

Keine neuen Bugs im Supabase-Auth-Code selbst gefunden. Drei **Konfigurationsprobleme** (kein Code) wurden beim Live-Test entdeckt und vom Nutzer im Supabase-/Resend-Dashboard behoben — siehe Implementation Notes Backend für Details (E-Mail-Template `{{ .Token }}`, SMTP-Port 587 statt 465, OTP-Länge 6 statt 8).

#### BUG-1 (fortbestehend, aus Entra-Ära): Middleware läuft in der lokalen Next.js-16-Dev-Umgebung weiterhin nicht
- **Severity:** Low (nicht Medium wie ursprünglich — Ursache und Mitigation sind inzwischen bekannt und wirksam)
- **Erneut geprüft mit der neuen Supabase-Middleware:** `console.log`-Sonde in `middleware.ts` eingebaut, geschützte Route lokal aufgerufen → Sonde feuerte **nicht**, obwohl der Request korrekt mit 307 zu `/login` umgeleitet wurde (der Redirect kam aus `(protected)/layout.tsx`, nicht aus der Middleware). Bestätigt: derselbe Next.js/Turbopack/Windows-Dev-Bug wie beim ursprünglichen NextAuth-Setup, unabhängig von der Auth-Bibliothek — Ursache liegt also nicht am Auth-Provider
- **Status:** Wie zuvor durch Defense-in-Depth mitigiert (jede geschützte Seite prüft die Sitzung zusätzlich selbst) und auf Vercels echter Edge-Runtime bereits einmal funktionierend verifiziert (2026-09-18, mit der alten Entra-Middleware) — sollte bei `/deploy` mit der neuen Supabase-Middleware erneut auf Vercel bestätigt werden
- **Diagnose-Code wurde nach dem Test wieder entfernt**, keine Spuren im Commit

### Automatisierte Tests
- **Unit-Tests (Vitest):** 66/66 grün, davon 5 neu für `src/app/login/actions.test.ts` (`requestLoginCode`-Erfolg/-Fehler, `verifyLoginCode`-Fehlerpfad + beide Redirect-Ziele je nach `getPortalAccess`)
- **E2E-Tests (Playwright):** 12/12 grün (Chromium + Mobile Safari) in `tests/PROJ-2-kunden-login.spec.ts`, neu geschrieben für die Supabase-UI (altes "Anmelden"-Button-Test entfernt, da nicht mehr zutreffend) — Login-Seiteninhalt, Pflichtfeld-Validierung, Routen-Schutz für alle vier geschützten Seiten ohne Session
- **Regressionstest:** komplette E2E-Suite (18 Tests, inkl. PROJ-3/PROJ-5) grün — keine Nebenwirkungen auf andere Features durch den Auth-Wechsel

### Summary
- **Acceptance Criteria:** 7/7 live oder durch unveränderte/verstärkte Logik abgedeckt
- **Bugs Found:** 0 neue Bugs im Code; 3 Dashboard-Konfigurationsprobleme gefunden und behoben (dokumentiert); 1 fortbestehendes, bekanntes und mitigiertes Low-Bug (Middleware lokal)
- **Security:** Solide — kein Secret-Leak, kein XSS-Vektor, keine Enumeration, IDOR-Schutz unverändert intakt, Rate-Limiting jetzt Supabase-seitig statt eigenem TODO. Zwei Punkte nicht unabhängig verifiziert (Attack-Protection-Konfiguration, Cookie-Attribute)
- **Production Ready:** JA
- **Recommendation:** Status auf "Approved" setzen. Bei `/deploy`: Middleware auf Vercel erneut verifizieren (wie bei der ursprünglichen Entra-Version), da sie lokal nachweislich nicht läuft.

---

### Archiviert — ursprüngliche QA Test Results (Entra External ID, 2026-09-17/18)

*Nur noch als historische Referenz.*

**Tested:** 2026-09-17
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)

> Hinweis: Der echte Entra-External-ID-Login (Microsoft-Redirect, Registrierung, MFA) lässt sich nicht sinnvoll automatisiert/wiederholbar testen — dafür bräuchte es echte, dauerhaft nutzbare Kundenzugangsdaten bei Microsoft. Dieser Teil wurde in den vorherigen Sessions **manuell live** gegen den echten External-ID-Tenant verifiziert (siehe Implementation Notes oben). Automatisiert getestet wurde alles, was ohne echten Microsoft-Login erreichbar/prüfbar ist: Seiteninhalte, Routen-Schutz, Cookie-/Autorisierungs-Sicherheit.

#### AC-1: Registrierung/Login prüft aktiven Kontakt
- [x] Live verifiziert (unbekannte E-Mail → Kein Zugang; aktiver Kontakt → Zugriff)

#### AC-2: Genau eine Firma → direkte Weiterleitung
- [x] Implizit über die Zugriffslogik abgedeckt (Unit-Test in `access.test.ts`); mit zwei Firmen separat getestet (siehe AC-3)

#### AC-3: Mehrere Firmen → Firmen-Auswahl
- [x] Live verifiziert: Test-Kontakt mit 2 Firmen zeigt korrekte Auswahl, führt nach Klick zu `/uebersicht` mit der richtigen Firma

#### AC-4: Unbekannt/inaktiv → generische "Kein Zugang"-Meldung
- [x] Live verifiziert (unbekannte E-Mail). Inaktiver-Kontakt-Fall durch Unit-Test abgedeckt (`getPortalAccess` gibt `null` für `ist_aktiv: false`)

#### AC-5: Abmelden beendet die Sitzung
- [x] Live verifiziert — inkl. Fix: beendet jetzt auch die Microsoft-eigene Sitzung (siehe BUG-1 unten, behoben)

#### AC-6: Datenscope pro gewählter Firma
- [x] Live verifiziert (Cookie-Manipulations-Test, siehe Security Audit) — serverseitig korrekt abgesichert

#### AC-7: Zuordnung wird bei jedem Login neu geprüft
- [x] Durch Architektur abgedeckt (`getPortalAccess` läuft bei jedem Sign-in neu, keine persistente Portal-Nutzer-Tabelle) — nicht separat live mit einer Statusänderung zwischen zwei Logins getestet (bräuchte eine zweite echte Anmeldung mit Zwischenschritt in Dataverse)

Security Audit, Bugs (BUG-1/2/3) und Summary dieser archivierten Version: siehe Git-Historie dieser Datei (vor dem 2026-09-21-Commit) für den vollständigen Wortlaut — hier gekürzt, um die Datei nicht unnötig aufzublähen.

## Deployment

**Aktueller Produktivstand (Entra External ID, unverändert bis zum nächsten `/deploy`):**
- **Production URL:** https://obsi-hoferkundenportal.vercel.app
- **Deployed:** 2026-09-18
- **Verifiziert:** Login-Flow (Entra External ID → Callback → Firmen-Auswahl → Übersicht) end-to-end auf Production getestet, inkl. BUG-1 Middleware-Verifikation (siehe archivierte QA Test Results)

Die Supabase-Auth-Version wurde bisher nur lokal getestet (siehe QA Test Results oben) — noch nicht deployed. Folgt bei `/deploy`.
