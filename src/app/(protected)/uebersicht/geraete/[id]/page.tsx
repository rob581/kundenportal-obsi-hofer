import Link from "next/link";
import { notFound } from "next/navigation";
import { getFirmenNamen } from "@/lib/auth/access";
import { getCurrentFirmaId } from "@/lib/auth/current-firma";
import { getGeraetById } from "@/lib/geraete/queries";
import { formatArtikelInfo } from "@/lib/geraete/artikel-info";
import { getFirmaEinstellungen } from "@/lib/firma-einstellungen/queries";
import { getPruefberichteFuerGeraet } from "@/lib/pruefberichte/queries";
import { getStatusBadgeVariant } from "@/lib/status-badge";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatDatum(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-CH");
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value ?? "—"}</dd>
    </div>
  );
}

export default async function GeraetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentFirmaId = await getCurrentFirmaId();
  const geraet = await getGeraetById(id, currentFirmaId);

  if (!geraet) {
    notFound();
  }

  const firmen = await getFirmenNamen([currentFirmaId]);
  const firma = firmen[0];

  // Gleiche defensive Behandlung wie auf der Übersicht (siehe PROJ-7): eine
  // nicht ladbare Konfiguration blendet KundenID einfach aus, statt die
  // Seite abstürzen zu lassen.
  let zeigtKundenId = false;
  try {
    const einstellungen = await getFirmaEinstellungen(currentFirmaId);
    zeigtKundenId = einstellungen.zusatzspalten.includes("kundenId");
  } catch (error) {
    console.error("getFirmaEinstellungen fehlgeschlagen:", error);
  }

  let pruefberichte: Awaited<ReturnType<typeof getPruefberichteFuerGeraet>> = [];
  let pruefberichteError: string | null = null;
  try {
    pruefberichte = await getPruefberichteFuerGeraet(id);
  } catch {
    pruefberichteError = "Prüfberichte konnten nicht geladen werden.";
  }

  return (
    <div>
      <AppHeader firmaName={firma?.name ?? "Ihre Firma"} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link
          href="/uebersicht"
          className="mb-4 inline-block text-sm text-primary underline-offset-2 hover:underline"
        >
          ← Zurück zur Übersicht
        </Link>

        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">{formatArtikelInfo(geraet)}</h1>
          {geraet.status && (
            <Badge variant={getStatusBadgeVariant(geraet.status)}>{geraet.status}</Badge>
          )}
        </div>

        <Card>
          <CardContent className="grid grid-cols-1 gap-4 py-6 sm:grid-cols-2">
            <Field label="Seriennummer" value={geraet.seriennummer} />
            <Field label="Barcode" value={geraet.barcode} />
            {zeigtKundenId && <Field label="KundenID" value={geraet.kundenId} />}
            <Field label="Standort" value={geraet.standortName} />
            <Field label="Lagerort" value={geraet.lagerort} />
            <Field label="Letzte Prüfung" value={formatDatum(geraet.letztePruefung)} />
            <Field label="Ablegereife" value={formatDatum(geraet.ablegereife)} />
            <Field label="Prüfer" value={geraet.pruefer} />
            <Field label="Herstelljahr" value={geraet.herstelljahr} />
            <Field label="Artikel" value={geraet.artikelBezeichnung} />
            <Field label="Hersteller" value={geraet.artikelHersteller} />
            <Field label="Norm" value={geraet.artikelNorm} />
            <Field label="Typ" value={geraet.artikelTyp} />
            <Field label="Dimension" value={geraet.artikelDimension} />
            <Field label="Zubehör" value={geraet.zubehoer} />
          </CardContent>
        </Card>

        {geraet.bemerkungen && (
          <Card className="mt-4">
            <CardContent className="py-4">
              <dt className="mb-1 text-xs text-muted-foreground">Bemerkungen</dt>
              <dd className="text-sm">{geraet.bemerkungen}</dd>
            </CardContent>
          </Card>
        )}

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Prüfberichte</CardTitle>
          </CardHeader>
          <CardContent>
            {pruefberichteError ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <p className="text-sm text-muted-foreground">{pruefberichteError}</p>
                <Link
                  href={`/uebersicht/geraete/${id}`}
                  className="text-sm font-medium text-primary underline"
                >
                  Erneut versuchen
                </Link>
              </div>
            ) : pruefberichte.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Für dieses Gerät sind noch keine Prüfberichte hinterlegt.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Ergebnis</TableHead>
                    <TableHead>Bemerkungen</TableHead>
                    <TableHead>Prüfer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pruefberichte.map((bericht) => (
                    <TableRow key={bericht.id}>
                      <TableCell>{formatDatum(bericht.pruefdatum)}</TableCell>
                      <TableCell>
                        {bericht.ergebnis ? (
                          <Badge variant={getStatusBadgeVariant(bericht.ergebnis)}>
                            {bericht.ergebnis}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{bericht.bemerkungen ?? "—"}</TableCell>
                      <TableCell>{bericht.pruefer ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
