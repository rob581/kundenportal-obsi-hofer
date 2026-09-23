import { describe, it, expect, vi, beforeEach } from "vitest";

const getCurrentUserEmailMock = vi.fn();
const getPortalAccessMock = vi.fn();
const logLoginEventMock = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getCurrentUserEmail: () => getCurrentUserEmailMock() }));
vi.mock("@/lib/auth/access", () => ({ getPortalAccess: (email: string) => getPortalAccessMock(email) }));
vi.mock("@/lib/login-log/log-login", () => ({
  logLoginEvent: (firmaIds: string[]) => logLoginEventMock(firmaIds),
}));

import { POST } from "./route";

beforeEach(() => {
  getCurrentUserEmailMock.mockReset();
  getPortalAccessMock.mockReset();
  logLoginEventMock.mockReset();
});

describe("POST /api/auth/log-login", () => {
  it("returns 401 without a session", async () => {
    getCurrentUserEmailMock.mockResolvedValue(null);

    const res = await POST();

    expect(res.status).toBe(401);
    expect(logLoginEventMock).not.toHaveBeenCalled();
  });

  it("returns 403 without portal access", async () => {
    getCurrentUserEmailMock.mockResolvedValue("test@example.com");
    getPortalAccessMock.mockResolvedValue(null);

    const res = await POST();

    expect(res.status).toBe(403);
    expect(logLoginEventMock).not.toHaveBeenCalled();
  });

  it("logs the login event for all of the contact's Firmen on success", async () => {
    getCurrentUserEmailMock.mockResolvedValue("test@example.com");
    getPortalAccessMock.mockResolvedValue({ contactId: "k1", firmaIds: ["f1", "f2"] });

    const res = await POST();

    expect(res.status).toBe(200);
    expect(logLoginEventMock).toHaveBeenCalledWith(["f1", "f2"]);
  });
});
