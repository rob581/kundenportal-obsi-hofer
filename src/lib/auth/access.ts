import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type PortalAccess = {
  contactId: string;
  firmaIds: string[];
};

// PROJ-2 access rule: the verified Entra email must match an ACTIVE
// Kontakt (dv_kontakte.ist_aktiv), and that Kontakt must be linked to at
// least one Firma via dv_relationen. Anything else — unknown email,
// inactive contact, or an active contact with zero linked Firmen — means
// no access, and callers must show the same generic "Kein Zugang" message
// for all of these (see spec Decision Log: don't reveal which case it was).
export async function getPortalAccess(email: string): Promise<PortalAccess | null> {
  const supabase = getSupabaseAdmin();

  const { data: kontakt, error: kontaktError } = await supabase
    .from("dv_kontakte")
    .select("id")
    .ilike("email", email)
    .eq("ist_aktiv", true)
    .maybeSingle();

  if (kontaktError) throw new Error(`Kontakt-Lookup fehlgeschlagen: ${kontaktError.message}`);
  if (!kontakt) return null;

  const { data: relationen, error: relationenError } = await supabase
    .from("dv_relationen")
    .select("firma_id")
    .eq("kontakt_id", kontakt.id);

  if (relationenError) throw new Error(`Relationen-Lookup fehlgeschlagen: ${relationenError.message}`);

  const firmaIds = (relationen ?? []).map((r) => r.firma_id).filter((id): id is string => !!id);
  if (firmaIds.length === 0) return null;

  return { contactId: kontakt.id as string, firmaIds };
}

export async function getFirmenNamen(firmaIds: string[]): Promise<{ id: string; name: string }[]> {
  if (firmaIds.length === 0) return [];

  const { data, error } = await getSupabaseAdmin()
    .from("dv_firmen")
    .select("id, name")
    .in("id", firmaIds);

  if (error) throw new Error(`Firmen-Lookup fehlgeschlagen: ${error.message}`);
  return (data ?? []).map((f) => ({ id: f.id as string, name: (f.name as string) ?? "(ohne Namen)" }));
}
