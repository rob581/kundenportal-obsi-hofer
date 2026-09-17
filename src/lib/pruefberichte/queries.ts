import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { Pruefbericht } from "./types";

type PruefberichtRow = {
  id: string;
  pruefdatum: string | null;
  ergebnis: string | null;
  bemerkungen: string | null;
  pruefer: string | null;
};

// No firmaId parameter here by design (see PROJ-4 Tech Design): the caller
// must only ever pass a geraetId that has already been confirmed — via
// getGeraetById (PROJ-3) — to belong to the current session's Firma. This
// query trusts that ordering and does not re-check ownership itself.
export async function getPruefberichteFuerGeraet(geraetId: string): Promise<Pruefbericht[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("dv_pruefberichte")
    .select("id, pruefdatum, ergebnis, bemerkungen, pruefer")
    .eq("geraet_id", geraetId)
    .is("deleted_at", null)
    .order("pruefdatum", { ascending: false, nullsFirst: false });

  if (error) throw new Error(`Prüfberichte-Lookup fehlgeschlagen: ${error.message}`);

  return (data ?? []) as PruefberichtRow[];
}
