"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ZEITRAUM_OPTIONEN = [
  { value: "alle", label: "Alle" },
  { value: "30", label: "Letzte 30 Tage" },
  { value: "90", label: "Letzte 90 Tage" },
  { value: "365", label: "Letzte 365 Tage" },
];

export function PruefberichteFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const zeitraum = searchParams.get("zeitraum") ?? "alle";

  function updateZeitraum(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "alle") params.delete("zeitraum");
    else params.set("zeitraum", value);
    params.delete("seite"); // Filteränderung setzt die Seite zurück
    router.push(`/pruefberichte?${params.toString()}`);
  }

  return (
    <div className="mb-4">
      <Select value={zeitraum} onValueChange={updateZeitraum}>
        <SelectTrigger className="sm:w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ZEITRAUM_OPTIONEN.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
