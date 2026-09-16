"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// TODO(/backend PROJ-2): replace onClick with next-auth's signOut(), which
// clears the real session before redirecting to /login.
export function AppHeader() {
  const router = useRouter();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 sm:px-6">
      <span className="font-semibold">OBSI Hofer AG — Kundenportal</span>
      <Button variant="outline" size="sm" onClick={() => router.push("/login")}>
        Abmelden
      </Button>
    </header>
  );
}
