import type { NextAuthConfig } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

// Edge-safe subset of the full config — no database calls here. Used only
// by middleware.ts for the coarse "is there a session at all" check.
// See auth.ts for the full config (Kontakt/Relation lookup via Supabase),
// which needs the Node.js runtime and is used everywhere else.
export default {
  providers: [
    MicrosoftEntraID({
      clientId: process.env.Kundenportal_AZURE_CLIENT_ID,
      clientSecret: process.env.Kundenportal_AZURE_CLIENT_SECRET,
      issuer: `https://login.microsoftonline.com/${process.env.Kundenportal_AZURE_TENANT_ID}/v2.0`,
    }),
  ],
  session: { strategy: "jwt" },
  trustHost: true,
} satisfies NextAuthConfig;
