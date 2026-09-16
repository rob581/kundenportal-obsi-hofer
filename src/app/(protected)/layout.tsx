import { redirect } from "next/navigation";
import { auth } from "../../../auth";

// Runs in the Node.js runtime (unlike middleware.ts), so it can safely
// call the full auth() config including the Supabase Kontakt/Relation
// lookup. This is the real "does this customer have access" gate.
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }
  if (!session.portal?.hasAccess) {
    redirect("/kein-zugang");
  }

  return <>{children}</>;
}
