import { NextResponse } from "next/server";
import { getCurrentUserEmail } from "@/lib/auth/session";
import { getPortalAccess } from "@/lib/auth/access";
import { logLoginEvent } from "@/lib/login-log/log-login";

// Nötig, weil der Passkey-Login (anders als der E-Mail+Code-Login) komplett
// clientseitig über supabase.auth.signInWithPasskey() läuft, ohne eigenen
// Server Action — dieser Endpoint ist der einzige serverseitige Anknüpfungs-
// punkt dafür. Liegt ausserhalb von (protected)/layout.tsx, prüft Session/
// Zugriff deshalb selbst, exakt wie die Export-Routen (PROJ-8/PROJ-10).
export async function POST() {
  const email = await getCurrentUserEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getPortalAccess(email);
  if (!access) return NextResponse.json({ error: "Kein Zugang" }, { status: 403 });

  await logLoginEvent(access.firmaIds);
  return NextResponse.json({ ok: true });
}
