import { cache } from "react";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type PortalAccess = {
  contactId: string;
  firmaIds: string[];
};

// PROJ-2 access rule: the verified email must match an ACTIVE Kontakt
// (dv_kontakte.ist_aktiv) that has been released for the portal
// (dv_kontakte.ist_portal_freigegeben, PROJ-13 — set via obsi-hofer-admin),
// and that Kontakt must be linked to at least one Firma via dv_relationen.
// Anything else — unknown email, inactive or unreleased contact, or a
// contact with zero linked Firmen — means no
// access, and callers must show the same generic "Kein Zugang" message
// for all of these (see spec Decision Log: don't reveal which case it was).
//
// Seit dem Wechsel auf Supabase Auth (2026-09-21) wird dieser Check nicht
// mehr einmalig beim Login in einem Session-Token zwischengespeichert,
// sondern bei jedem Seitenaufruf frisch ausgeführt — react `cache()`
// dedupliziert das innerhalb eines Requests (siehe session.ts).
export const getPortalAccess = cache(async (email: string): Promise<PortalAccess | null> => {
  const supabase = getSupabaseAdmin();

  // PROJ-13 QA BUG-1: dieselbe E-Mail kann in Dataverse mehreren Kontakten
  // gehören (Bexio-Dubletten, aktuell 4 Adressen). Früher brach der Lookup
  // dann ab (`maybeSingle` mit mehreren Treffern) — jetzt zählen alle
  // aktiven, freigegebenen Kontakte dieser (verifizierten) Adresse, ihre
  // Firmen werden vereinigt. Nicht freigegebene Dubletten tragen nichts bei.
  const { data: kontakte, error: kontaktError } = await supabase
    .from("dv_kontakte")
    .select("id")
    .ilike("email", email)
    .eq("ist_aktiv", true)
    .eq("ist_portal_freigegeben", true);

  if (kontaktError) throw new Error(`Kontakt-Lookup fehlgeschlagen: ${kontaktError.message}`);
  const kontaktIds = (kontakte ?? []).map((k) => k.id as string).sort();
  if (kontaktIds.length === 0) return null;

  const { data: relationen, error: relationenError } = await supabase
    .from("dv_relationen")
    .select("firma_id")
    .in("kontakt_id", kontaktIds);

  if (relationenError) throw new Error(`Relationen-Lookup fehlgeschlagen: ${relationenError.message}`);

  const firmaIds = [
    ...new Set((relationen ?? []).map((r) => r.firma_id).filter((id): id is string => !!id)),
  ];
  if (firmaIds.length === 0) return null;

  // contactId: bei Dubletten deterministisch der erste (nach ID sortiert).
  return { contactId: kontaktIds[0], firmaIds };
});

export async function getFirmenNamen(firmaIds: string[]): Promise<{ id: string; name: string }[]> {
  if (firmaIds.length === 0) return [];

  const { data, error } = await getSupabaseAdmin()
    .from("dv_firmen")
    .select("id, name")
    .in("id", firmaIds);

  if (error) throw new Error(`Firmen-Lookup fehlgeschlagen: ${error.message}`);
  return (data ?? []).map((f) => ({ id: f.id as string, name: (f.name as string) ?? "(ohne Namen)" }));
}
