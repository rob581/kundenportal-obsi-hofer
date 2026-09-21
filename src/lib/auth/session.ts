import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// React cache() dedupliziert innerhalb eines einzelnen Requests — mehrere
// Stellen (Layout, AppHeader, current-firma.ts) fragen pro Seitenaufruf
// unabhängig voneinander nach der aktuellen E-Mail, ohne dass das zu
// mehrfachen Supabase-Aufrufen führt.
export const getCurrentUserEmail = cache(async (): Promise<string | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.email ?? null;
});
