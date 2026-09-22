"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const MAX_PASSKEYS = 5;
const FRIENDLY_NAME_MAX_LENGTH = 120;

type Passkey = {
  id: string;
  created_at: string;
  friendly_name?: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function PasskeyList() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [renamePasskeyId, setRenamePasskeyId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renamePending, setRenamePending] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  async function reloadPasskeys() {
    const supabase = createSupabaseBrowserClient();
    const { data, error: listError } = await supabase.auth.passkey.list();
    if (listError) {
      setError("Passkeys konnten nicht geladen werden.");
      return;
    }
    setPasskeys(data);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await reloadPasskeys();
      if (!cancelled) setIsLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAdd() {
    setError(null);
    setIsPending(true);

    const supabase = createSupabaseBrowserClient();
    const { data, error: registerError } = await supabase.auth.registerPasskey();

    if (registerError) {
      setError("Passkey konnte nicht eingerichtet werden — abgebrochen oder Gerät nicht unterstützt.");
      setIsPending(false);
      return;
    }

    // Liste neu laden statt den neuen Eintrag selbst zusammenzubauen —
    // stellt sicher, dass wir denselben Datenstand wie Supabase zeigen.
    await reloadPasskeys();
    setIsPending(false);

    // Direkt nach dem Einrichten nach einem Namen fragen (z.B. "iPhone von
    // Robert") — WebAuthn gibt uns selbst keinen Gerätenamen, das Feld bleibt
    // sonst dauerhaft nur mit dem Erstellungsdatum beschriftet.
    if (data?.id) {
      openRenameDialog({ id: data.id, created_at: new Date().toISOString() });
    }
  }

  function openRenameDialog(passkey: Passkey) {
    setRenameError(null);
    setRenameValue(passkey.friendly_name ?? "");
    setRenamePasskeyId(passkey.id);
  }

  async function handleRenameSave() {
    if (!renamePasskeyId) return;
    setRenameError(null);
    setRenamePending(true);

    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.passkey.update({
      passkeyId: renamePasskeyId,
      friendlyName: renameValue.trim(),
    });

    if (updateError) {
      setRenameError("Name konnte nicht gespeichert werden.");
      setRenamePending(false);
      return;
    }

    await reloadPasskeys();
    setRenamePending(false);
    setRenamePasskeyId(null);
  }

  async function handleDelete(id: string) {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: deleteError } = await supabase.auth.passkey.delete({ passkeyId: id });

    if (deleteError) {
      setError("Passkey konnte nicht gelöscht werden.");
      return;
    }
    await reloadPasskeys();
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Wird geladen…</p>;
  }

  const limitReached = passkeys.length >= MAX_PASSKEYS;

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {passkeys.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch kein Passkey eingerichtet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {passkeys.map((passkey) => (
            <Card key={passkey.id}>
              <CardContent className="flex items-center justify-between gap-2 py-3">
                <span className="truncate text-sm">
                  {passkey.friendly_name || `Passkey vom ${formatDate(passkey.created_at)}`}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openRenameDialog(passkey)}
                  >
                    Umbenennen
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        Löschen
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Passkey löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Mit diesem Passkey können Sie sich danach nicht mehr anmelden. Die Anmeldung per
                          E-Mail und Code bleibt weiterhin möglich.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(passkey.id)}>Löschen</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {limitReached ? (
        <p className="text-sm text-muted-foreground">
          Maximal 5 Passkeys erreicht — zuerst einen löschen, um einen neuen hinzuzufügen.
        </p>
      ) : (
        <Button type="button" onClick={handleAdd} disabled={isPending}>
          {isPending ? "Wird eingerichtet…" : "Passkey hinzufügen"}
        </Button>
      )}

      <Dialog open={renamePasskeyId !== null} onOpenChange={(open) => !open && setRenamePasskeyId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Passkey benennen</DialogTitle>
            <DialogDescription>
              Vergeben Sie einen Namen, z.B. das Gerät, von dem dieser Passkey stammt (z.B. &quot;iPhone&quot; oder
              &quot;Laptop Büro&quot;).
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="passkey-name">Name</Label>
            <Input
              id="passkey-name"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              maxLength={FRIENDLY_NAME_MAX_LENGTH}
              placeholder="z.B. iPhone von Robert"
            />
          </div>
          {renameError && <p className="text-sm text-destructive">{renameError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRenamePasskeyId(null)}>
              Überspringen
            </Button>
            <Button type="button" onClick={handleRenameSave} disabled={renamePending}>
              {renamePending ? "Wird gespeichert…" : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
