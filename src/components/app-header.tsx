import Image from "next/image";
import Link from "next/link";
import { auth } from "../../auth";
import { changeFirma } from "@/app/(protected)/firmen-auswahl/actions";
import { Button } from "@/components/ui/button";
import { signOutEverywhere } from "@/lib/auth/sign-out";

export async function AppHeader() {
  const session = await auth();
  const hatMehrereFirmen = (session?.portal?.firmaIds.length ?? 0) > 1;

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Image src="/logo_small.png" alt="OBSI Hofer GmbH" width={386} height={500} className="h-9 w-auto" priority />
        <span className="font-semibold">Kundenportal</span>
      </div>
      <div className="flex items-center gap-4">
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/uebersicht" className="text-muted-foreground hover:text-foreground">
            Übersicht
          </Link>
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
            Dashboard
          </Link>
        </nav>
        {hatMehrereFirmen && (
          <form action={changeFirma}>
            <Button type="submit" variant="outline" size="sm">
              Firma wechseln
            </Button>
          </form>
        )}
        <form action={signOutEverywhere}>
          <Button type="submit" variant="outline" size="sm">
            Abmelden
          </Button>
        </form>
      </div>
    </header>
  );
}
