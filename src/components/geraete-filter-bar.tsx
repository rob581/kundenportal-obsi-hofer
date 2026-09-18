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

export function GeraeteFilterBar({ statusOptions }: { statusOptions: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [suche, setSuche] = useState(searchParams.get("suche") ?? "");

  function updateParams(next: { status?: string; suche?: string }) {
    const params = new URLSearchParams(searchParams.toString());
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
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
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
          placeholder="Suche nach Seriennummer, Barcode oder Lagerort…"
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
