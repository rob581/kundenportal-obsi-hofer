import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth, signIn } from "../../../auth";

export default async function LoginPage() {
  const session = await auth();
  if (session) {
    redirect(session.portal?.hasAccess ? "/uebersicht" : "/kein-zugang");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Kundenportal</CardTitle>
          <CardDescription>
            Melden Sie sich an, um Ihre Geräte und Prüfberichte einzusehen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async () => {
              "use server";
              await signIn("microsoft-entra-id");
            }}
          >
            <Button type="submit" className="w-full">
              Anmelden
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            OBSI Hofer GmbH — nur für bestehende Kunden.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
