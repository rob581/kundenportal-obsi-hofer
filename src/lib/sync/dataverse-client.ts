import { ConfidentialClientApplication } from "@azure/msal-node";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function dataverseUrl(): string {
  return requireEnv("DATAVERSE_URL").replace(/\/$/, "");
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getDataverseAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const msalClient = new ConfidentialClientApplication({
    auth: {
      clientId: requireEnv("AZURE_CLIENT_ID"),
      authority: `https://login.microsoftonline.com/${requireEnv("AZURE_TENANT_ID")}`,
      clientSecret: requireEnv("AZURE_CLIENT_SECRET"),
    },
  });

  const result = await msalClient.acquireTokenByClientCredential({
    scopes: [`${dataverseUrl()}/.default`],
  });

  if (!result?.accessToken) throw new Error("Failed to acquire Dataverse access token");

  cachedToken = {
    value: result.accessToken,
    // Refresh a little before the real expiry to be safe.
    expiresAt: Date.now() + (result.expiresOn ? result.expiresOn.getTime() - Date.now() - 60_000 : 5 * 60_000),
  };
  return cachedToken.value;
}

export async function fetchAllDataverseRecords(
  entitySet: string,
  select: string[]
): Promise<Record<string, unknown>[]> {
  const token = await getDataverseAccessToken();
  const records: Record<string, unknown>[] = [];
  let url: string | null = `${dataverseUrl()}/api/data/v9.2/${entitySet}?$select=${select.join(",")}`;

  while (url) {
    const res: Response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    });
    if (!res.ok) {
      throw new Error(`Dataverse request failed (${res.status}) for ${entitySet}: ${await res.text()}`);
    }
    const body: { value: Record<string, unknown>[]; "@odata.nextLink"?: string } = await res.json();
    records.push(...body.value);
    url = body["@odata.nextLink"] ?? null;
  }

  return records;
}
