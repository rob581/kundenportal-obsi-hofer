import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const listMock = vi.fn();
const registerPasskeyMock = vi.fn();
const deleteMock = vi.fn();
const updateMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      passkey: { list: listMock, delete: deleteMock, update: updateMock },
      registerPasskey: registerPasskeyMock,
    },
  }),
}));

import { PasskeyList } from "./passkey-list";

beforeEach(() => {
  listMock.mockReset();
  registerPasskeyMock.mockReset();
  deleteMock.mockReset();
  updateMock.mockReset();
});

describe("PasskeyList", () => {
  it("shows the empty state when the customer has no passkeys", async () => {
    listMock.mockResolvedValue({ data: [], error: null });

    render(<PasskeyList />);

    expect(await screen.findByText("Noch kein Passkey eingerichtet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Passkey hinzufügen" })).toBeInTheDocument();
  });

  it("shows an error if loading the list fails", async () => {
    listMock.mockResolvedValue({ data: null, error: { message: "boom" } });

    render(<PasskeyList />);

    expect(await screen.findByText("Passkeys konnten nicht geladen werden.")).toBeInTheDocument();
  });

  it("lists existing passkeys with their creation date", async () => {
    listMock.mockResolvedValue({
      data: [{ id: "pk1", created_at: "2026-09-21T10:00:00.000Z" }],
      error: null,
    });

    render(<PasskeyList />);

    expect(await screen.findByText("Passkey vom 21.09.2026")).toBeInTheDocument();
  });

  it("registers a new passkey and reloads the list on success", async () => {
    listMock
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [{ id: "pk1", created_at: "2026-09-21T10:00:00.000Z" }], error: null });
    registerPasskeyMock.mockResolvedValue({ data: { id: "pk1" }, error: null });

    render(<PasskeyList />);
    await screen.findByRole("button", { name: "Passkey hinzufügen" });

    fireEvent.click(screen.getByRole("button", { name: "Passkey hinzufügen" }));

    expect(await screen.findByText("Passkey vom 21.09.2026")).toBeInTheDocument();
    expect(registerPasskeyMock).toHaveBeenCalledTimes(1);
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  it("shows an error if registration is cancelled or fails, without adding an entry", async () => {
    listMock.mockResolvedValue({ data: [], error: null });
    registerPasskeyMock.mockResolvedValue({ data: null, error: { message: "cancelled" } });

    render(<PasskeyList />);
    fireEvent.click(await screen.findByRole("button", { name: "Passkey hinzufügen" }));

    expect(
      await screen.findByText("Passkey konnte nicht eingerichtet werden — abgebrochen oder Gerät nicht unterstützt.")
    ).toBeInTheDocument();
    expect(screen.getByText("Noch kein Passkey eingerichtet.")).toBeInTheDocument();
  });

  it("replaces the add button with a hint once 5 passkeys are registered", async () => {
    listMock.mockResolvedValue({
      data: Array.from({ length: 5 }, (_, i) => ({
        id: `pk${i}`,
        created_at: "2026-09-21T10:00:00.000Z",
      })),
      error: null,
    });

    render(<PasskeyList />);

    expect(
      await screen.findByText("Maximal 5 Passkeys erreicht — zuerst einen löschen, um einen neuen hinzuzufügen.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Passkey hinzufügen" })).not.toBeInTheDocument();
  });

  it("asks for confirmation before deleting, and only deletes after confirming", async () => {
    listMock
      .mockResolvedValueOnce({
        data: [{ id: "pk1", created_at: "2026-09-21T10:00:00.000Z" }],
        error: null,
      })
      .mockResolvedValueOnce({ data: [], error: null });
    deleteMock.mockResolvedValue({ data: null, error: null });

    render(<PasskeyList />);
    fireEvent.click(await screen.findByRole("button", { name: "Löschen" }));

    expect(await screen.findByText("Passkey löschen?")).toBeInTheDocument();
    expect(deleteMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));

    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith({ passkeyId: "pk1" }));
    expect(await screen.findByText("Noch kein Passkey eingerichtet.")).toBeInTheDocument();
  });

  it("shows the friendly name instead of the creation date once one is set", async () => {
    listMock.mockResolvedValue({
      data: [{ id: "pk1", created_at: "2026-09-21T10:00:00.000Z", friendly_name: "iPhone von Robert" }],
      error: null,
    });

    render(<PasskeyList />);

    expect(await screen.findByText("iPhone von Robert")).toBeInTheDocument();
    expect(screen.queryByText("Passkey vom 21.09.2026")).not.toBeInTheDocument();
  });

  it("prompts for a name right after registering a new passkey, and saves it", async () => {
    listMock
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [{ id: "pk1", created_at: "2026-09-21T10:00:00.000Z" }], error: null })
      .mockResolvedValueOnce({
        data: [{ id: "pk1", created_at: "2026-09-21T10:00:00.000Z", friendly_name: "iPhone von Robert" }],
        error: null,
      });
    registerPasskeyMock.mockResolvedValue({ data: { id: "pk1" }, error: null });
    updateMock.mockResolvedValue({ data: null, error: null });

    render(<PasskeyList />);
    fireEvent.click(await screen.findByRole("button", { name: "Passkey hinzufügen" }));

    expect(await screen.findByText("Passkey benennen")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "iPhone von Robert" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith({ passkeyId: "pk1", friendlyName: "iPhone von Robert" })
    );
    expect(await screen.findByText("iPhone von Robert")).toBeInTheDocument();
  });

  it("keeps the passkey unnamed when the naming dialog is skipped", async () => {
    listMock
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [{ id: "pk1", created_at: "2026-09-21T10:00:00.000Z" }], error: null });
    registerPasskeyMock.mockResolvedValue({ data: { id: "pk1" }, error: null });

    render(<PasskeyList />);
    fireEvent.click(await screen.findByRole("button", { name: "Passkey hinzufügen" }));

    fireEvent.click(await screen.findByRole("button", { name: "Überspringen" }));

    expect(updateMock).not.toHaveBeenCalled();
    expect(screen.queryByText("Passkey benennen")).not.toBeInTheDocument();
  });

  it("allows renaming an already existing passkey", async () => {
    listMock
      .mockResolvedValueOnce({
        data: [{ id: "pk1", created_at: "2026-09-21T10:00:00.000Z" }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ id: "pk1", created_at: "2026-09-21T10:00:00.000Z", friendly_name: "Laptop Büro" }],
        error: null,
      });
    updateMock.mockResolvedValue({ data: null, error: null });

    render(<PasskeyList />);
    fireEvent.click(await screen.findByRole("button", { name: "Umbenennen" }));

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Laptop Büro" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith({ passkeyId: "pk1", friendlyName: "Laptop Büro" })
    );
    expect(await screen.findByText("Laptop Büro")).toBeInTheDocument();
  });
});
