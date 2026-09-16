import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getEntityConfig } from "@/lib/sync/entities";

export class UnknownEntityError extends Error {}

export async function upsertRecord(entitySlug: string, record: { id: string }) {
  const config = getEntityConfig(entitySlug);
  if (!config) throw new UnknownEntityError(`Unknown entity: ${entitySlug}`);

  const { error } = await getSupabaseAdmin()
    .from(config.table)
    .upsert({ ...record, synced_at: new Date().toISOString() }, { onConflict: "id" });

  if (error) throw error;
}

export async function deleteRecord(entitySlug: string, id: string) {
  const config = getEntityConfig(entitySlug);
  if (!config) throw new UnknownEntityError(`Unknown entity: ${entitySlug}`);

  const supabase = getSupabaseAdmin();

  if (config.softDelete) {
    const { error } = await supabase
      .from(config.table)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from(config.table).delete().eq("id", id);
  if (error) throw error;
}
