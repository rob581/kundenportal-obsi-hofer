"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const MAX_PASSKEYS = 5;

type Passkey = {
  id: string;
  created_at: string;
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
    const { error: registerError } = await supabase.auth.registerPasskey();

    if (registerError) {
      setError("Passkey konnte nicht eingerichtet werden — abgebrochen oder Gerät nicht unterstützt.");
      setIsPending(false);
      return;
    }

    // Liste neu laden statt den neuen Eintrag selbst zusammenzubauen —
    // stellt sicher, dass wir denselben Datenstand wie Supabase zeigen.
    await reloadPasskeys();
    setIsPending(false);
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
              <CardContent className="flex items-center justify-between py-3">
                <span className="text-sm">Passkey vom {formatDate(passkey.created_at)}</span>
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
    </div>
  );
}
