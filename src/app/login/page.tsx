"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// TODO(/backend PROJ-2): replace the router.push placeholder below with
// next-auth's signIn("microsoft-entra-id"), which redirects to the real
// hosted Entra External ID sign-in page.
export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  function handleSignIn() {
    setIsLoading(true);
    router.push("/firmen-auswahl");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Kundenportal</CardTitle>
          <CardDescription>
            Melde dich an, um deine Geräte und Prüfberichte einzusehen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSignIn} disabled={isLoading} className="w-full">
            {isLoading ? "Weiterleiten…" : "Mit Entra External ID anmelden"}
          </Button>
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
