import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Edge-tauglich (arbeitet nur über Fetch-Aufrufe an Supabase, kein
// Node.js-Datenbankzugriff) — löst damit die bisherige NextAuth-Aufteilung
// in auth.config.ts/auth.ts ab. Prüft nur "eingeloggt oder nicht"; die
// eigentliche Kontakt-/Firma-Zugriffsprüfung bleibt in
// (protected)/layout.tsx, die Supabase-Admin-Zugriff (RLS-Bypass) braucht.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}
