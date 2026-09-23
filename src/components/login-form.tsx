"use client";

import { useState, useSyncExternalStore, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { requestLoginCode, verifyLoginCode } from "@/app/login/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Step = "email" | "code";

// WebAuthn-Unterstützung ändert sich nie während einer Sitzung, daher
// braucht subscribe() keine echte Subscription — trotzdem
// useSyncExternalStore statt useState+useEffect, damit der Server-Snapshot
// (false, `window` existiert dort nicht) sauber vom Client-Snapshot
// getrennt bleibt und kein Hydration-Mismatch entsteht.
function subscribeNoop() {
  return () => {};
}
function getPasskeySupportSnapshot() {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}
function getPasskeySupportServerSnapshot() {
  return false;
}

export function LoginForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const passkeySupported = useSyncExternalStore(
    subscribeNoop,
    getPasskeySupportSnapshot,
    getPasskeySupportServerSnapshot
  );
  const [passkeyPending, setPasskeyPending] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  async function handlePasskeyLogin() {
    setPasskeyError(null);
    setPasskeyPending(true);

    const supabase = createSupabaseBrowserClient();
    const { error: passkeyLoginError } = await supabase.auth.signInWithPasskey();

    if (passkeyLoginError) {
      setPasskeyPending(false);
      setPasskeyError("Passkey-Anmeldung fehlgeschlagen oder abgebrochen. Bitte erneut versuchen.");
      return;
    }

    // Best-effort Login-Zählung (PROJ-11-Nachtrag) — ein Fehler hier darf die
    // eigentliche Anmeldung/Weiterleitung nie verhindern, deshalb bewusst
    // ohne Fehlerbehandlung, die den Nutzer betrifft.
    try {
      await fetch("/api/auth/log-login", { method: "POST" });
    } catch {
      // bewusst ignoriert, siehe oben
    }

    // Volle Navigation statt Client-Router: (protected)/layout.tsx prüft die
    // Sitzung serverseitig (getPortalAccess -> ggf. Kein Zugang) und
    // /dashboard leitet bei mehreren Firmen selbst zur Firmen-Auswahl um
    // (getCurrentFirmaId) — exakt dieselbe Weiterleitungslogik wie beim
    // E-Mail+Code-Login in verifyLoginCode.
    window.location.assign("/dashboard");
  }

  function handleRequestCode(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await requestLoginCode(email);
      if (result.error) {
        setError(result.error);
        return;
      }
      setStep("code");
    });
  }

  function handleVerifyCode(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (code.length !== 6) {
      setError("Bitte den vollständigen 6-stelligen Code eingeben.");
      return;
    }
    startTransition(async () => {
      // Bei Erfolg redirectet verifyLoginCode serverseitig (wirft NEXT_REDIRECT,
      // kein return danach) — ein error-Ergebnis heisst also immer "ungültig".
      const result = await verifyLoginCode(email, code);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  function handleUseDifferentEmail() {
    setStep("email");
    setEmail("");
    setCode("");
    setError(null);
  }

  if (step === "email") {
    return (
      <div className="flex flex-col gap-4">
        {passkeySupported && (
          <>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handlePasskeyLogin}
              disabled={passkeyPending}
            >
              {passkeyPending ? "Wird geprüft…" : "Mit Passkey anmelden"}
            </Button>
            {passkeyError && <p className="text-sm text-destructive">{passkeyError}</p>}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              oder
              <div className="h-px flex-1 bg-border" />
            </div>
          </>
        )}
        <form onSubmit={handleRequestCode} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-Mail-Adresse</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@firma.ch"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Code wird gesendet…" : "Code anfordern"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Wir haben einen 6-stelligen Code an{" "}
        <span className="font-medium text-foreground">{email}</span>{" "}
        gesendet.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="code">Code</Label>
        <InputOTP id="code" maxLength={6} value={code} onChange={setCode}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Wird geprüft…" : "Anmelden"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={handleUseDifferentEmail}
      >
        Andere E-Mail-Adresse verwenden
      </Button>
    </form>
  );
}
