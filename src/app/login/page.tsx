import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/login-form";
import { getCurrentUserEmail } from "@/lib/auth/session";
import { getPortalAccess } from "@/lib/auth/access";

export default async function LoginPage() {
  const email = await getCurrentUserEmail();
  if (email) {
    const access = await getPortalAccess(email);
    redirect(access ? "/uebersicht" : "/kein-zugang");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Kundenportal</CardTitle>
          <CardDescription>
            Melden Sie sich mit Ihrer Geschäfts-E-Mail an, um Ihre Geräte und
            Prüfberichte einzusehen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
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
