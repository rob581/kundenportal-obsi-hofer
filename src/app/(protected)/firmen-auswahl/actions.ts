"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../../../auth";

const SELECTED_FIRMA_COOKIE = "obsi_selected_firma";

export async function selectFirma(firmaId: string): Promise<void> {
  const session = await auth();
  const allowedIds = session?.portal?.firmaIds ?? [];

  if (!allowedIds.includes(firmaId)) {
    throw new Error("Ungültige Firma-Auswahl");
  }

  (await cookies()).set(SELECTED_FIRMA_COOKIE, firmaId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect("/uebersicht");
}
