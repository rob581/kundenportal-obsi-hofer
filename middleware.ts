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

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
