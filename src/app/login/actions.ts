"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPortalAccess } from "@/lib/auth/access";
import { logLoginEvent } from "@/lib/login-log/log-login";

export async function requestLoginCode(email: string): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();
  // shouldCreateUser (Standard: true): kein separater Registrieren-Schritt
  // (PROJ-2 Decision Log, 2026-09-21). Der Code geht bewusst an jede
  // Adresse — ob ein Kontakt aktiv und freigegeben ist (PROJ-13), wird erst
  // nach dem Login geprüft, damit sich von aussen nicht testen lässt, welche
  // Adressen Zugang haben.
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
  if (access) {
    await logLoginEvent(access.firmaIds);
  }
  redirect(access ? "/dashboard" : "/kein-zugang");
}
