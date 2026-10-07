import { describe, it, expect } from "vitest";
import { SYNC_JOBS } from "./jobs";

const kontakteJob = SYNC_JOBS.find((j) => j.slug === "kontakte")!;

// PROJ-13: das Häkchen "Kundenportal" ist in Dataverse meist leer (null)
// statt false — nur ein explizites true darf als Freigabe gelten.
describe("kontakte sync job — Portal-Freigabe (PROJ-13)", () => {
  it("requests the bmvcc_kundenportal column from Dataverse", () => {
    expect(kontakteJob.select).toContain("bmvcc_kundenportal");
  });

  it("maps a set checkbox to released", () => {
    expect(kontakteJob.map({ bmvcc_kontaktid: "k1", statecode: 0, bmvcc_kundenportal: true }).ist_portal_freigegeben).toBe(true);
  });

  it("maps an unset checkbox to not released", () => {
    expect(kontakteJob.map({ bmvcc_kontaktid: "k1", statecode: 0, bmvcc_kundenportal: false }).ist_portal_freigegeben).toBe(false);
  });

  it("maps an empty (null or missing) checkbox to not released", () => {
    expect(kontakteJob.map({ bmvcc_kontaktid: "k1", statecode: 0, bmvcc_kundenportal: null }).ist_portal_freigegeben).toBe(false);
    expect(kontakteJob.map({ bmvcc_kontaktid: "k1", statecode: 0 }).ist_portal_freigegeben).toBe(false);
  });
});
