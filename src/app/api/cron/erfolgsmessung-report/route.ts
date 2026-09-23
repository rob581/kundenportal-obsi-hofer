import { NextResponse } from "next/server";
import { sendOpsEmail } from "@/lib/notify/send-email";
import { buildErfolgsmessungReport } from "@/lib/erfolgsmessung/report";

export const maxDuration = 60;

// Identisches Muster zu /api/cron/sync-dataverse: der Auth-Check läuft im
// selben try/catch wie der Rest, damit ein fehlendes CRON_SECRET (Fix für
// die dortige QA BUG-1) auch hier geloggt und alarmiert statt unbehandelt
// geworfen wird.
function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) throw new Error("Missing CRON_SECRET environment variable");
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const report = await buildErfolgsmessungReport();
    await sendOpsEmail("Wöchentlicher Erfolgsmessungs-Report", report);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Erfolgsmessungs-Report fehlgeschlagen:", message);
    await sendOpsEmail("Erfolgsmessungs-Report fehlgeschlagen", message);
    return NextResponse.json({ error: "Report failed", message }, { status: 500 });
  }
}
