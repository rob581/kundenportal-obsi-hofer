"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type Step = "email" | "code";

export function LoginForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRequestCode(event: FormEvent) {
    event.preventDefault();
    setError(null);
    // TODO(/backend PROJ-2): supabase.auth.signInWithOtp({ email }) aufrufen.
    startTransition(() => {
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
    // TODO(/backend PROJ-2): supabase.auth.verifyOtp({ email, token: code, type: "email" })
    // aufrufen, danach Zugriffsprüfung (getPortalAccess) + Weiterleitung.
    startTransition(() => {
      setError("Anmeldung ist noch nicht angebunden (folgt bei /backend).");
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
