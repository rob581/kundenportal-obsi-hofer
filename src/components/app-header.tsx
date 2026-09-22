import Image from "next/image";
import Link from "next/link";
import { getCurrentUserEmail } from "@/lib/auth/session";
import { getPortalAccess } from "@/lib/auth/access";
import { changeFirma } from "@/app/(protected)/firmen-auswahl/actions";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOutEverywhere } from "@/lib/auth/sign-out";
import { AppHeaderMobileMenu } from "@/components/app-header-mobile-menu";

export async function AppHeader({ firmaName }: { firmaName?: string }) {
  const email = await getCurrentUserEmail();
  const access = email ? await getPortalAccess(email) : null;
  const hatMehrereFirmen = (access?.firmaIds.length ?? 0) > 1;

  return (
    <header className="flex h-14 items-center justify-between gap-2 border-b bg-background px-4 sm:grid sm:grid-cols-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3 sm:justify-self-start">
        <Image src="/logo_small.png" alt="OBSI Hofer GmbH" width={386} height={500} className="h-9 w-auto shrink-0" priority />
        <span className="hidden text-xl font-semibold sm:inline">Kundenportal</span>
        {firmaName && (
          <span className="truncate text-sm font-medium sm:hidden">{firmaName}</span>
        )}
      </div>
      {firmaName && (
        <span className="hidden truncate text-xl font-semibold sm:block sm:justify-self-center">
          {firmaName}
        </span>
      )}
      <div className="hidden items-center gap-4 sm:flex sm:justify-self-end">
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/uebersicht" className="text-muted-foreground hover:text-foreground">
            Übersicht
          </Link>
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
            Dashboard
          </Link>
          <Link href="/sicherheit" className="text-muted-foreground hover:text-foreground">
            Sicherheit
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
        <ThemeToggle />
      </div>
      <AppHeaderMobileMenu
        firmaName={firmaName}
        hatMehrereFirmen={hatMehrereFirmen}
        changeFirma={changeFirma}
        signOutEverywhere={signOutEverywhere}
      />
    </header>
  );
}
