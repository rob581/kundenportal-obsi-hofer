"use client";

import { Button } from "@/components/ui/button";

type Firma = { id: string; name: string };

export function FirmenAuswahlList({
  firmen,
  onSelect,
}: {
  firmen: Firma[];
  onSelect: (firmaId: string) => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-2">
      {firmen.map((firma) => (
        <form key={firma.id} action={() => onSelect(firma.id)}>
          <Button type="submit" variant="outline" className="w-full justify-start">
            {firma.name}
          </Button>
        </form>
      ))}
    </div>
  );
}
