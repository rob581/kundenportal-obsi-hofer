"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signOut } from "../../../auth";

// Plain signOut() only clears OUR session cookie — the Entra External ID
// tenant keeps its own "stay signed in?" session, so the next login
// attempt silently reuses the last account/email instead of letting the
// user pick a different one. RP-initiated logout (redirecting to the
// tenant's own end_session_endpoint afterwards) clears that too.
export async function signOutEverywhere(): Promise<void> {
  await signOut({ redirect: false });

  const tenantId = process.env.Kundenportal_AZURE_TENANT_ID;
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const postLogoutRedirectUri = encodeURIComponent(`${protocol}://${host}/login`);

  redirect(
    `https://${tenantId}.ciamlogin.com/${tenantId}/oauth2/v2.0/logout?post_logout_redirect_uri=${postLogoutRedirectUri}`
  );
}
