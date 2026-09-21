import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Für Server Components, Server Actions und Route Handlers. Nutzt den
// Publishable Key (nicht den Secret Key) — Auth-Aufrufe (signInWithOtp,
// verifyOtp, getUser, signOut) laufen als der jeweilige Endnutzer, nicht
// mit RLS-Bypass wie supabase-admin.ts.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Aufruf aus einer Server Component (kein Schreibzugriff auf Cookies) —
          // ignorierbar, solange die Middleware die Sitzung bei jedem Request
          // aktualisiert (siehe src/lib/supabase/middleware.ts).
        }
      },
    },
  });
}
