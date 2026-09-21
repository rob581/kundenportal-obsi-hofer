import { redirect } from "next/navigation";
import { getCurrentUserEmail } from "@/lib/auth/session";
import { getPortalAccess } from "@/lib/auth/access";

// Runs in the Node.js runtime (unlike middleware.ts), so it can safely
// call the Supabase-Admin-Kontakt/Relation-Lookup. This is the real "does
// this customer have access" gate.
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const email = await getCurrentUserEmail();

  if (!email) {
    redirect("/login");
  }

  const access = await getPortalAccess(email);
  if (!access) {
    redirect("/kein-zugang");
  }

  return <>{children}</>;
}
