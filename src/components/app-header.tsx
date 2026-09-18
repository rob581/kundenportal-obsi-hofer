import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOutEverywhere } from "@/lib/auth/sign-out";

export function AppHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 sm:px-6">
      <div className="flex items-center gap-6">
        <span className="font-semibold">OBSI Hofer GmbH — Kundenportal</span>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/uebersicht" className="text-muted-foreground hover:text-foreground">
            Übersicht
          </Link>
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
            Dashboard
          </Link>
        </nav>
      </div>
      <form action={signOutEverywhere}>
        <Button type="submit" variant="outline" size="sm">
          Abmelden
        </Button>
      </form>
    </header>
  );
}
