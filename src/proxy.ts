import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Clerk middleware now only manages authentication session cookies on incoming requests.
 * All route protection and authorization checks are handled at the resource level:
 * - Owner pages & layouts: src/app/[slug]/(owner)/layout.tsx (await auth() + ownership check)
 * - Landing & Onboarding: src/app/page.tsx & src/app/onboarding/page.tsx (await auth())
 * - Server Actions: src/app/actions/owner/*.ts (requireAuth() + Supabase RLS)
 * - Customer routes: OTP session cookies
 * - Webhooks: Signature verification
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
