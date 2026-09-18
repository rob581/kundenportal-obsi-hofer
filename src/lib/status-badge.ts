import type { badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

// Shared across Geräte-Status (PROJ-3) and Prüfbericht-Ergebnis (PROJ-4) —
// same case-insensitive normalization as the status-options grouping in
// src/lib/geraete/queries.ts, so a value maps to the same color everywhere
// it's shown.
export function getStatusBadgeVariant(status: string | null): BadgeVariant {
  if (!status) return "secondary";

  switch (status.trim().toLowerCase()) {
    case "freigabe":
      return "success";
    case "keine freigabe":
      return "destructive";
    case "letzte freigabe":
      return "warning";
    default:
      return "secondary";
  }
}
