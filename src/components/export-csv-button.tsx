"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// Bewusst kein einfacher <a href>-Link: Schlägt der Export fehl, soll der
// Kunde laut Spec auf der Seite bleiben und eine Fehlermeldung sehen, statt
// zu einer Fehler-Antwort wegzunavigieren — das braucht fetch() + Blob statt
// echter Navigation.
export function ExportCsvButton({ href, disabled }: { href: string; disabled: boolean }) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setError(null);
    setIsPending(true);

    try {
      const response = await fetch(href);
      // Eine Session, die zwischen Seitenaufruf und Klick abläuft, würde
      // fetch() sonst stillschweigend zur (HTML-)Login-Seite umleiten lassen
      // (fetch folgt Redirects automatisch) — der Content-Type-Check fängt
      // das ab, statt eine HTML-Seite als ".csv" herunterzuladen.
      if (!response.ok || !response.headers.get("content-type")?.includes("text/csv")) {
        throw new Error("Export fehlgeschlagen");
      }

      const blob = await response.blob();
      const dateiname = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1];

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = dateiname ?? "geraete-uebersicht.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Export fehlgeschlagen, bitte erneut versuchen.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        className="shrink-0"
        onClick={handleExport}
        disabled={disabled || isPending}
      >
        {isPending ? "Wird exportiert…" : "Als CSV exportieren"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
