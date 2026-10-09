import { cache } from "react";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type PortalAccess = {
  contactId: string;
  firmaIds: string[];
  // PROJ-15: alle Standorte (über alle Firmen), für die der Kontakt einen
  // Portalzugang hat. Datenabfragen dürfen nur diese Standorte zeigen.
  standortIds: string[];
};

// Access rule (PROJ-2, seit PROJ-15 pro Standort): the verified email must
// match an ACTIVE Kontakt (dv_kontakte.ist_aktiv) that has at least one
// Portalzugang (dv_portalzugaenge, gepflegt im Admin-Tool) to a Standort
// that belongs to a Firma. The visible Firmen are the Firmen of those
// Standorte — neither dv_relationen nor the old PROJ-13 checkbox
// (ist_portal_freigegeben) is consulted anymore. Anything else — unknown
// email, inactive contact, no (valid) Zugang — means no access, and callers
// must show the same generic "Kein Zugang" message for all of these (see
// spec Decision Log: don't reveal which case it was).
//
// Seit dem Wechsel auf Supabase Auth (2026-09-21) wird dieser Check nicht
// mehr einmalig beim Login in einem Session-Token zwischengespeichert,
// sondern bei jedem Seitenaufruf frisch ausgeführt — react `cache()`
// dedupliziert das innerhalb eines Requests (siehe session.ts).
export const getPortalAccess = cache(async (email: string): Promise<PortalAccess | null> => {
  const supabase = getSupabaseAdmin();

  // PROJ-13 QA BUG-1: dieselbe E-Mail kann in Dataverse mehreren Kontakten
  // gehören (Bexio-Dubletten). Es zählen alle aktiven Kontakte dieser
  // (verifizierten) Adresse; ihre Zugänge werden vereinigt.
  const { data: kontakte, error: kontaktError } = await supabase
    .from("dv_kontakte")
    .select("id")
    .ilike("email", email)
    .eq("ist_aktiv", true);

  if (kontaktError) throw new Error(`Kontakt-Lookup fehlgeschlagen: ${kontaktError.message}`);
  const kontaktIds = (kontakte ?? []).map((k) => k.id as string).sort();
  if (kontaktIds.length === 0) return null;

  // Verwaiste Zugänge ohne Kontakt (kontakt_id null) können hier nie
  // treffen, weil nach konkreten Kontakt-IDs gefiltert wird.
  const { data: zugaenge, error: zugaengeError } = await supabase
    .from("dv_portalzugaenge")
    .select("standort_id")
    .in("kontakt_id", kontaktIds);

  if (zugaengeError) throw new Error(`Portalzugang-Lookup fehlgeschlagen: ${zugaengeError.message}`);
  const zugangStandortIds = [
    ...new Set((zugaenge ?? []).map((z) => z.standort_id).filter((id): id is string => !!id)),
  ];
  if (zugangStandortIds.length === 0) return null;

  // Nur Standorte, die (noch) im Portal existieren und einer Firma gehören,
  // zählen — ein Zugang zu einem unbekannten oder firmenlosen Standort gibt
  // keinen Zugang (fail-closed).
  const { data: standorte, error: standorteError } = await supabase
    .from("dv_standorte")
    .select("id, firma_id")
    .in("id", zugangStandortIds);

  if (standorteError) throw new Error(`Standort-Lookup fehlgeschlagen: ${standorteError.message}`);
  const gueltig = (standorte ?? []).filter((s): s is { id: string; firma_id: string } => !!s.id && !!s.firma_id);
  if (gueltig.length === 0) return null;

  const firmaIds = [...new Set(gueltig.map((s) => s.firma_id))];
  const standortIds = [...new Set(gueltig.map((s) => s.id))].sort();

  // contactId: bei Dubletten deterministisch der erste (nach ID sortiert).
  return { contactId: kontaktIds[0], firmaIds, standortIds };
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
