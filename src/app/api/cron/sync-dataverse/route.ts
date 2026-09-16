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
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDataverseSync();

    if (result.warnings.length > 0) {
      await sendSyncAlertEmail(
        "Dataverse-Sync: Löschungs-Sicherheitsschwelle ausgelöst",
        result.warnings.join("\n")
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Dataverse sync failed:", message);
    await sendSyncAlertEmail("Dataverse-Sync fehlgeschlagen", message);
    return NextResponse.json({ error: "Sync failed", message }, { status: 500 });
  }
}
