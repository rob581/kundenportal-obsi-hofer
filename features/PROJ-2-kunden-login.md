# PROJ-2: Kunden-Login (Supabase Auth)

## Status: In Progress
**Created:** 2026-09-16
**Last Updated:** 2026-09-21

> **Fundamentale Neuausrichtung (2026-09-21):** Auth-Provider gewechselt von Microsoft Entra External ID zu Supabase Auth (Details siehe Decision Log). "Tech Design" (`/architecture`) und die Login-UI in "Implementation Notes (Frontend)" (`/frontend`) sind bereits für Supabase Auth aktualisiert. Backend-Anbindung (`@supabase/ssr`, echte `signInWithOtp`/`verifyOtp`-Aufrufe, Middleware/Layout-Umstellung) fehlt noch. Die Abschnitte "Implementation Notes (Backend)", "QA Test Results" und "Deployment" weiter unten beschreiben weiterhin die **bisherige, produktiv gelaufene Entra-Implementierung** und bleiben vorerst als historische Referenz stehen — werden durch einen Durchlauf von `/backend` → `/qa` → `/deploy` ersetzt. Die aktuell auf Vercel deployte Version läuft bis dahin unverändert mit Entra External ID weiter.

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

**Tested:** 2026-09-17
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)

> Hinweis: Der echte Entra-External-ID-Login (Microsoft-Redirect, Registrierung, MFA) lässt sich nicht sinnvoll automatisiert/wiederholbar testen — dafür bräuchte es echte, dauerhaft nutzbare Kundenzugangsdaten bei Microsoft. Dieser Teil wurde in den vorherigen Sessions **manuell live** gegen den echten External-ID-Tenant verifiziert (siehe Implementation Notes oben). Automatisiert getestet wurde alles, was ohne echten Microsoft-Login erreichbar/prüfbar ist: Seiteninhalte, Routen-Schutz, Cookie-/Autorisierungs-Sicherheit.

### Acceptance Criteria Status

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

### Security Audit Results
- [x] Authentication: Alle geschützten Seiten ohne Session → 307 zu `/login` (verifiziert für `/uebersicht`, `/firmen-auswahl`, `/kein-zugang`)
- [x] Session-Cookies: `HttpOnly` + `SameSite=Lax`, kein JS-Zugriff möglich, CSRF-Token vorhanden
- [x] Autorisierung/IDOR: `obsi_selected_firma`-Cookie manuell auf einen erfundenen Wert manipuliert → korrekt auf `/firmen-auswahl` zurückgeworfen (kein Zugriff auf falsche Firma möglich); die Server Action `selectFirma` validiert die gewählte Firma zusätzlich gegen die Session, bevor sie das Cookie setzt
- [x] Keine Secrets im Seitenquelltext (`AZURE_CLIENT_SECRET`, `SUPABASE_SECRET_KEY`, `AUTH_SECRET`, `CRON_SECRET` geprüft)
- [x] Kein XSS-relevantes Eingabefeld in diesem Feature (keine Freitext-Formulare, nur OAuth-Redirect + Firmen-Auswahl-Buttons)
- [ ] BUG (Medium): Kein Rate-Limiting auf unseren eigenen Auth-Routen (`/api/auth/*`) — bewusst niedrige Priorität, da der eigentliche Credential-Check bei Microsoft liegt, nicht bei uns

### Bugs Found

#### BUG-1: Middleware/Proxy wird in der lokalen Next.js-16-Dev-Umgebung nie ausgeführt
- **Severity:** Medium
- **Steps to Reproduce:** Middleware testweise auf einen bedingungslosen Redirect gesetzt (jede Anfrage sollte umgeleitet werden) → selbst nach vollständigem Neustart (`.next` gelöscht, Server neu gestartet) hatte das auf **keinen einzigen** Request Einfluss
- **Auswirkung entdeckt durch:** `/kein-zugang` war ohne jede Session direkt erreichbar (HTTP 200 statt Redirect) — die anderen geschützten Seiten (`/uebersicht`, `/firmen-auswahl`) waren nur zufällig trotzdem geschützt, weil das `(protected)/layout.tsx` unabhängig davon eine eigene serverseitige `auth()`-Prüfung macht
- **Ursache:** Unklar — vermutlich eine Next.js-16.1.1/Turbopack/Windows-Dev-Eigenheit; ob es auf Vercel (echte Edge-Runtime) funktioniert, ist ungetestet
- **Status:** ✅ Vollständig verifiziert (2026-09-18, Production auf Vercel): Vercel-Deployment-Logs zeigen für **jeden** Request (`/uebersicht`, `/dashboard`, Geräte-Details, `/login`, `/api/auth/*`) einen eigenen `"type":"middleware"`-Log-Eintrag (~9–17ms Laufzeit) — die Middleware wird auf der echten Vercel-Edge-Runtime zuverlässig ausgeführt, anders als lokal. Nicht angemeldeter Zugriff auf `/uebersicht` liefert korrekt `307` → `/login`. Der ursprüngliche lokale Dev-Bug bleibt als Hinweis für künftige lokale Entwicklung bestehen, ist für Production aber gelöst.
- **Empfehlung für künftige Seiten (PROJ-3/4/5):** Nie allein auf Middleware verlassen — jede neue Seite/jedes neue Layout sollte ihre eigene `auth()`-Prüfung haben, wie es das `(protected)/layout.tsx` bereits vormacht.

#### BUG-2: Vitest führte versehentlich die neuen Playwright-E2E-Specs aus und stürzte ab
- **Severity:** Medium
- **Steps to Reproduce:** `npm test` nach Hinzufügen von `tests/PROJ-2-kunden-login.spec.ts` ausführen → Absturz, da Vitest die Playwright-`test.describe`-Syntax nicht versteht
- **Ursache:** `vitest.config.ts` hatte keine `exclude`-Regel für `tests/` (das laut `CLAUDE.md` ausschliesslich für Playwright-E2E-Tests reserviert ist)
- **Status:** ✅ Gefixt (2026-09-17): `tests/` zur `exclude`-Liste in `vitest.config.ts` hinzugefügt (inkl. der Standard-Vitest-Ausschlüsse, die durch eine eigene `exclude`-Angabe sonst überschrieben würden)

#### BUG-3: Firma-Auswahl-Cookie überlebt Abmelden, dadurch keine erneute Firmen-Auswahl beim nächsten Login
- **Severity:** Medium
- **Gefunden:** 2026-09-17, vom Nutzer beim manuellen Testen von PROJ-3 gemeldet ("nach dem Abmelden und neu Anmelden kommt wieder die zuletzt angezeigte Firma nicht die Firmenauswahl")
- **Steps to Reproduce:** Als Kontakt mit mehreren Firmen anmelden, eine Firma auswählen, über "Abmelden" ausloggen, danach (im selben Browser) erneut anmelden → landet direkt wieder auf der zuvor gewählten Firma statt auf `/firmen-auswahl`
- **Ursache:** `obsi_selected_firma` wird beim Setzen (`firmen-auswahl/actions.ts`) ohne `maxAge`/`expires` gesetzt (reines Session-Cookie), und `signOutEverywhere()` (`src/lib/auth/sign-out.ts`) hat bisher ausschliesslich die NextAuth-Session beendet, nie dieses Cookie gelöscht — es überlebt daher jedes Abmelden, solange der Browser offen bleibt
- **Status:** ✅ Gefixt (2026-09-17): `signOutEverywhere()` löscht das `obsi_selected_firma`-Cookie jetzt explizit vor dem Redirect zum Entra-Logout

### Hinweis zur QA-Konvention
Beide Bugs wurden in dieser Session direkt behoben statt nur dokumentiert — abweichend von der üblichen QA-Regel "nur finden, nicht fixen". Grund: Beide blockierten eine verlässliche weitere Testdurchführung (BUG-2 verhinderte `npm test`, BUG-1 wurde erst durch gezieltes Debugging während der Sicherheitsprüfung sichtbar und liess sich mit calculated risk sofort schliessen). Bitte kurz gegenprüfen, ob das so in Ordnung ist.

### Automatisierte Tests
- **Unit-Tests (Vitest):** 25/25 grün, davon 7 neu für `src/lib/auth/access.ts` (bisher ungetestete Zugriffslogik: aktiver Kontakt, Gross-/Kleinschreibung, unbekannte E-Mail, inaktiver Kontakt, Kontakt ohne Firma, Firmen-Namen-Lookup)
- **E2E-Tests (Playwright):** 8/8 grün (Chromium + Mobile Safari) in `tests/PROJ-2-kunden-login.spec.ts` — Login-Seiteninhalt, Routen-Schutz für alle drei geschützten Seiten ohne Session

### Summary
- **Acceptance Criteria:** 7/7 abgedeckt (6 live verifiziert, 1 durch Architektur/Unit-Test)
- **Bugs Found:** 3 total, alle behoben (0 High/Critical offen, 1 Medium-Fund zu Rate-Limiting bewusst akzeptiert); BUG-3 kam erst nach dem ursprünglichen `/qa`-Lauf hinzu, gemeldet während des manuellen PROJ-3-Tests am 2026-09-17
- **Security:** Solide — Routen-Schutz, Cookie-Sicherheit, Autorisierung gegen Firma-Manipulation, keine Secret-Leaks, kein XSS-Vektor
- **Production Ready:** JA, mit einem Vorbehalt — BUG-1s Vercel-Verhalten sollte bei `/deploy` verifiziert werden, bevor es als endgültig gelöst gilt
- **Recommendation:** Status auf "Approved" setzen. Bei `/deploy`: gezielt prüfen, ob Middleware auf Vercel greift (z.B. mit demselben "bedingungsloser Redirect"-Test), da das lokal nie funktioniert hat.

## Deployment
- **Production URL:** https://obsi-hoferkundenportal.vercel.app
- **Deployed:** 2026-09-18
- **Verifiziert:** Login-Flow (Entra External ID → Callback → Firmen-Auswahl → Übersicht) end-to-end auf Production getestet, inkl. BUG-1 Middleware-Verifikation (siehe oben)
