import NextAuth, { type Session } from "next-auth";
import authConfig from "./auth.config";
import { getPortalAccess } from "@/lib/auth/access";

declare module "next-auth" {
  interface Session {
    portal: {
      hasAccess: boolean;
      contactId: string | null;
      firmaIds: string[];
    };
  }
}

// Full config, Node.js runtime only — used by the NextAuth API route,
// Server Components/Actions, and layouts. NOT used by middleware.ts (see
// auth.config.ts for the edge-safe subset — Supabase calls below aren't
// Edge Runtime compatible).
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    // Sign-in always succeeds at the Entra level — the actual "does this
    // customer have access" check happens separately below, enforced by
    // the (protected) layout, so every unknown/inactive email still gets
    // the same generic "Kein Zugang" page rather than a raw OAuth error.
    async jwt({ token, profile }) {
      // Only re-run the Kontakt/Relation lookup right after sign-in
      // (profile is only present on that first call) — per spec, access
      // is otherwise re-checked on next login, not mid-session.
      if (profile?.email) {
        const access = await getPortalAccess(profile.email);
        token.portal = access
          ? { hasAccess: true, contactId: access.contactId, firmaIds: access.firmaIds }
          : { hasAccess: false, contactId: null, firmaIds: [] };
      }
      return token;
    },
    async session({ session, token }) {
      session.portal = (token.portal as Session["portal"]) ?? {
        hasAccess: false,
        contactId: null,
        firmaIds: [],
      };
      return session;
    },
  },
});
