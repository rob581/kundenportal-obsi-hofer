"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_STATUS_VALUE = "__alle__";
const ALL_STANDORTE_VALUE = "__alle_standorte__";

interface GeraeteFilterBarProps {
  statusOptions: string[];
  sucheKundenId?: boolean;
  // PROJ-3 Nachtrag 2: leer = kein Standort-Filter (nur ein Standort sichtbar).
  standortOptions?: { id: string; name: string }[];
}

export function GeraeteFilterBar({ statusOptions, sucheKundenId = false, standortOptions = [] }: GeraeteFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [suche, setSuche] = useState(searchParams.get("suche") ?? "");

  function updateParams(next: { status?: string; suche?: string; standort?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.standort !== undefined) {
      if (next.standort) params.set("standort", next.standort);
      else params.delete("standort");
    }
    if (next.status !== undefined) {
      if (next.status) params.set("status", next.status);
      else params.delete("status");
    }
    if (next.suche !== undefined) {
      if (next.suche) params.set("suche", next.suche);
      else params.delete("suche");
    }
    params.delete("seite"); // any filter change resets pagination
    router.push(`/uebersicht?${params.toString()}`);
  }

  return (
    <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
      {standortOptions.length > 0 && (
        <Select
          value={searchParams.get("standort") ?? ALL_STANDORTE_VALUE}
          onValueChange={(value) =>
            updateParams({ standort: value === ALL_STANDORTE_VALUE ? "" : value })
          }
        >
          <SelectTrigger className="sm:w-56" aria-label="Standort">
            <SelectValue placeholder="Alle Standorte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STANDORTE_VALUE}>Alle Standorte</SelectItem>
            {standortOptions.map((standort) => (
              <SelectItem key={standort.id} value={standort.id}>
                {standort.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={searchParams.get("status") ?? ALL_STATUS_VALUE}
        onValueChange={(value) =>
          updateParams({ status: value === ALL_STATUS_VALUE ? "" : value })
        }
      >
        <SelectTrigger className="sm:w-56">
          <SelectValue placeholder="Alle Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_STATUS_VALUE}>Alle Status</SelectItem>
          {statusOptions.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <form
        className="flex flex-1 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          updateParams({ suche });
        }}
      >
        <Input
          placeholder={
            sucheKundenId
              ? "Suche nach Seriennummer, Barcode, Lagerort oder KundenID…"
              : "Suche nach Seriennummer, Barcode oder Lagerort…"
          }
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
        />
        <Button type="submit" variant="secondary">
          Suchen
        </Button>
      </form>
    </div>
  );
}
