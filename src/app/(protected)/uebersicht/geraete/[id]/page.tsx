import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentFirmaId } from "@/lib/auth/current-firma";
import { getGeraetById } from "@/lib/geraete/queries";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  return (
    <div>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link
          href="/uebersicht"
          className="mb-4 inline-block text-sm text-primary underline-offset-2 hover:underline"
        >
          ← Zurück zur Übersicht
        </Link>

        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">{geraet.name ?? "(ohne Namen)"}</h1>
          {geraet.status && <Badge variant="secondary">{geraet.status}</Badge>}
        </div>

        <Card>
          <CardContent className="grid grid-cols-1 gap-4 py-6 sm:grid-cols-2">
            <Field label="Seriennummer" value={geraet.seriennummer} />
            <Field label="Barcode" value={geraet.barcode} />
            <Field label="Standort" value={geraet.standortName} />
            <Field label="Lagerort" value={geraet.lagerort} />
            <Field label="Letzte Prüfung" value={formatDatum(geraet.letztePruefung)} />
            <Field label="Ablegereife" value={formatDatum(geraet.ablegereife)} />
            <Field label="Prüfer" value={geraet.pruefer} />
            <Field label="Herstelljahr" value={geraet.herstelljahr} />
            <Field label="Artikel" value={geraet.artikelBezeichnung} />
            <Field label="Hersteller" value={geraet.artikelHersteller} />
            <Field label="Norm" value={geraet.artikelNorm} />
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
      </main>
    </div>
  );
}
