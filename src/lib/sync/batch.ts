import { getSupabaseAdmin } from "@/lib/supabase-admin";

const CHUNK_SIZE = 500;
const ID_PAGE_SIZE = 1000;

export function chunk<T>(items: T[], size: number = CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function batchUpsert(table: string, records: Record<string, unknown>[]): Promise<void> {
  for (const batch of chunk(records)) {
    if (batch.length === 0) continue;
    const { error } = await getSupabaseAdmin().from(table).upsert(batch, { onConflict: "id" });
    if (error) throw new Error(`Upsert into ${table} failed: ${error.message}`);
  }
}

// Pages through all ids in a table (optionally filtered), since PostgREST
// caps a single response at 1000 rows by default.
export async function fetchAllIds(table: string, onlyWhereNull?: string): Promise<string[]> {
  const ids: string[] = [];
  let from = 0;

  while (true) {
    let query = getSupabaseAdmin().from(table).select("id").range(from, from + ID_PAGE_SIZE - 1);
    if (onlyWhereNull) query = query.is(onlyWhereNull, null);

    const { data, error } = await query;
    if (error) throw new Error(`Reading ids from ${table} failed: ${error.message}`);
    if (!data || data.length === 0) break;

    ids.push(...data.map((row) => row.id as string));
    if (data.length < ID_PAGE_SIZE) break;
    from += ID_PAGE_SIZE;
  }

  return ids;
}

export async function batchDelete(table: string, ids: string[]): Promise<void> {
  for (const batch of chunk(ids)) {
    if (batch.length === 0) continue;
    const { error } = await getSupabaseAdmin().from(table).delete().in("id", batch);
    if (error) throw new Error(`Deleting from ${table} failed: ${error.message}`);
  }
}

export async function batchSoftDelete(table: string, ids: string[]): Promise<void> {
  for (const batch of chunk(ids)) {
    if (batch.length === 0) continue;
    const { error } = await getSupabaseAdmin()
      .from(table)
      .update({ deleted_at: new Date().toISOString() })
      .in("id", batch);
    if (error) throw new Error(`Soft-deleting from ${table} failed: ${error.message}`);
  }
}
