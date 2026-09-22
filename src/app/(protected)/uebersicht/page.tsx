import Link from "next/link";
import { getFirmenNamen } from "@/lib/auth/access";
import { getCurrentFirmaId } from "@/lib/auth/current-firma";
import { getGeraeteList } from "@/lib/geraete/queries";
import { formatArtikelInfo } from "@/lib/geraete/artikel-info";
import { resolveZusatzspalten } from "@/lib/geraete/zusatzspalten";
import { getFirmaEinstellungen } from "@/lib/firma-einstellungen/queries";
import { getStatusBadgeVariant } from "@/lib/status-badge";
import { AppHeader } from "@/components/app-header";
import { GeraeteFilterBar } from "@/components/geraete-filter-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

function formatDatum(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-CH");
}

export default async function UebersichtPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; suche?: string; seite?: string }>;
}) {
  const currentFirmaId = await getCurrentFirmaId();
  const firmen = await getFirmenNamen([currentFirmaId]);
  const firma = firmen[0];

  // Defensiv: portal_firma_einstellungen ist eine eigene, manuell zu
  // migrierende Tabelle (siehe PROJ-7) — falls die Migration auf dieser
  // Umgebung noch nicht gelaufen ist, soll die Übersicht trotzdem ohne
  // Zusatzspalten funktionieren statt mit einem Server-Fehler abzustürzen.
  let zusatzspalten: ReturnType<typeof resolveZusatzspalten> = [];
  try {
    const einstellungen = await getFirmaEinstellungen(currentFirmaId);
    zusatzspalten = resolveZusatzspalten(einstellungen.zusatzspalten);
  } catch (error) {
    console.error("getFirmaEinstellungen fehlgeschlagen:", error);
  }

  const params = await searchParams;
  const seite = params.seite ? Number(params.seite) : 1;

  let result: Awaited<ReturnType<typeof getGeraeteList>> | null = null;
  let loadError: string | null = null;
  try {
    result = await getGeraeteList(currentFirmaId, { status: params.status, suche: params.suche, seite });
  } catch {
    loadError = "Die Gerätedaten konnten nicht geladen werden.";
  }

  const totalPages = result ? Math.ceil(result.total / result.pageSize) : 0;

  return (
    <div>
      <AppHeader firmaName={firma?.name ?? "Ihre Firma"} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Geräte-Übersicht</h1>
        </div>

        {loadError ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">{loadError}</p>
              <Link
                href="/uebersicht"
                className="text-sm font-medium text-primary underline"
              >
                Erneut versuchen
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <GeraeteFilterBar statusOptions={result!.statusOptions} />

            {result!.total === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  {params.suche || params.status
                    ? `Keine Ergebnisse${params.suche ? ` für "${params.suche}"` : ""}.`
                    : "Für Ihre Firma sind noch keine Geräte hinterlegt. Bei Fragen kontaktieren Sie OBSI Hofer GmbH."}
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Gerät</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Lagerort</TableHead>
                          <TableHead>Letzte Prüfung</TableHead>
                          {zusatzspalten.map((spalte) => (
                            <TableHead key={spalte.key}>{spalte.label}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result!.items.map((geraet) => (
                          <TableRow key={geraet.id}>
                            <TableCell>
                              <Link
                                href={`/uebersicht/geraete/${geraet.id}`}
                                className="font-medium text-primary underline-offset-2 hover:underline"
                              >
                                {formatArtikelInfo(geraet)}
                              </Link>
                            </TableCell>
                            <TableCell>
                              {geraet.status ? (
                                <Badge variant={getStatusBadgeVariant(geraet.status)}>
                                  {geraet.status}
                                </Badge>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>{geraet.lagerort ?? "—"}</TableCell>
                            <TableCell>{formatDatum(geraet.letztePruefung)}</TableCell>
                            {zusatzspalten.map((spalte) => (
                              <TableCell key={spalte.key}>{spalte.getValue(geraet) ?? "—"}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {totalPages > 1 && (
                  <Pagination className="mt-4">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href={
                            seite > 1
                              ? `?${new URLSearchParams({ ...params, seite: String(seite - 1) }).toString()}`
                              : undefined
                          }
                          aria-disabled={seite <= 1}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <PaginationItem key={p}>
                          <PaginationLink
                            href={`?${new URLSearchParams({ ...params, seite: String(p) }).toString()}`}
                            isActive={p === seite}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          href={
                            seite < totalPages
                              ? `?${new URLSearchParams({ ...params, seite: String(seite + 1) }).toString()}`
                              : undefined
                          }
                          aria-disabled={seite >= totalPages}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
