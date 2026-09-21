import { createBrowserClient } from "@supabase/ssr";

// Passkey-Funktionen (registerPasskey, signInWithPasskey, passkey.list/delete)
// laufen zwingend im Browser, da die WebAuthn-Zeremonie direkten Zugriff auf
// navigator.credentials braucht — anders als der E-Mail+Code-Login aus
// PROJ-2, der komplett serverseitig über Server Actions läuft. Das
// Passkey-Feature ist bei Supabase experimentell und muss explizit
// aktiviert werden, sonst wirft jeder `auth.passkey`-Aufruf einen Fehler.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        experimental: { passkey: true },
      },
    }
  );
}
