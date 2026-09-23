import { redirect } from "next/navigation";
import { getCurrentUserEmail } from "@/lib/auth/session";
import { getPortalAccess } from "@/lib/auth/access";
import { getCurrentFirmaId } from "@/lib/auth/current-firma";
import { getGeraeteExportRows } from "@/lib/geraete/queries";
import { resolveZusatzspalten } from "@/lib/geraete/zusatzspalten";
import { getFirmaEinstellungen } from "@/lib/firma-einstellungen/queries";
import { buildGeraeteExportCsv } from "@/lib/geraete/export-csv";
import { logExportEvent } from "@/lib/export-log/log-export";

// Liegt ausserhalb der automatischen Schutzschicht von (protected)/layout.tsx
// (die gilt nur für Seiten) — prüft Session/Zugriff deshalb selbst, exakt wie
// jede geschützte Seite es tut. getCurrentFirmaId() allein reicht nicht: ohne
// vorherigen E-Mail-/Access-Check würde es einen nicht angemeldeten Besucher
// fälschlich zu /firmen-auswahl statt /login schicken (siehe current-firma.ts).
export async function GET(request: Request) {
  const email = await getCurrentUserEmail();
  if (!email) redirect("/login");

  const access = await getPortalAccess(email);
  if (!access) redirect("/kein-zugang");

  const firmaId = await getCurrentFirmaId();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const suche = searchParams.get("suche") ?? undefined;
  const zuPruefen = searchParams.get("zuPruefen") === "1";

  // Gleiches defensives Fail-open wie /uebersicht (siehe PROJ-7): eine nicht
  // ladbare Konfiguration exportiert einfach ohne Zusatzspalten, statt den
  // gesamten Export scheitern zu lassen.
  let zusatzspalten: ReturnType<typeof resolveZusatzspalten> = [];
  try {
    const einstellungen = await getFirmaEinstellungen(firmaId);
    zusatzspalten = resolveZusatzspalten(einstellungen.zusatzspalten);
  } catch (error) {
    console.error("getFirmaEinstellungen fehlgeschlagen (Export):", error);
  }
  const sucheKundenId = zusatzspalten.some((spalte) => spalte.key === "kundenId");

  try {
    const items = await getGeraeteExportRows(firmaId, { status, suche, zuPruefen, sucheKundenId });
    const csv = buildGeraeteExportCsv(items, zusatzspalten);
    const datum = new Date().toISOString().slice(0, 10);

    await logExportEvent(firmaId, "geraete");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="geraete-uebersicht-${datum}.csv"`,
      },
    });
  } catch (error) {
    console.error("Geräte-Export fehlgeschlagen:", error);
    return new Response("Export fehlgeschlagen", { status: 500 });
  }
}
