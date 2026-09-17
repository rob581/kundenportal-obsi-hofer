import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "./auth.config";

// QA finding (2026-09-17): in this project's local dev setup (Next.js
// 16.1.1 + Turbopack on Windows), middleware never actually executes —
// verified with an unconditional redirect that still had zero effect on
// any request, even after a full clean restart. It may still work once
// deployed to Vercel's real Edge Runtime (untested — revisit at
// /deploy), so this file is kept as defense-in-depth rather than
// removed. Do NOT rely on this alone: every protected page must also
// check auth() itself (see (protected)/layout.tsx and
// src/app/kein-zugang/page.tsx), which is what actually protects things
// right now.
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
