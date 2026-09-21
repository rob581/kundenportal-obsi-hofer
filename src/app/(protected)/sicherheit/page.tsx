import { AppHeader } from "@/components/app-header";
import { PasskeyList } from "@/components/passkey-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SicherheitPage() {
  return (
    <div>
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="mb-1 text-xl font-semibold">Sicherheit</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Verwalten Sie Ihre Passkeys für die schnelle Anmeldung ohne E-Mail-Code.
        </p>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ihre Passkeys</CardTitle>
          </CardHeader>
          <CardContent>
            <PasskeyList />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
