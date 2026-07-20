import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Public routes — not Clerk-protected:
 * - /sign-in, /sign-up      — Clerk auth pages (existing)
 * - /:slug/sign-in          — Customer phone+OTP auth
 * - /:slug/book             — Customer booking flow
 * - /:slug/history          — Customer appointment history
 * - /api/webhooks/whatsapp  — Meta webhook handshake + events
 *
 * Owner-facing /:slug/(owner)/* routes are Clerk-protected by default.
 * The "does this user own this slug" check is done inside
 * src/app/[slug]/(owner)/layout.tsx using await auth() — NOT here.
 * See: https://nextjs.org/docs/messages/middleware-upgrade-guide (CVE-2025-29927)
 */
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/:slug/sign-in(.*)",
  "/:slug/book(.*)",
  "/:slug/history(.*)",
  "/api/webhooks/whatsapp(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
