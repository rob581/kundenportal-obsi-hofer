# OBSI Hofer GmbH — Kundenportal

Self-Service-Portal für Kunden der OBSI Hofer GmbH (Inspektionen sicherheitsrelevanter Geräte): Kunden melden sich an und sehen ausschliesslich ihre eigenen Geräte und Prüfberichte (read-only). Ersetzt die bisherige manuelle Aufbereitung in Excel und den Versand per E-Mail.

Alle Daten (Kunden, Geräte, Prüfberichte, Artikel) stammen aus Microsoft Dataverse und werden täglich per Cron-Job in eine Supabase-Datenbank synchronisiert — das Portal liest ausschliesslich aus dieser Spiegel-Datenbank, nie live aus Dataverse.

## Tech Stack

| Bereich | Tool |
|---------|------|
| Framework | Next.js 16 (App Router), TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Datenbank | Supabase (Postgres) — Spiegel der Dataverse-Daten |
| Auth | Supabase Auth (E-Mail-Einmal-Code + Passkey/WebAuthn) |
| Quelle der Wahrheit | Microsoft Dataverse (via täglichen Sync-Job) |
| Hosting | Vercel (inkl. Vercel Cron für den täglichen Sync) |
| Mailversand | Resend (Supabase-Auth-Mails, Sync-Alert-Mails) |
| Validierung | Zod |
| Tests | Vitest (Unit/Integration), Playwright (E2E) |

## Tools & Portale

Externe Dienste, die für Entwicklung und Betrieb dieses Projekts gebraucht werden:

| Tool | Zweck | Link |
|------|-------|------|
| GitHub | Code-Repository, Versionskontrolle | [github.com/rob581/kundenportal-obsi-hofer](https://github.com/rob581/kundenportal-obsi-hofer) |
| Vercel | Hosting, Deployments, Cron-Job, Environment Variables | [vercel.com/dashboard](https://vercel.com/dashboard) → Projekt "rob581's Project" |
| Supabase | Datenbank (Spiegel der Dataverse-Daten), Auth (E-Mail-Code + Passkey) | [supabase.com/dashboard/project/ooozvxgkfxuurpzxodyy](https://supabase.com/dashboard/project/ooozvxgkfxuurpzxodyy) |
| Resend | Mailversand: Supabase-Auth-E-Mails (Login-Code) sowie Sync-Alert-/Erfolgs-Mails vom Cron-Job | [resend.com/overview](https://resend.com/overview) |
| Microsoft Dataverse | Quelle der Wahrheit für Kunden-, Geräte- und Prüfbericht-Daten, wird täglich per Power Automate + Cron-Job synchronisiert | intern bei OBSI Hofer GmbH, kein öffentlicher Link |

**Frühere Entra-External-ID-Anbindung:** Bis 2026-09-21 lief die Anmeldung über Microsoft Entra External ID (Tenant "B2C Obsi-Hofer GmbH"); seither ersetzt durch Supabase Auth (siehe [PROJ-2 Decision Log](features/PROJ-2-kunden-login.md)). Der Entra-Tenant existiert noch, wird vom Portal aber nicht mehr genutzt.

## Setup

1. `npm install`
2. `.env.local` anlegen (siehe `.env.local.example`) mit: Supabase-Credentials (inkl. `NEXT_PUBLIC_`-Varianten für Passkey-Login), Dataverse-Zugangsdaten, `CRON_SECRET`, Resend-API-Key (E-Mail-Alarm bei Sync-Fehlern)
3. `npm run dev` → [http://localhost:3000](http://localhost:3000)
4. Einmalig pro Maschine: `npx playwright install chromium` (lädt den Browser für E2E-Tests)

## Projektstatus

- Aktueller Stand aller Features: [`features/INDEX.md`](features/INDEX.md)
- Produkt-Vision, Zielgruppe und Roadmap: [`docs/PRD.md`](docs/PRD.md)
- Jede Feature-Spec (`features/PROJ-X-*.md`) enthält User Stories, Acceptance Criteria, Tech Design, Implementierungs-Notizen und QA-Ergebnisse

## Entwicklungsworkflow

Dieses Projekt wird über die strukturierten Skills dieses Repos entwickelt — ein Feature nach dem anderen:

```
/write-spec PROJ-X   Feature-Spezifikation schreiben
/architecture         Technisches Design festlegen
/frontend             UI bauen (shadcn/ui)
/backend              APIs, Datenbank, Sync anbinden
/qa                    Gegen Acceptance Criteria testen + Security-Audit
/deploy                Auf Vercel deployen
```

`/design` kann jederzeit ausgeführt werden, um das visuelle Design-System (`docs/design-system.md`) zu definieren oder anzupassen — `/frontend` liest diese Datei automatisch, sobald sie existiert.

Details zu Konventionen (Commit-Format, Feature-Tracking, Coding Rules) stehen in [`CLAUDE.md`](CLAUDE.md).

## Scripts

```bash
npm run dev          # Development server (localhost:3000)
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
npm test             # Vitest: Unit-/Integrationstests
npm run test:e2e     # Playwright: E2E-Tests
npm run test:all     # Beide Test-Suiten
```

## Production-Referenzen

Standalone-Guides in `docs/production/` (Error Tracking, Security Headers, Performance, Database Optimization, Rate Limiting) — relevant spätestens bei `/deploy`.
