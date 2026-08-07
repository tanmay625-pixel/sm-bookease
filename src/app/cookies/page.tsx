import Link from "next/link";
import { Scissors, ArrowLeft, ShieldCheck, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Cookie Policy — BookEase",
  description: "Learn how BookEase uses cookies to power secure salon bookings and authentication.",
};

export default function CookiesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground transition-colors hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Scissors className="size-4" />
          </div>
          <span className="text-base font-bold tracking-tight">BookEase</span>
        </Link>
        <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
          <Link href="/">
            <ArrowLeft className="size-3.5" />
            Home
          </Link>
        </Button>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10 md:py-16">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Cookie className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Cookie Policy
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Last updated: {new Date().toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-8 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files placed on your device by websites you visit. They are widely used to ensure websites function properly, maintain secure sessions, and provide essential services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">2. Cookies We Use</h2>
            <p>
              BookEase uses strictly necessary cookies required for the platform to operate. We do not use third-party advertising or cross-site tracking cookies.
            </p>

            <div className="grid gap-3 pt-2">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-foreground font-medium text-sm">
                  <ShieldCheck className="size-4 text-primary" />
                  <span>Customer Authentication Cookie (`bookease_session`)</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  A secure, encrypted, HTTP-only session cookie created when you sign in via phone OTP. It enables you to view appointment history and book slots without re-entering your phone number on every interaction.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-foreground font-medium text-sm">
                  <ShieldCheck className="size-4 text-primary" />
                  <span>Owner Authentication Cookies (`__session`, `__client_uat`)</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Managed by Clerk for salon owners to maintain secure dashboard sessions, protect salon settings, and prevent unauthorized account access.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">3. Managing Cookies</h2>
            <p>
              You can control and delete cookies through your browser settings. However, because our cookies are strictly necessary for authentication and session management, disabling them will prevent you from signing in or managing appointments.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">4. Contact</h2>
            <p>
              If you have any questions about our use of cookies, please contact your salon administrator or reach out to the BookEase support team.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border bg-background/50 py-6 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-4">
          <span>&copy; {new Date().getFullYear()} BookEase</span>
          <span>·</span>
          <span>All rights reserved</span>
        </div>
      </footer>
    </div>
  );
}
