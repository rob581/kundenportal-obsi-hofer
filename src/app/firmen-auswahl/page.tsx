"use client";

import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Placeholder data — /backend PROJ-2 replaces this with the Firmen a
// Kontakt is linked to via bmvcc_relation, looked up from the verified
// Entra email. Shown only when a contact has more than one linked Firma;
// with exactly one, the user skips this page entirely.
const MOCK_FIRMEN = [
  { id: "1", name: "Muster Bau AG" },
  { id: "2", name: "Beispiel Logistik GmbH" },
];

// TODO(/backend PROJ-2): selecting a Firma must store it as the active
// company for this session and redirect to the device overview (PROJ-3).
export default function FirmenAuswahlPage() {
  function handleSelect(name: string) {
    toast(`Ausgewählt: ${name} (Geräte-Übersicht folgt in PROJ-3)`);
  }

  return (
    <div>
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="mb-1 text-xl font-semibold">Firma auswählen</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Du bist mehreren Firmen zugeordnet. Wähle aus, welche du sehen möchtest.
        </p>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deine Firmen
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {MOCK_FIRMEN.map((firma) => (
              <Button
                key={firma.id}
                variant="outline"
                className="justify-start"
                onClick={() => handleSelect(firma.name)}
              >
                {firma.name}
              </Button>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
