import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Best-effort Login-Zählung, analog zu src/lib/export-log/log-export.ts —
// ein Fehler hier darf den Login-Vorgang selbst nie beeinträchtigen. Ein
// Kontakt kann Zugänge bei mehreren Firmen haben (seit PROJ-15 über
// dv_portalzugaenge, siehe access.ts); ein Login zählt dann für jede dieser
// Firmen — dieselbe Semantik wie die
// bestehende Login-Quote, die ebenfalls unabhängig von der später
// gewählten Firma auswertet.
export async function logLoginEvent(firmaIds: string[]): Promise<void> {
  if (firmaIds.length === 0) return;

  try {
    const rows = firmaIds.map((firmaId) => ({ firma_id: firmaId }));
    const { error } = await getSupabaseAdmin().from("login_log").insert(rows);
    if (error) throw new Error(error.message);
  } catch (error) {
    console.error("Login-Log-Eintrag fehlgeschlagen:", error);
  }
}
