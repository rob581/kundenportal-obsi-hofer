"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_LINKS = [
  { href: "/uebersicht", label: "Übersicht" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pruefberichte", label: "Prüfberichte" },
  { href: "/sicherheit", label: "Sicherheit" },
];

export function AppHeaderMobileMenu({
  firmaName,
  hatMehrereFirmen,
  changeFirma,
  signOutEverywhere,
}: {
  firmaName?: string;
  hatMehrereFirmen: boolean;
  changeFirma: () => Promise<void>;
  signOutEverywhere: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Menü öffnen" className="sm:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col gap-6">
        <SheetHeader>
          <SheetTitle>{firmaName ?? "Menü"}</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-4 text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          {hatMehrereFirmen && (
            <form action={changeFirma}>
              <Button type="submit" variant="outline" className="w-full">
                Firma wechseln
              </Button>
            </form>
          )}
          <form action={signOutEverywhere}>
            <Button type="submit" variant="outline" className="w-full">
              Abmelden
            </Button>
          </form>
          <div className="flex justify-center pt-2">
            <ThemeToggle />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
