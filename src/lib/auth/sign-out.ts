"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const SELECTED_FIRMA_COOKIE = "obsi_selected_firma";

// Supabase Auth führt (anders als Entra External ID) keine separate
// externe Tenant-Sitzung, die nach dem Abmelden bestehen bliebe — normales
// signOut() reicht, kein Federated-Logout-Redirect mehr nötig (siehe
// PROJ-2 Decision Log, 2026-09-21).
export async function signOutEverywhere(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  // Die Firma-Auswahl-Cookie hat kein maxAge, überlebt also jedes
  // Abmelden, solange der Browser offen bleibt — ohne das explizite
  // Löschen hier würde ein Kunde mit mehreren Firmen nach erneutem Login
  // sofort wieder auf der zuletzt gewählten Firma statt der Auswahl landen.
  (await cookies()).delete(SELECTED_FIRMA_COOKIE);

  redirect("/login");
}
