import { NextResponse } from "next/server";
import { sendOpsEmail } from "@/lib/notify/send-email";
import { runDataverseSync, FirmaNotFoundError, InvalidFirmaIdError } from "@/lib/sync/run-sync";

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

    // PROJ-12: firmaId ist Pflicht — einen Vollsync über alle Firmen gibt es
    // nicht mehr (Decision Log 2026-10-07). Eine fehlende, ungültige oder
    // unbekannte firmaId ist ein Fehler im aufrufenden Admin-Tool, kein
    // Sync-Infrastruktur-Problem — dafür wird bewusst keine Ops-Mail verschickt.
    const firmaId = new URL(request.url).searchParams.get("firmaId");
    if (firmaId === null) {
      return NextResponse.json({ error: "Parameter firmaId fehlt." }, { status: 400 });
    }

    let result;
    try {
      result = await runDataverseSync(firmaId);
    } catch (error) {
      if (error instanceof FirmaNotFoundError) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error instanceof InvalidFirmaIdError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    const allIssues = [...result.warnings, ...result.errors];
    if (allIssues.length > 0) {
      await sendOpsEmail(
        `Dataverse-Sync: Probleme beim Sync für Firma ${firmaId}`,
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
      await sendOpsEmail("Dataverse-Sync: erfolgreich", summary || "Keine Entities konfiguriert.");
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Dataverse sync failed:", message);
    await sendOpsEmail("Dataverse-Sync fehlgeschlagen", message);
    return NextResponse.json({ error: "Sync failed", message }, { status: 500 });
  }
}
