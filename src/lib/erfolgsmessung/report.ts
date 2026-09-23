import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getFirmenNamen } from "@/lib/auth/access";

export type LoginStatusRow = {
  firmaId: string;
  firmaName: string;
  hatLogin: boolean;
};

export type LoginCountRow = {
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

// login_log (Migration 0010) zählt Logins erst ab Einführung dieses Features
// (kein Backfill, Nutzerwunsch) — ergänzt die auth.users-basierte Login-Quote
// oben um einen echten Zähler pro Firma. Namen werden über die bestehende
// getFirmenNamen() aus src/lib/auth/access.ts aufgelöst (keine Duplikation).
export async function getLoginsProFirma(): Promise<LoginCountRow[]> {
  const { data, error } = await getSupabaseAdmin().from("login_log").select("firma_id");
  if (error) throw new Error(`Login-Log-Abfrage fehlgeschlagen: ${error.message}`);

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { firma_id: string }[]) {
    counts.set(row.firma_id, (counts.get(row.firma_id) ?? 0) + 1);
  }

  const firmen = await getFirmenNamen([...counts.keys()]);
  const nameMap = new Map(firmen.map((f) => [f.id, f.name]));

  return [...counts.entries()]
    .map(([firmaId, anzahl]) => ({ firmaId, firmaName: nameMap.get(firmaId) ?? "(ohne Namen)", anzahl }))
    .sort((a, b) => b.anzahl - a.anzahl || a.firmaName.localeCompare(b.firmaName));
}

// export_log (Migration 0008) hat keine auth-Abhängigkeit, daher direkt über
// den normalen Service-Role-Client lesbar — die Gruppierung nach Monat/Entity
// passiert bewusst hier in JS statt in einer eigenen DB-Funktion (siehe
// Technical Decisions: kein zweites DB-Objekt für eine triviale Gruppierung).
export async function getExportsProMonat(): Promise<ExportsProMonatRow[]> {
  const { data, error } = await getSupabaseAdmin().from("export_log").select("entity, created_at");
  if (error) throw new Error(`Export-Log-Abfrage fehlgeschlagen: ${error.message}`);

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { entity: string; created_at: string }[]) {
    const monat = row.created_at.slice(0, 7);
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

function formatLoginsProFirmaSection(rows: LoginCountRow[]): string[] {
  if (rows.length === 0) {
    return ["=== Logins pro Firma ===", "Noch keine erfassten Logins seit Einführung dieser Zählung."];
  }

  return ["=== Logins pro Firma ===", ...rows.map((r) => `${r.firmaName}: ${r.anzahl}`)];
}

function formatExportsSection(rows: ExportsProMonatRow[]): string[] {
  if (rows.length === 0) {
    return ["=== CSV-Exports pro Monat ===", "Bisher keine Exports."];
  }

  return ["=== CSV-Exports pro Monat ===", ...rows.map((r) => `${r.monat} – ${r.entity}: ${r.anzahl}`)];
}

export async function buildErfolgsmessungReport(): Promise<string> {
  const [loginStatus, loginsProFirma, exportsProMonat] = await Promise.all([
    getLoginStatus(),
    getLoginsProFirma(),
    getExportsProMonat(),
  ]);

  return [
    ...formatLoginQuoteSection(loginStatus),
    "",
    ...formatLoginsProFirmaSection(loginsProFirma),
    "",
    ...formatExportsSection(exportsProMonat),
  ].join("\n");
}
