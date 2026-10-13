import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FeaturesFilter from "@/components/marketing/features-filter";

export const metadata: Metadata = {
  title: "Features — BookMi Appointment Booking Software",
  description:
    "Explore the complete BookMi feature suite: frictionless mobile PWA bookings, multi-service cart, conflict-free staff calendars, and our upcoming WhatsApp automation.",
};

const comparisonData = [
  {
    feature: "Customer Booking Method",
    bookmi: "Direct link / PWA (No app download required)",
    paper: "Phone calls & WhatsApp back-and-forth",
    legacy: "Forced heavy app download or slow portal",
  },
  {
    feature: "Multi-Service Appointments",
    bookmi: "Dynamic cart with combined duration & ₹ INR total",
    paper: "Manual duration guessing & paper calculation",
    legacy: "Clunky single-service multi-step forms",
  },
  {
    feature: "Double-Booking Prevention",
    bookmi: "Automated real-time availability guard",
    paper: "High risk of human error & chair overlap",
    legacy: "Complex rule setup required",
  },
  {
    feature: "Customer Sign-In",
    bookmi: "Instant Phone + SMS OTP (Password-free)",
    paper: "None (Manual diary entry)",
    legacy: "Email + password with forgotten password loops",
  },
  {
    feature: "Timezone & Currency",
    bookmi: "Native Indian Standard Time (IST) & Rupee (₹)",
    paper: "Manual",
    legacy: "US/EU timezone offsets & dollar conversions",
  },
  {
    feature: "WhatsApp & SMS Reminders",
    bookmi: "Automated confirmation & 2-hr reminder (Roadmap)",
    paper: "Manual messaging if staff remembers",
    legacy: "High-cost add-on SMS credits",
  },
  {
    feature: "Pilot Program & Setup",
    bookmi: "4-week free pilot, setup in 5 minutes",
    paper: "Immediate but chaotic",
    legacy: "Expensive setup fee & lengthy sales demos",
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-muted/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-muted),transparent_60%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background/80 px-3.5 py-1 text-xs font-medium shadow-xs backdrop-blur-xs">
              <span className="size-1.5 rounded-full bg-primary" />
              <span>Features & Product Suite</span>
              <span className="text-muted-foreground">&middot;</span>
              <span className="text-primary font-semibold">Live + Roadmap</span>
            </div>

            <h1 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
              Everything you need to run appointments effortlessly
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Say goodbye to messy paper registers and double-booked chairs.
              BookMi gives service businesses a clean, modern way to take client
              bookings, coordinate staff, and grow salon revenue.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/pilot">
                  Start 4-Week Free Pilot
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/pricing">View Pricing Plans</Link>
              </Button>
            </div>

            {/* Quick Stat Badges */}
            <div className="mt-12 grid grid-cols-2 gap-4 border-t pt-8 sm:grid-cols-4">
              <div className="text-center">
                <p className="font-heading text-2xl font-bold text-foreground">
                  0%
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  App Download Needed
                </p>
              </div>
              <div className="text-center">
                <p className="font-heading text-2xl font-bold text-foreground">
                  5 Sec
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Phone + OTP Sign-in
                </p>
              </div>
              <div className="text-center">
                <p className="font-heading text-2xl font-bold text-foreground">
                  100%
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  IST Timezone Accuracy
                </p>
              </div>
              <div className="text-center">
                <p className="font-heading text-2xl font-bold text-foreground">
                  4 Weeks
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Free Zero-Risk Pilot
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Feature Catalog */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mb-10 text-center sm:text-left">
          <Badge variant="outline" className="mb-2">
            Interactive Catalog
          </Badge>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Explore features built for now and tomorrow
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Filter between what is live today in BookMi and what is actively in
            development on our product roadmap.
          </p>
        </div>

        <FeaturesFilter />
      </section>

      {/* Comparison Section */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-2">
              The Difference
            </Badge>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Why salons choose BookMi
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Compare how BookMi stacks up against old-school registers and
              bloated enterprise software.
            </p>
          </div>

          <div className="mt-12 overflow-hidden rounded-xl border bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-muted/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-4 px-6">Capability</th>
                    <th className="py-4 px-6 text-primary font-bold bg-primary/5">
                      BookMi
                    </th>
                    <th className="py-4 px-6">Paper / Phone Calls</th>
                    <th className="py-4 px-6">Legacy Software</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-muted-foreground">
                  {comparisonData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-6 font-medium text-foreground">
                        {row.feature}
                      </td>
                      <td className="py-4 px-6 font-medium text-foreground bg-primary/5">
                        <div className="flex items-center gap-2 text-primary">
                          <CheckCircle2 className="size-4 shrink-0 text-primary" />
                          <span>{row.bookmi}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <XCircle className="size-4 shrink-0 text-muted-foreground/60" />
                          <span>{row.paper}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="size-4 shrink-0 text-muted-foreground/60" />
                          <span>{row.legacy}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Call To Action */}
      <section className="relative overflow-hidden border-t py-16 sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,var(--color-primary),transparent_70%)] opacity-10" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
            <CalendarCheck className="size-6" />
          </span>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Ready to upgrade your salon appointments?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground leading-relaxed">
            Join service businesses running smoother days, happier clients, and
            fewer missed appointments with BookMi.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/pilot">
                Start Your 4-Week Free Pilot
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/contact">Speak with Our Team</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No credit card required &middot; Setup in 5 minutes &middot; Made in India
          </p>
        </div>
      </section>
    </div>
  );
}
