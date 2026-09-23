import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type ExportEntity = "geraete" | "pruefberichte";

// PROJ-11: best-effort logging for the "Anzahl CSV-Exports/Monat" success
// metric — a failure here must never affect the CSV download itself (the
// export routes already returned/are about to return their response
// regardless), so every error is swallowed after logging it server-side.
export async function logExportEvent(firmaId: string, entity: ExportEntity): Promise<void> {
  try {
    const { error } = await getSupabaseAdmin().from("export_log").insert({ firma_id: firmaId, entity });
    if (error) throw new Error(error.message);
  } catch (error) {
    console.error(`Export-Log-Eintrag fehlgeschlagen (${entity}, Firma ${firmaId}):`, error);
  }
}
