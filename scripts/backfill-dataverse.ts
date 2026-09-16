// One-off backfill: reads existing records directly from the Dataverse Web
// API and upserts them into the Supabase mirror tables via the same
// upsertRecord() function the sync API routes use. Run manually, once,
// before Power Automate starts sending live change events (see PROJ-1).
//
// Usage: npm run backfill:dataverse
//
// Required env vars (read from .env.local): DATAVERSE_URL, AZURE_TENANT_ID,
// AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, SUPABASE_URL, SUPABASE_SECRET_KEY
//
// NOTE: the Dataverse lookup ("_<name>_value") field names below are based
// on the exported solution's attribute names and may not exactly match the
// live relationship schema names — verify against the real environment
// (e.g. via a single test request) before running against production data.

import { ConfidentialClientApplication } from "@azure/msal-node";
import { upsertRecord } from "../src/lib/sync/service";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Fine if .env.local doesn't exist (e.g. vars already set in the shell/CI)
}

const DATAVERSE_URL = requireEnv("DATAVERSE_URL").replace(/\/$/, "");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function getAccessToken(): Promise<string> {
  const msalClient = new ConfidentialClientApplication({
    auth: {
      clientId: requireEnv("AZURE_CLIENT_ID"),
      authority: `https://login.microsoftonline.com/${requireEnv("AZURE_TENANT_ID")}`,
      clientSecret: requireEnv("AZURE_CLIENT_SECRET"),
    },
  });

  const result = await msalClient.acquireTokenByClientCredential({
    scopes: [`${DATAVERSE_URL}/.default`],
  });

  if (!result?.accessToken) throw new Error("Failed to acquire Dataverse access token");
  return result.accessToken;
}

async function fetchAll(
  token: string,
  entitySet: string,
  select: string[]
): Promise<Record<string, unknown>[]> {
  const records: Record<string, unknown>[] = [];
  let url: string | null =
    `${DATAVERSE_URL}/api/data/v9.2/${entitySet}?$select=${select.join(",")}`;

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
      throw new Error(`Dataverse request failed (${res.status}): ${await res.text()}`);
    }
    const body: { value: Record<string, unknown>[]; "@odata.nextLink"?: string } =
      await res.json();
    records.push(...body.value);
    url = body["@odata.nextLink"] ?? null;
  }

  return records;
}

type Job = {
  slug: string;
  entitySet: string;
  select: string[];
  map: (raw: Record<string, unknown>) => { id: string } & Record<string, unknown>;
};

// NOTE: Dataverse's Web API always uses the fully-lowercase LogicalName for
// every attribute — the mixed-case names visible in the solution designer
// (SchemaName, e.g. "bmvcc_ArtikelId") are display-only. Verified against
// the real environment on 2026-09-16; every select/map key below is the
// actual LogicalName, confirmed via a live request per entity.

const jobs: Job[] = [
  {
    slug: "firmen",
    entitySet: "bmvcc_firmas",
    select: [
      "bmvcc_firmaid",
      "bmvcc_name",
      "bmvcc_name_2",
      "bmvcc_nr",
      "bmvcc_email",
      "bmvcc_phone_fixed",
      "bmvcc_phone_mobile",
      "bmvcc_website",
      "bmvcc_street_name",
      "bmvcc_house_number",
      "bmvcc_address_postalcode",
      "bmvcc_address_city",
    ],
    map: (r) => ({
      id: r.bmvcc_firmaid as string,
      name: r.bmvcc_name ?? null,
      name2: r.bmvcc_name_2 ?? null,
      nummer: r.bmvcc_nr ?? null,
      email: r.bmvcc_email ?? null,
      telefon: r.bmvcc_phone_fixed ?? null,
      mobil: r.bmvcc_phone_mobile ?? null,
      website: r.bmvcc_website ?? null,
      adresse_strasse: r.bmvcc_street_name ?? null,
      adresse_hausnummer: r.bmvcc_house_number ?? null,
      adresse_plz: r.bmvcc_address_postalcode ?? null,
      adresse_ort: r.bmvcc_address_city ?? null,
    }),
  },
  {
    slug: "artikel",
    entitySet: "bmvcc_artikels",
    select: [
      "bmvcc_artikelid",
      "bmvcc_articlename",
      "bmvcc_articlenumber",
      "bmvcc_articletype",
      "bmvcc_standardnorm",
      "bmvcc_manufacturer",
    ],
    map: (r) => ({
      id: r.bmvcc_artikelid as string,
      bezeichnung: r.bmvcc_articlename ?? null,
      artikelnummer: r.bmvcc_articlenumber ?? null,
      artikeltyp: r.bmvcc_articletype ?? null,
      norm: r.bmvcc_standardnorm ?? null,
      hersteller: r.bmvcc_manufacturer ?? null,
    }),
  },
  {
    slug: "kontakte",
    entitySet: "bmvcc_kontakts",
    select: [
      "bmvcc_kontaktid",
      "bmvcc_name_1",
      "bmvcc_name_2",
      "bmvcc_mail",
      "bmvcc_phone_fixed",
      "mobile_phone",
      "statecode",
    ],
    map: (r) => ({
      id: r.bmvcc_kontaktid as string,
      name1: r.bmvcc_name_1 ?? null,
      name2: r.bmvcc_name_2 ?? null,
      email: r.bmvcc_mail ?? null,
      telefon: r.bmvcc_phone_fixed ?? null,
      mobil: r.mobile_phone ?? null,
      ist_aktiv: r.statecode === 0,
    }),
  },
  {
    slug: "standorte",
    entitySet: "bmvcc_organizationlocations",
    select: ["bmvcc_organizationlocationid", "bmvcc_displayname", "_bmvcc_bexiofirma_value"],
    map: (r) => ({
      id: r.bmvcc_organizationlocationid as string,
      name: r.bmvcc_displayname ?? null,
      firma_id: r._bmvcc_bexiofirma_value ?? null,
    }),
  },
  {
    slug: "geraete",
    entitySet: "bmvcc_equipmentrecords",
    select: [
      "bmvcc_equipmentrecordid",
      "bmvcc_geraetename",
      "bmvcc_serienummer",
      "bmvcc_barcode",
      "bmvcc_betriebsmittelstatus",
      "bmvcc_letztepruefung",
      "bmvcc_ablegereife",
      "bmvcc_herstelljahr",
      "_bmvcc_standort_value",
      "_cre77_artikel_value",
      "bmvcc_lagerort",
      "bmvcc_pruefer",
      "bmvcc_zubehoer",
      "bmvcc_dokumentation",
      "bmvcc_notitzen",
    ],
    map: (r) => ({
      id: r.bmvcc_equipmentrecordid as string,
      name: r.bmvcc_geraetename ?? null,
      seriennummer: r.bmvcc_serienummer ?? null,
      barcode: r.bmvcc_barcode ?? null,
      status: r.bmvcc_betriebsmittelstatus ?? null,
      letzte_pruefung: r.bmvcc_letztepruefung ?? null,
      ablegereife: r.bmvcc_ablegereife ?? null,
      herstelljahr: r.bmvcc_herstelljahr ?? null,
      standort_id: r._bmvcc_standort_value ?? null,
      artikel_id: r._cre77_artikel_value ?? null,
      lagerort: r.bmvcc_lagerort ?? null,
      pruefer: r.bmvcc_pruefer ?? null,
      zubehoer: r.bmvcc_zubehoer ?? null,
      dokumentation: r.bmvcc_dokumentation ?? null,
      bemerkungen: r.bmvcc_notitzen ?? null,
    }),
  },
  {
    slug: "pruefberichte",
    entitySet: "bmvcc_pruefberichts",
    select: [
      "bmvcc_pruefberichtid",
      "_bmvcc_gearaet_value",
      "bmvcc_inspectiondate",
      "bmvcc_inspectionresult",
      "bmvcc_inspector",
      "bmvcc_isarchived",
    ],
    map: (r) => ({
      id: r.bmvcc_pruefberichtid as string,
      geraet_id: r._bmvcc_gearaet_value ?? null,
      pruefdatum: r.bmvcc_inspectiondate ?? null,
      ergebnis: r.bmvcc_inspectionresult ?? null,
      pruefer: r.bmvcc_inspector ?? null,
      ist_archiviert: r.bmvcc_isarchived ?? false,
    }),
  },
  {
    slug: "relationen",
    entitySet: "bmvcc_relations",
    select: ["bmvcc_relationid", "_bmvcc_firma_value", "_bmvcc_person_value", "bmvcc_role_description"],
    map: (r) => ({
      id: r.bmvcc_relationid as string,
      firma_id: r._bmvcc_firma_value ?? null,
      kontakt_id: r._bmvcc_person_value ?? null,
      rolle: r.bmvcc_role_description ?? null,
    }),
  },
];

async function main() {
  const token = await getAccessToken();

  for (const job of jobs) {
    console.log(`Fetching ${job.entitySet}...`);
    const rawRecords = await fetchAll(token, job.entitySet, job.select);
    console.log(`  ${rawRecords.length} records — upserting into "${job.slug}"`);

    for (const raw of rawRecords) {
      await upsertRecord(job.slug, job.map(raw));
    }
  }

  console.log("Backfill complete.");
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
