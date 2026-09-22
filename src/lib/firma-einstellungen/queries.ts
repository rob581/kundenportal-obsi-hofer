import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { FirmaEinstellungen } from "./types";

const EMPTY_EINSTELLUNGEN: FirmaEinstellungen = { zusatzspalten: [] };

// portal_firma_einstellungen ist bewusst vom Dataverse-Sync (PROJ-1)
// unabhängig (siehe PROJ-7 Tech Design) — wird ausschliesslich manuell durch
// OBSI Hofer direkt in Supabase gepflegt. Eine Firma ohne Eintrag gilt
// automatisch als "keine Zusatzspalten" (kein Fehler).
export async function getFirmaEinstellungen(firmaId: string): Promise<FirmaEinstellungen> {
  const { data, error } = await getSupabaseAdmin()
    .from("portal_firma_einstellungen")
    .select("zusatzspalten")
    .eq("firma_id", firmaId)
    .maybeSingle();

  if (error) {
    throw new Error(`Firma-Einstellungen-Lookup fehlgeschlagen: ${error.message}`);
  }
  if (!data) return EMPTY_EINSTELLUNGEN;

  return { zusatzspalten: (data.zusatzspalten as string[] | null) ?? [] };
}
