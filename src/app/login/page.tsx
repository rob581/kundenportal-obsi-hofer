import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/login-form";

// TODO(/backend PROJ-2): Bereits angemeldete Kunden hierher umleiten
// (auf /uebersicht bzw. /kein-zugang), sobald die Supabase-Session-Prüfung
// verdrahtet ist (ersetzt die bisherige NextAuth-`auth()`-Prüfung).
export default function LoginPage() {
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
