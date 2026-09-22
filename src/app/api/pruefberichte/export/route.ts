import { redirect } from "next/navigation";
import { getCurrentUserEmail } from "@/lib/auth/session";
import { getPortalAccess } from "@/lib/auth/access";
import { getCurrentFirmaId } from "@/lib/auth/current-firma";
import { getPruefberichteExportRows } from "@/lib/pruefberichte/queries";
import { buildPruefberichteExportCsv } from "@/lib/pruefberichte/export-csv";

// Liegt ausserhalb der automatischen Schutzschicht von (protected)/layout.tsx
// (die gilt nur für Seiten) — prüft Session/Zugriff deshalb selbst, exakt wie
// der PROJ-8-Export-Endpoint. getCurrentFirmaId() allein reicht nicht ohne
// vorherigen E-Mail-/Access-Check (siehe current-firma.ts).
export async function GET(request: Request) {
  const email = await getCurrentUserEmail();
  if (!email) redirect("/login");

  const access = await getPortalAccess(email);
  if (!access) redirect("/kein-zugang");

  const firmaId = await getCurrentFirmaId();

  const { searchParams } = new URL(request.url);
  const zeitraum = searchParams.get("zeitraum") ?? undefined;

  try {
    const items = await getPruefberichteExportRows(firmaId, { zeitraum });
    const csv = buildPruefberichteExportCsv(items);
    const datum = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="pruefberichte-uebersicht-${datum}.csv"`,
      },
    });
  } catch (error) {
    console.error("Prüfberichte-Export fehlgeschlagen:", error);
    return new Response("Export fehlgeschlagen", { status: 500 });
  }
}
