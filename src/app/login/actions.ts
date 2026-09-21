"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPortalAccess } from "@/lib/auth/access";

export async function requestLoginCode(email: string): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();
  // shouldCreateUser (Standard: true) erhält die bisherige Self-Service-UX:
  // unbekannte, aber aktive Dataverse-Kontakte bekommen beim ersten Login
  // direkt Zugriff, ohne separaten Registrieren-Schritt (siehe PROJ-2
  // Decision Log, 2026-09-21).
  const { error } = await supabase.auth.signInWithOtp({ email });

  if (error) {
    console.error("signInWithOtp fehlgeschlagen:", error.status, error.message);
    return { error: "Code konnte nicht gesendet werden. Bitte später erneut versuchen." };
  }
  return { error: null };
}

export async function verifyLoginCode(email: string, code: string): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });

  if (error) {
    return { error: "Der Code ist ungültig oder abgelaufen." };
  }

  const access = await getPortalAccess(email);
  redirect(access ? "/dashboard" : "/kein-zugang");
}
