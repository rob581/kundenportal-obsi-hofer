import { redirect } from "next/navigation";
import { getCurrentUserEmail } from "@/lib/auth/session";
import { getPortalAccess, getFirmenNamen } from "@/lib/auth/access";
import { AppHeader } from "@/components/app-header";
import { FirmenAuswahlList } from "@/components/firmen-auswahl-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { selectFirma } from "./actions";

export default async function FirmenAuswahlPage() {
  const email = await getCurrentUserEmail();
  const access = email ? await getPortalAccess(email) : null;
  const firmaIds = access?.firmaIds ?? [];

  // Nothing to choose — the (protected) layout already guarantees at
  // least one Firma, so this only happens with exactly one.
  if (firmaIds.length <= 1) {
    redirect("/dashboard");
  }

  const firmen = await getFirmenNamen(firmaIds);

  return (
    <div>
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="mb-1 text-xl font-semibold">Firma auswählen</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Sie sind mehreren Firmen zugeordnet. Wählen Sie aus, welche Sie sehen möchten.
        </p>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ihre Firmen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FirmenAuswahlList firmen={firmen} onSelect={selectFirma} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
