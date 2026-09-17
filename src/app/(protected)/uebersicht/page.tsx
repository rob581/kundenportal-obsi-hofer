import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import { getFirmenNamen } from "@/lib/auth/access";
import { getGeraeteList } from "@/lib/geraete/mock-data";
import { AppHeader } from "@/components/app-header";
import { GeraeteFilterBar } from "@/components/geraete-filter-bar";
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

const SELECTED_FIRMA_COOKIE = "obsi_selected_firma";

function formatDatum(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-CH");
}

export default async function UebersichtPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; suche?: string; seite?: string }>;
}) {
  const session = await auth();
  const firmaIds = session?.portal?.firmaIds ?? [];

  let currentFirmaId: string;
  if (firmaIds.length === 1) {
    currentFirmaId = firmaIds[0];
  } else {
    const selected = (await cookies()).get(SELECTED_FIRMA_COOKIE)?.value;
    if (!selected || !firmaIds.includes(selected)) {
      redirect("/firmen-auswahl");
    }
    currentFirmaId = selected;
  }

  const firmen = await getFirmenNamen([currentFirmaId]);
  const firma = firmen[0];

  const params = await searchParams;
  const seite = params.seite ? Number(params.seite) : 1;

  let result: Awaited<ReturnType<typeof getGeraeteList>> | null = null;
  let loadError: string | null = null;
  try {
    result = await getGeraeteList({ status: params.status, suche: params.suche, seite });
  } catch {
    loadError = "Die Gerätedaten konnten nicht geladen werden.";
  }

  const totalPages = result ? Math.ceil(result.total / result.pageSize) : 0;

  return (
    <div>
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-1 text-xl font-semibold">Geräte-Übersicht</h1>
        <p className="mb-6 text-sm text-muted-foreground">{firma?.name ?? "Ihre Firma"}</p>

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
                          <TableHead>Standort</TableHead>
                          <TableHead>Letzte Prüfung</TableHead>
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
                                {geraet.name ?? "(ohne Namen)"}
                              </Link>
                            </TableCell>
                            <TableCell>{geraet.status ?? "—"}</TableCell>
                            <TableCell>{geraet.standortName ?? "—"}</TableCell>
                            <TableCell>{formatDatum(geraet.letztePruefung)}</TableCell>
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
