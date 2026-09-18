import Link from "next/link";
import { auth } from "../../../../auth";
import { getFirmenNamen } from "@/lib/auth/access";
import { getCurrentFirmaId } from "@/lib/auth/current-firma";
import { getDashboardKennzahlen } from "@/lib/dashboard/mock-data";
import { getStatusBadgeVariant } from "@/lib/status-badge";
import { changeFirma } from "../firmen-auswahl/actions";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_TILE_TEXT_COLOR: Record<string, string> = {
  success: "text-status-success",
  destructive: "text-destructive",
  warning: "text-status-warning",
  secondary: "text-foreground",
};

function formatDatum(iso: string | null): string {
  if (!iso) return "Noch nie geprüft";
  return new Date(iso).toLocaleDateString("de-CH");
}

function StatusKachel({
  label,
  anzahl,
  status,
}: {
  label: string;
  anzahl: number;
  status?: string;
}) {
  const colorClass = STATUS_TILE_TEXT_COLOR[status ? getStatusBadgeVariant(status) : "secondary"];

  const content = (
    <Card className={status ? "transition-colors hover:bg-muted/50" : undefined}>
      <CardContent className="py-6 text-center">
        <p className={`text-2xl font-semibold ${colorClass}`}>{anzahl}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );

  if (!status) return content;

  return (
    <Link href={`/uebersicht?status=${encodeURIComponent(status)}`} className="block">
      {content}
    </Link>
  );
}

export default async function DashboardPage() {
  const currentFirmaId = await getCurrentFirmaId();
  const session = await auth();
  const hatMehrereFirmen = (session?.portal?.firmaIds.length ?? 0) > 1;
  const firmen = await getFirmenNamen([currentFirmaId]);
  const firma = firmen[0];

  let kennzahlen: Awaited<ReturnType<typeof getDashboardKennzahlen>> | null = null;
  let loadError: string | null = null;
  try {
    kennzahlen = await getDashboardKennzahlen(currentFirmaId);
  } catch {
    loadError = "Die Kennzahlen konnten nicht geladen werden.";
  }

  const keineGeraete =
    kennzahlen !== null &&
    kennzahlen.statusFreigabe === 0 &&
    kennzahlen.statusKeineFreigabe === 0 &&
    kennzahlen.statusLetzteFreigabe === 0 &&
    kennzahlen.statusKeinStatus === 0;

  return (
    <div>
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="mb-1 text-xl font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">{firma?.name ?? "Ihre Firma"}</p>
          </div>
          {hatMehrereFirmen && (
            <form action={changeFirma}>
              <Button type="submit" variant="outline" size="sm">
                Firma wechseln
              </Button>
            </form>
          )}
        </div>

        {loadError ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">{loadError}</p>
              <Link href="/dashboard" className="text-sm font-medium text-primary underline">
                Erneut versuchen
              </Link>
            </CardContent>
          </Card>
        ) : keineGeraete ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Für Ihre Firma sind noch keine Geräte hinterlegt. Bei Fragen kontaktieren Sie OBSI
              Hofer GmbH.
            </CardContent>
          </Card>
        ) : (
          <>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">Geräte nach Status</h2>
            <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatusKachel label="Freigabe" anzahl={kennzahlen!.statusFreigabe} status="Freigabe" />
              <StatusKachel
                label="keine Freigabe"
                anzahl={kennzahlen!.statusKeineFreigabe}
                status="keine Freigabe"
              />
              <StatusKachel
                label="letzte Freigabe"
                anzahl={kennzahlen!.statusLetzteFreigabe}
                status="letzte Freigabe"
              />
              {kennzahlen!.statusKeinStatus > 0 && (
                <StatusKachel label="Kein Status" anzahl={kennzahlen!.statusKeinStatus} />
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Prüfberichte
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{kennzahlen!.totalPruefberichte}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Letzte Prüfung
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{formatDatum(kennzahlen!.letztePruefung)}</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
