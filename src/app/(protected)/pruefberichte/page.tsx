import Link from "next/link";
import { getFirmenNamen } from "@/lib/auth/access";
import { getCurrentFirmaId } from "@/lib/auth/current-firma";
import { getPruefberichteFuerFirma } from "@/lib/pruefberichte/queries";
import type { Zeitraum } from "@/lib/pruefberichte/types";
import { getStatusBadgeVariant } from "@/lib/status-badge";
import { AppHeader } from "@/components/app-header";
import { PruefberichteFilterBar } from "@/components/pruefberichte-filter-bar";
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

const GUELTIGE_ZEITRAEUME: Zeitraum[] = ["30", "90", "365", "alle"];

function formatDatum(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-CH");
}

export default async function PruefberichtePage({
  searchParams,
}: {
  searchParams: Promise<{ zeitraum?: string; seite?: string }>;
}) {
  const currentFirmaId = await getCurrentFirmaId();
  const firmen = await getFirmenNamen([currentFirmaId]);
  const firma = firmen[0];

  const params = await searchParams;
  const zeitraum: Zeitraum = GUELTIGE_ZEITRAEUME.includes(params.zeitraum as Zeitraum)
    ? (params.zeitraum as Zeitraum)
    : "alle";
  const seite = params.seite ? Number(params.seite) : 1;

  let result: Awaited<ReturnType<typeof getPruefberichteFuerFirma>> | null = null;
  let loadError: string | null = null;
  try {
    result = await getPruefberichteFuerFirma(currentFirmaId, { zeitraum, seite });
  } catch {
    loadError = "Die Prüfberichte konnten nicht geladen werden.";
  }

  const totalPages = result ? Math.ceil(result.total / result.pageSize) : 0;

  return (
    <div>
      <AppHeader firmaName={firma?.name ?? "Ihre Firma"} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Prüfberichte</h1>
        </div>

        {loadError ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">{loadError}</p>
              <Link href="/pruefberichte" className="text-sm font-medium text-primary underline">
                Erneut versuchen
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <PruefberichteFilterBar />

            {result!.total === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  {zeitraum !== "alle"
                    ? "Keine Prüfberichte für diesen Zeitraum."
                    : "Für Ihre Firma sind noch keine Prüfberichte hinterlegt."}
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
                          <TableHead>Datum</TableHead>
                          <TableHead>Ergebnis</TableHead>
                          <TableHead>Bemerkungen</TableHead>
                          <TableHead>Prüfer</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result!.items.map((bericht) => (
                          <TableRow key={bericht.id}>
                            <TableCell>
                              <Link
                                href={`/uebersicht/geraete/${bericht.geraetId}`}
                                className="font-medium text-primary underline-offset-2 hover:underline"
                              >
                                {bericht.geraetLabel}
                              </Link>
                            </TableCell>
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
