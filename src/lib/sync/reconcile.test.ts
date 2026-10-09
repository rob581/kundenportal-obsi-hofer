import { describe, it, expect } from "vitest";
import { computeMissingIds, exceedsSafetyThreshold, DELETE_SAFETY_THRESHOLD } from "./reconcile";

describe("computeMissingIds", () => {
  it("returns ids that are no longer in the fetched set", () => {
    const existing = ["a", "b", "c"];
    const fetched = new Set(["a", "c"]);
    expect(computeMissingIds(existing, fetched)).toEqual(["b"]);
  });

  it("returns an empty array when nothing is missing", () => {
    const existing = ["a", "b"];
    const fetched = new Set(["a", "b", "c"]);
    expect(computeMissingIds(existing, fetched)).toEqual([]);
  });
});

describe("exceedsSafetyThreshold", () => {
  it("is false when there were no existing rows", () => {
    expect(exceedsSafetyThreshold(0, 0)).toBe(false);
  });

  it(`is false at or below the ${DELETE_SAFETY_THRESHOLD * 100}% threshold`, () => {
    expect(exceedsSafetyThreshold(100, 20)).toBe(false);
  });

  it(`is true above the ${DELETE_SAFETY_THRESHOLD * 100}% threshold`, () => {
    expect(exceedsSafetyThreshold(100, 21)).toBe(true);
  });

  it("is true when everything disappeared", () => {
    expect(exceedsSafetyThreshold(50, 50)).toBe(true);
  });

  // PROJ-16: minimum count before the 20% rule applies.
  it("is false for small sets (up to 10 known rows), even if everything is missing", () => {
    expect(exceedsSafetyThreshold(10, 10)).toBe(false);
    expect(exceedsSafetyThreshold(2, 1)).toBe(false);
  });

  it("applies the 20% rule from 11 known rows on", () => {
    expect(exceedsSafetyThreshold(11, 3)).toBe(true);
    expect(exceedsSafetyThreshold(11, 2)).toBe(false);
  });
});

