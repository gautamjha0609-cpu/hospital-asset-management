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
    // Public: /login, /forgot-password, /reset-password, /api/auth/*,
    // Next internals, favicon, PWA icons/manifest/service-worker,
    // brand images, and the QR image endpoint (which needs to be
    // scannable from unauthenticated devices — e.g. printed stickers).
    "/((?!login|forgot-password|reset-password|api/auth|api/cron|_next|favicon\\.ico|favicon\\.png|manifest\\.webmanifest|sw\\.js|icons/|brand/|monitoring|assets/.*/qr).*)",
  ],
};
