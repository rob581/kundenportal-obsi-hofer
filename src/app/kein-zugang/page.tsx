import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUserEmail } from "@/lib/auth/session";
import { getPortalAccess } from "@/lib/auth/access";
import { signOutEverywhere } from "@/lib/auth/sign-out";

const SUPPORT_EMAIL = "robert.bienz@obsi-hofer.ch";

// Shown whenever the verified email doesn't map to an active Kontakt with
// at least one linked Firma — see access.ts and the spec Decision Log for
// why this stays a single generic message.
export default async function KeinZugangPage() {
  const email = await getCurrentUserEmail();
  // Don't rely on middleware alone for this (see middleware.ts QA note) —
  // without any session there's nothing meaningful to show here either.
  if (!email) {
    redirect("/login");
  }
  const access = await getPortalAccess(email);
  if (access) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Kein Zugang</CardTitle>
          <CardDescription>
            Diese E-Mail-Adresse ist uns nicht bekannt oder hat keinen aktiven Zugang.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Bitte kontaktieren Sie die OBSI Hofer GmbH, um Zugang zu erhalten:</p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-primary underline">
            {SUPPORT_EMAIL}
          </a>
        </CardContent>
        <CardFooter>
          <form action={signOutEverywhere} className="w-full">
            <Button type="submit" variant="outline" className="w-full">
              Abmelden und andere E-Mail-Adresse versuchen
            </Button>
          </form>
        </CardFooter>
      </Card>
    </main>
  );
}
