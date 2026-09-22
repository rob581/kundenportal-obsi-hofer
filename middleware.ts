import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// QA-Fund (2026-09-17, damals unter NextAuth): in der lokalen
// Next.js-16-Dev-Umgebung (Turbopack, Windows) wurde Middleware nie
// ausgeführt — verifiziert mit einem bedingungslosen Redirect, der selbst
// nach vollständigem Neustart wirkungslos blieb. Auf Vercels echter
// Edge-Runtime lief sie zuverlässig. Da der Bug an Next.js/Turbopack hing,
// nicht an NextAuth, gilt dieselbe Einschränkung vermutlich weiterhin —
// bei /deploy erneut verifizieren. Jede geschützte Seite prüft die
// Sitzung deshalb zusätzlich selbst (siehe (protected)/layout.tsx,
// kein-zugang/page.tsx, login/page.tsx).
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

// BUG gefunden 2026-09-22: /api/** war vom Matcher nicht ausgenommen, wodurch
// jeder Request ohne Supabase-Session (z.B. der Vercel-Cron-Aufruf für den
// Dataverse-Sync, der sich per CRON_SECRET-Bearer-Token statt Session
// authentifiziert) hier mit 307 zu /login umgeleitet wurde — die Route
// selbst (route.ts) kam nie zum Zug. API-Routen prüfen ihre Authentifizierung
// grundsätzlich selbst (siehe sync-dataverse/route.ts), brauchen also keine
// Supabase-Session-Prüfung durch diese Middleware.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
