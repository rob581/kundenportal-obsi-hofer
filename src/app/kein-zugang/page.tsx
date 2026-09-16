"use client";

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

const SUPPORT_EMAIL = "robert.bienz@obsi-hofer.ch";

// TODO(/backend PROJ-2): this page is shown when the verified Entra email
// doesn't match an active Kontakt (or matches one, but inaktiv). It must
// not reveal which of the two happened — see spec Decision Log.
export default function KeinZugangPage() {
  const router = useRouter();

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
          <p>Bitte kontaktiere die OBSI Hofer AG, um Zugang zu erhalten:</p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-primary underline">
            {SUPPORT_EMAIL}
          </a>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={() => router.push("/login")}>
            Abmelden und andere E-Mail-Adresse versuchen
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
