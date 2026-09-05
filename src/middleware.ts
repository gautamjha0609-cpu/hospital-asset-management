import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Protect everything except public login + auth endpoints + static assets.
export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role;
    // Admin-only areas
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.set("forbidden", "1");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: [
    // Protect all app routes except public ones and Next internals.
    "/((?!login|api/auth|_next|favicon.ico|assets/.*/qr).*)",
  ],
};
