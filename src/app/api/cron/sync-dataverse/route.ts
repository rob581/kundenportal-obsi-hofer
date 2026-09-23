import { NextResponse } from "next/server";
import { sendSyncAlertEmail } from "@/lib/sync/notify";
import { runDataverseSync } from "@/lib/sync/run-sync";

// Batched upserts over ~30k records comfortably fit in a few minutes;
// 300s requires a Vercel plan that supports extended function duration
// (Hobby is capped lower) — revisit at /deploy if this needs raising.
export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) throw new Error("Missing CRON_SECRET environment variable");
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

export async function GET(request: Request) {
  // isAuthorized() throws if CRON_SECRET itself is missing (misconfiguration).
  // That must still be logged and alerted on, not crash unhandled — so the
  // auth check runs inside the same try/catch as the sync itself.
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await runDataverseSync();

    const allIssues = [...result.warnings, ...result.errors];
    if (allIssues.length > 0) {
      await sendSyncAlertEmail(
        "Dataverse-Sync: Probleme beim täglichen Lauf",
        allIssues.join("\n")
      );
    } else if (process.env.CRON_NOTIFY_ON_SUCCESS) {
      // TEMPORÄR (siehe .env.local.example): Vercel Hobby zeigt Logs nur für
      // die letzten 30 Minuten an, der Cron läuft aber nachts um 3 Uhr — ohne
      // diese Mail lässt sich ein sauberer Lauf morgens nicht mehr
      // nachvollziehen. Einfach CRON_NOTIFY_ON_SUCCESS wieder entfernen,
      // sobald die Überwachungsphase vorbei ist.
      const summary = result.entities
        .map((e) => `"${e.slug}": ${e.fetched} geladen, ${e.added} hinzugefügt, ${e.updated} aktualisiert, ${e.deleted} gelöscht${e.skippedDueToThreshold ? " (Löschung übersprungen)" : ""}`)
        .join("\n");
      await sendSyncAlertEmail("Dataverse-Sync: erfolgreich", summary || "Keine Entities konfiguriert.");
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Dataverse sync failed:", message);
    await sendSyncAlertEmail("Dataverse-Sync fehlgeschlagen", message);
    return NextResponse.json({ error: "Sync failed", message }, { status: 500 });
  }
}
