import { describe, it, expect } from "vitest";
import { getStatusBadgeVariant } from "./status-badge";

describe("getStatusBadgeVariant", () => {
  it("maps Freigabe to success, case-insensitively", () => {
    expect(getStatusBadgeVariant("Freigabe")).toBe("success");
    expect(getStatusBadgeVariant("freigabe")).toBe("success");
  });

  it("maps keine Freigabe to destructive", () => {
    expect(getStatusBadgeVariant("keine Freigabe")).toBe("destructive");
  });

  it("maps letzte Freigabe to warning, regardless of casing", () => {
    expect(getStatusBadgeVariant("letzte Freigabe")).toBe("warning");
    expect(getStatusBadgeVariant("Letzte Freigabe")).toBe("warning");
  });

  it("falls back to secondary for null or unrecognized values", () => {
    expect(getStatusBadgeVariant(null)).toBe("secondary");
    expect(getStatusBadgeVariant("etwas anderes")).toBe("secondary");
  });
});
