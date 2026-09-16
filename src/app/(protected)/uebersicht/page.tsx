import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import { getFirmenNamen } from "@/lib/auth/access";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SELECTED_FIRMA_COOKIE = "obsi_selected_firma";

// Temporary landing page for a resolved session (Firma selected, or the
// only one the Kontakt has). Replaced by the real device overview in
// PROJ-3 — this just proves the PROJ-2 login flow reaches a concrete
// destination end to end.
export default async function UebersichtPage() {
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

  return (
    <div>
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Angemeldet</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Sie sind angemeldet für <strong>{firma?.name ?? "Ihre Firma"}</strong>. Die
            Geräte-Übersicht folgt in Kürze.
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
