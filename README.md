# OBSI Hofer GmbH — Kundenportal

Self-Service-Portal für Kunden der OBSI Hofer GmbH (Inspektionen sicherheitsrelevanter Geräte): Kunden melden sich an und sehen ausschliesslich ihre eigenen Geräte und Prüfberichte (read-only). Ersetzt die bisherige manuelle Aufbereitung in Excel und den Versand per E-Mail.

Alle Daten (Kunden, Geräte, Prüfberichte, Artikel) stammen aus Microsoft Dataverse und werden täglich per Cron-Job in eine Supabase-Datenbank synchronisiert — das Portal liest ausschliesslich aus dieser Spiegel-Datenbank, nie live aus Dataverse.

## Tech Stack

| Bereich | Tool |
|---------|------|
| Framework | Next.js 16 (App Router), TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Datenbank | Supabase (Postgres) — Spiegel der Dataverse-Daten |
| Auth | Microsoft Entra External ID (Auth.js / NextAuth v5) |
| Quelle der Wahrheit | Microsoft Dataverse (via täglichen Sync-Job) |
| Hosting | Vercel (inkl. Vercel Cron für den täglichen Sync) |
| Validierung | Zod |
| Tests | Vitest (Unit/Integration), Playwright (E2E) |

## Setup

1. `npm install`
2. `.env.local` anlegen (siehe `.env.local.example`) mit: Supabase-Credentials, Entra-External-ID-Client-Daten, Dataverse-Zugangsdaten, `CRON_SECRET`, Resend-API-Key (E-Mail-Alarm bei Sync-Fehlern)
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
