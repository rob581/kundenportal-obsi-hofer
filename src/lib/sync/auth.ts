export function isValidSyncApiKey(request: Request): boolean {
  const expected = process.env.SYNC_API_KEY;
  if (!expected) {
    throw new Error("Missing SYNC_API_KEY environment variable");
  }
  const provided = request.headers.get("x-api-key");
  return provided === expected;
}
