import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "./auth.config";

// Edge-safe: only checks whether a session exists at all. The real
// hasAccess/Firma logic needs Supabase (Node.js runtime) and lives in
// src/app/(protected)/layout.tsx instead — see auth.config.ts for why.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;

  if (nextUrl.pathname.startsWith("/api/auth")) return;
  if (nextUrl.pathname === "/login") return;

  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }
  return;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
