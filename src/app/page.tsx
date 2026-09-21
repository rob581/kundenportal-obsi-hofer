import { redirect } from "next/navigation";

// /login itself redirects an already-authenticated visitor onward (to
// /dashboard or /kein-zugang), so this can unconditionally send everyone
// there first.
export default function Home() {
  redirect("/login");
}
