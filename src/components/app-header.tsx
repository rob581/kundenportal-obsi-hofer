import { Button } from "@/components/ui/button";
import { signOutEverywhere } from "@/lib/auth/sign-out";

export function AppHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 sm:px-6">
      <span className="font-semibold">OBSI Hofer GmbH — Kundenportal</span>
      <form action={signOutEverywhere}>
        <Button type="submit" variant="outline" size="sm">
          Abmelden
        </Button>
      </form>
    </header>
  );
}
