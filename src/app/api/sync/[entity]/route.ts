import { NextResponse } from "next/server";
import { isValidSyncApiKey } from "@/lib/sync/auth";
import { getEntityConfig, deleteSchema } from "@/lib/sync/entities";
import { checkRateLimit, rateLimitKeyFor } from "@/lib/sync/rate-limit";
import { deleteRecord, upsertRecord } from "@/lib/sync/service";

type RouteParams = { params: Promise<{ entity: string }> };

function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "Too many requests" },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

export async function POST(request: Request, { params }: RouteParams) {
  const rateLimit = checkRateLimit(rateLimitKeyFor(request));
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterSeconds);
  }

  if (!isValidSyncApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { entity } = await params;
  const config = getEntityConfig(entity);
  if (!config) {
    return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = config.schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await upsertRecord(entity, parsed.data);
  return NextResponse.json({ status: "ok" });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const rateLimit = checkRateLimit(rateLimitKeyFor(request));
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterSeconds);
  }

  if (!isValidSyncApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { entity } = await params;
  const config = getEntityConfig(entity);
  if (!config) {
    return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await deleteRecord(entity, parsed.data.id);
  return NextResponse.json({ status: "ok" });
}
