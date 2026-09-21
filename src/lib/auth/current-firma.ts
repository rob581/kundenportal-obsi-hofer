import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUserEmail } from "@/lib/auth/session";
import { getPortalAccess } from "@/lib/auth/access";

const SELECTED_FIRMA_COOKIE = "obsi_selected_firma";

// Shared by every page under (protected) that shows firma-scoped data
// (Geräte-Übersicht, device detail, ...). Centralized so the "does the
// visitor actually have an active Firma selected" check can't be forgotten
// on a new page — resolving it ad-hoc per page was already a source of a
// gap (the device detail page had no Firma check at all before PROJ-3
// backend work added this helper).
export async function getCurrentFirmaId(): Promise<string> {
  const email = await getCurrentUserEmail();
  const access = email ? await getPortalAccess(email) : null;
  const firmaIds = access?.firmaIds ?? [];

  if (firmaIds.length === 1) {
    return firmaIds[0];
  }

  const selected = (await cookies()).get(SELECTED_FIRMA_COOKIE)?.value;
  if (!selected || !firmaIds.includes(selected)) {
    redirect("/firmen-auswahl");
  }
  return selected;
}
