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
      // External ID (CIAM) tenants need the tenant-specific ciamlogin.com
      // domain, not login.microsoftonline.com (that caused AADSTS500208
      // "domain is not a valid login domain for the account type" during
      // the token exchange step even though the initial sign-in redirect
      // worked fine). The discovery document's own "issuer" claim uses the
      // tenant ID (not the friendly tenant name) as the ciamlogin.com
      // subdomain — confirmed by fetching
      // https://<tenant>.ciamlogin.com/<tenant-id>/v2.0/.well-known/openid-configuration
      // directly — so both halves of this URL are the same tenant ID.
      issuer: `https://${process.env.Kundenportal_AZURE_TENANT_ID}.ciamlogin.com/${process.env.Kundenportal_AZURE_TENANT_ID}/v2.0`,
    }),
  ],
  session: { strategy: "jwt" },
  trustHost: true,
} satisfies NextAuthConfig;
