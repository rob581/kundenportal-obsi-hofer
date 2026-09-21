import { describe, it, expect, vi, beforeEach } from "vitest";

const signInWithOtpMock = vi.fn();
const verifyOtpMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      signInWithOtp: signInWithOtpMock,
      verifyOtp: verifyOtpMock,
    },
  }),
}));

const getPortalAccessMock = vi.fn();
vi.mock("@/lib/auth/access", () => ({
  getPortalAccess: (email: string) => getPortalAccessMock(email),
}));

const redirectMock = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});
vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}));

import { requestLoginCode, verifyLoginCode } from "./actions";

beforeEach(() => {
  signInWithOtpMock.mockReset();
  verifyOtpMock.mockReset();
  getPortalAccessMock.mockReset();
  redirectMock.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("requestLoginCode", () => {
  it("returns no error when signInWithOtp succeeds", async () => {
    signInWithOtpMock.mockResolvedValue({ error: null });

    const result = await requestLoginCode("test@example.com");

    expect(result.error).toBeNull();
    expect(signInWithOtpMock).toHaveBeenCalledWith({ email: "test@example.com" });
  });

  it("returns a user-friendly error when Supabase fails", async () => {
    signInWithOtpMock.mockResolvedValue({ error: { status: 500, message: "boom" } });

    const result = await requestLoginCode("test@example.com");

    expect(result.error).toBe("Code konnte nicht gesendet werden. Bitte später erneut versuchen.");
  });
});

describe("verifyLoginCode", () => {
  it("returns an error for an invalid code, without redirecting", async () => {
    verifyOtpMock.mockResolvedValue({ error: { message: "invalid" } });

    const result = await verifyLoginCode("test@example.com", "000000");

    expect(result?.error).toBe("Der Code ist ungültig oder abgelaufen.");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects to /uebersicht when the code is valid and the contact has access", async () => {
    verifyOtpMock.mockResolvedValue({ error: null });
    getPortalAccessMock.mockResolvedValue({ contactId: "k1", firmaIds: ["f1"] });

    await expect(verifyLoginCode("test@example.com", "123456")).rejects.toThrow("NEXT_REDIRECT:/uebersicht");

    expect(redirectMock).toHaveBeenCalledWith("/uebersicht");
  });

  it("redirects to /kein-zugang when the code is valid but there is no portal access", async () => {
    verifyOtpMock.mockResolvedValue({ error: null });
    getPortalAccessMock.mockResolvedValue(null);

    await expect(verifyLoginCode("test@example.com", "123456")).rejects.toThrow("NEXT_REDIRECT:/kein-zugang");

    expect(redirectMock).toHaveBeenCalledWith("/kein-zugang");
  });
});
