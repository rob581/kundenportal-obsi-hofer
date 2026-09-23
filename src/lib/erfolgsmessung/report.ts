import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getFirmenNamen } from "@/lib/auth/access";

export type LoginStatusRow = {
  firmaId: string;
  firmaName: string;
  hatLogin: boolean;
};

// Gemeinsame Form für jede "X pro Firma"-Zählung (Logins, Exports, ...).
export type FirmaCountRow = {
  firmaId: string;
  firmaName: string;
  anzahl: number;
};

export type ExportsProMonatRow = {
  monat: string; // "YYYY-MM"
  entity: "geraete" | "pruefberichte";
  anzahl: number;
};

// Ruft die security-definer-Funktion aus Migration 0009 auf — der normale
// PostgREST-Zugriffsweg erreicht auth.users nicht direkt, die Funktion kann
// das serverseitig trotzdem, liefert aber nur das berechnete Ergebnis
// zurück (siehe PROJ-11 Tech Design, Nachtrag Wochenreport).
export async function getLoginStatus(): Promise<LoginStatusRow[]> {
  const { data, error } = await getSupabaseAdmin().rpc("erfolgsmessung_login_status");
  if (error) throw new Error(`Login-Status-Abfrage fehlgeschlagen: ${error.message}`);

  return (data ?? []).map((row: { firma_id: string; firma_name: string | null; hat_login: boolean }) => ({
    firmaId: row.firma_id,
    firmaName: row.firma_name ?? "(ohne Namen)",
    hatLogin: row.hat_login,
  }));
}

// Gemeinsame Aggregation für jede "X pro Firma"-Zählung: zählt Vorkommen pro
// firma_id und löst die Namen über die bestehende getFirmenNamen() aus
// src/lib/auth/access.ts auf (keine Duplikation), absteigend sortiert.
async function countByFirma(firmaIds: string[]): Promise<FirmaCountRow[]> {
  const counts = new Map<string, number>();
  for (const firmaId of firmaIds) {
    counts.set(firmaId, (counts.get(firmaId) ?? 0) + 1);
  }

  const firmen = await getFirmenNamen([...counts.keys()]);
  const nameMap = new Map(firmen.map((f) => [f.id, f.name]));

  return [...counts.entries()]
    .map(([firmaId, anzahl]) => ({ firmaId, firmaName: nameMap.get(firmaId) ?? "(ohne Namen)", anzahl }))
    .sort((a, b) => b.anzahl - a.anzahl || a.firmaName.localeCompare(b.firmaName));
}

// login_log (Migration 0010) zählt Logins erst ab Einführung dieses Features
// (kein Backfill, Nutzerwunsch) — ergänzt die auth.users-basierte Login-Quote
// oben um einen echten Zähler pro Firma.
export async function getLoginsProFirma(): Promise<FirmaCountRow[]> {
  const { data, error } = await getSupabaseAdmin().from("login_log").select("firma_id");
  if (error) throw new Error(`Login-Log-Abfrage fehlgeschlagen: ${error.message}`);

  return countByFirma((data ?? []).map((row: { firma_id: string }) => row.firma_id));
}

type ExportLogRow = { firmaId: string; entity: ExportsProMonatRow["entity"]; createdAt: string };

// export_log (Migration 0008) hat keine auth-Abhängigkeit, daher direkt über
// den normalen Service-Role-Client lesbar. Ein einziger Read, zwei
// unabhängige Auswertungen (pro Monat, pro Firma) — Gruppierung passiert
// bewusst in JS statt in einer eigenen DB-Funktion (siehe Technical
// Decisions: kein zweites DB-Objekt für eine triviale Gruppierung).
async function fetchExportLogRows(): Promise<ExportLogRow[]> {
  const { data, error } = await getSupabaseAdmin().from("export_log").select("firma_id, entity, created_at");
  if (error) throw new Error(`Export-Log-Abfrage fehlgeschlagen: ${error.message}`);

  return (data ?? []).map((row: { firma_id: string; entity: string; created_at: string }) => ({
    firmaId: row.firma_id,
    entity: row.entity as ExportsProMonatRow["entity"],
    createdAt: row.created_at,
  }));
}

export async function getExportsProMonat(): Promise<ExportsProMonatRow[]> {
  const rows = await fetchExportLogRows();

  const counts = new Map<string, number>();
  for (const row of rows) {
    const monat = row.createdAt.slice(0, 7);
    const key = `${monat}|${row.entity}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([key, anzahl]) => {
      const [monat, entity] = key.split("|") as [string, ExportsProMonatRow["entity"]];
      return { monat, entity, anzahl };
    })
    .sort((a, b) => (a.monat === b.monat ? a.entity.localeCompare(b.entity) : b.monat.localeCompare(a.monat)));
}

export async function getExportsProFirma(): Promise<FirmaCountRow[]> {
  const rows = await fetchExportLogRows();
  return countByFirma(rows.map((row) => row.firmaId));
}

function formatLoginQuoteSection(rows: LoginStatusRow[]): string[] {
  if (rows.length === 0) {
    return ["=== Login-Quote ===", "Keine Kunden mit Zugang."];
  }

  const mitLogin = rows.filter((r) => r.hatLogin);
  const quoteProzent = Math.round((mitLogin.length / rows.length) * 1000) / 10;

  return [
    "=== Login-Quote ===",
    `${mitLogin.length}/${rows.length} Firmen (${quoteProzent}%)`,
    "",
    `Eingeloggt: ${mitLogin.map((f) => f.firmaName).join(", ") || "–"}`,
  ];
}

function formatFirmaCountSection(title: string, rows: FirmaCountRow[], leerText: string): string[] {
  if (rows.length === 0) {
    return [title, leerText];
  }

  return [title, ...rows.map((r) => `${r.firmaName}: ${r.anzahl}`)];
}

function formatExportsProMonatSection(rows: ExportsProMonatRow[]): string[] {
  if (rows.length === 0) {
    return ["=== CSV-Exports pro Monat ===", "Bisher keine Exports."];
  }

  return ["=== CSV-Exports pro Monat ===", ...rows.map((r) => `${r.monat} – ${r.entity}: ${r.anzahl}`)];
}

export async function buildErfolgsmessungReport(): Promise<string> {
  const [loginStatus, loginsProFirma, exportsProMonat, exportsProFirma] = await Promise.all([
    getLoginStatus(),
    getLoginsProFirma(),
    getExportsProMonat(),
    getExportsProFirma(),
  ]);

  return [
    ...formatLoginQuoteSection(loginStatus),
    "",
    ...formatFirmaCountSection(
      "=== Logins pro Firma ===",
      loginsProFirma,
      "Noch keine erfassten Logins seit Einführung dieser Zählung."
    ),
    "",
    ...formatExportsProMonatSection(exportsProMonat),
    "",
    ...formatFirmaCountSection("=== CSV-Exports pro Firma ===", exportsProFirma, "Bisher keine Exports."),
  ].join("\n");
}
