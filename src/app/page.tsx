import { redirect } from "next/navigation";

// TODO(/backend PROJ-2): once middleware checks for a real session, this
// should redirect to /login only when unauthenticated, and to the device
// overview (PROJ-3) otherwise.
export default function Home() {
  redirect("/login");
}
