"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUserEmail } from "@/lib/auth/session";
import { getPortalAccess } from "@/lib/auth/access";

const SELECTED_FIRMA_COOKIE = "obsi_selected_firma";

export async function selectFirma(firmaId: string): Promise<void> {
  const email = await getCurrentUserEmail();
  const access = email ? await getPortalAccess(email) : null;
  const allowedIds = access?.firmaIds ?? [];

  if (!allowedIds.includes(firmaId)) {
    throw new Error("Ungültige Firma-Auswahl");
  }

  (await cookies()).set(SELECTED_FIRMA_COOKIE, firmaId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect("/dashboard");
}

// Lets a customer with multiple Firmen jump back to the selection screen
// from within the portal, without having to sign out and back in just to
// change which Firma's data they're looking at.
export async function changeFirma(): Promise<void> {
  (await cookies()).delete(SELECTED_FIRMA_COOKIE);
  redirect("/firmen-auswahl");
}
