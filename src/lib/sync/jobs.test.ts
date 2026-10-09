import { describe, it, expect } from "vitest";
import { SYNC_JOBS } from "./jobs";

const kontakteJob = SYNC_JOBS.find((j) => j.slug === "kontakte")!;
const portalzugaengeJob = SYNC_JOBS.find((j) => j.slug === "portalzugaenge")!;

// PROJ-15: Das Häkchen bmvcc_kundenportal (PROJ-13) wird nicht mehr
// abgefragt — sonst bräche der Sync, sobald das Admin-Tool das Feld löscht.
describe("kontakte sync job (PROJ-15)", () => {
  it("no longer requests the bmvcc_kundenportal column", () => {
    expect(kontakteJob.select).not.toContain("bmvcc_kundenportal");
    expect(kontakteJob.map({ bmvcc_kontaktid: "k1", statecode: 0 })).not.toHaveProperty("ist_portal_freigegeben");
  });
});

describe("portalzugaenge sync job (PROJ-15)", () => {
  it("reads the Portalzugang table with Kontakt and Standort references", () => {
    expect(portalzugaengeJob.entitySet).toBe("bmvcc_portalzugangs");
    expect(portalzugaengeJob.select).toEqual(["bmvcc_portalzugangid", "_bmvcc_kontakt_value", "_bmvcc_standort_value"]);
  });

  it("maps a Zugang to id, kontakt_id and standort_id", () => {
    expect(
      portalzugaengeJob.map({ bmvcc_portalzugangid: "pz1", _bmvcc_kontakt_value: "k1", _bmvcc_standort_value: "s1" })
    ).toEqual({ id: "pz1", kontakt_id: "k1", standort_id: "s1" });
  });

  it("keeps an orphaned Zugang (no Kontakt) with kontakt_id null instead of failing", () => {
    expect(
      portalzugaengeJob.map({ bmvcc_portalzugangid: "pz2", _bmvcc_kontakt_value: null, _bmvcc_standort_value: "s1" })
    ).toEqual({ id: "pz2", kontakt_id: null, standort_id: "s1" });
  });
});
