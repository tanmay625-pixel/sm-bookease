import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "BookMi Pilot Program — Free 4-Week Access for Salons",
  description:
    "Join the BookMi Pilot Program. Get 4 weeks of unrestricted access to appointment booking software, hands-on support, and help shape the product for your salon.",
};

/**
 * COPY CONFIGURATION
 * All page text is isolated here so you can easily update wording,
 * pricing, or timelines without touching the layout code.
 */
const PILOT_COPY = {
  hero: {
    badge: "Early Access Program",
    headline: "Join the BookMi Pilot Program",
    subhead:
      "Get full, unrestricted access to BookMi free for 4 weeks. Run your salon appointments smoothly, experience the platform with zero risk, and help us shape the product for businesses like yours.",
    ctaButton: "Start Your Free Pilot",
  },
  whatsIncluded: {
    badge: "What's Included",
    title: "Everything you need from day one",
    description:
      "We believe a pilot only works if you get to experience the real product. No artificial gates, no feature locks.",
    items: [
      {
        title: "Full Feature Access",
        description:
          "Complete access to online PWA bookings, calendar management, multi-service cart, staff rosters, and client records with no artificial limits.",
      },
      {
        title: "4 Weeks Free",
        description:
          "Four full weeks of unrestricted usage for your salon, your team, and your clients. No upfront payment and no credit card required to start.",
      },
      {
        title: "Direct Access to the Team",
        description:
          "Direct line to our founding team for setup assistance, ongoing support, and prioritizing the features your salon needs most.",
      },
      /*
       * OPTIONAL POST-PILOT DISCOUNT PLACEHOLDER
       * Uncomment and customize below once post-pilot discount terms are decided:
       *
       * {
       *   title: "Early Supporter Discount (TBD)",
       *   description:
       *     "Special locked-in pricing for pilot salons that choose to continue with BookMi after the trial.",
       * },
       */
    ],
  },
  whoThisIsFor: {
    badge: "Who This Is For",
    title: "A good fit for where your business is today",
    description:
      "This is not a strict qualification gate or exclusive test. If any of the following describes your salon or studio, we would love to partner with you:",
    criteria: [
      {
        title: "Currently managing bookings manually",
        description:
          "You are using paper diaries, WhatsApp chats, phone calls, or memory to coordinate appointments, staff chairs, and walk-ins.",
      },
      {
        title: "Open to digital booking without long-term commitment",
        description:
          "You want to see if an easy, shareable booking link helps your clients and saves your front desk time, without locking into annual contracts.",
      },
      {
        title: "Willing to share candid feedback",
        description:
          "You are willing to share a few minutes of feedback during your pilot so we know what works well and what we should improve.",
      },
    ],
  },
  afterThePilot: {
    badge: "After The Pilot",
    title: "Transparent & straightforward: What happens after 4 weeks?",
    paragraphs: [
      "We believe in complete honesty with our partners. The pilot gives you 4 full weeks of free, unrestricted use. After the pilot period concludes, continued use of BookMi will transition to our regular subscription plan [pricing TBD].",
      "There are no surprise charges and no automatic card deductions. You will have full clarity on pricing well in advance. If you decide BookMi is not the right fit, you can export your client data and walk away with no strings attached.",
    ],
  },
  finalCta: {
    headline: "Ready to test BookMi in your salon?",
    subhead:
      "Take the first step toward simpler, organized salon appointments.",
    buttonText: "Start Your Free Pilot",
    buttonHref: "/sign-up", // Existing signup route in the codebase
    supportingLine:
      "We're personally onboarding a small group of salons. Our team will reach out directly to get you set up.",
  },
};

export default function PilotPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 1. Headline + Subhead (Hero) */}
      <section className="relative overflow-hidden border-b bg-muted/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-muted),transparent_60%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background/80 px-3.5 py-1 text-xs font-medium shadow-xs backdrop-blur-xs">
              <span className="size-1.5 rounded-full bg-primary" />
              <span>{PILOT_COPY.hero.badge}</span>
            </div>

            <h1 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
              {PILOT_COPY.hero.headline}
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {PILOT_COPY.hero.subhead}
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href={PILOT_COPY.finalCta.buttonHref}>
                  {PILOT_COPY.hero.ctaButton}
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. What's Included */}
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-2">
              {PILOT_COPY.whatsIncluded.badge}
            </Badge>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {PILOT_COPY.whatsIncluded.title}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {PILOT_COPY.whatsIncluded.description}
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {PILOT_COPY.whatsIncluded.items.map((item) => (
              <Card key={item.title} className="flex flex-col justify-between">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed text-muted-foreground mt-2">
                    {item.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Who This Is For */}
      <section className="border-b bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-2">
              {PILOT_COPY.whoThisIsFor.badge}
            </Badge>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {PILOT_COPY.whoThisIsFor.title}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {PILOT_COPY.whoThisIsFor.description}
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {PILOT_COPY.whoThisIsFor.criteria.map((item, idx) => (
              <div
                key={item.title}
                className="rounded-xl border bg-card p-6 shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {idx + 1}
                  </span>
                  <h3 className="font-heading text-base font-semibold text-foreground">
                    {item.title}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. What Happens After the Pilot */}
      <section className="border-b">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 md:py-20">
          <div className="rounded-2xl border bg-card p-6 shadow-xs sm:p-10">
            <Badge variant="outline" className="mb-3">
              {PILOT_COPY.afterThePilot.badge}
            </Badge>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {PILOT_COPY.afterThePilot.title}
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {PILOT_COPY.afterThePilot.paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-4 border-t pt-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Check className="size-4 text-primary" />
                <span>No automatic billing</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="size-4 text-primary" />
                <span>Full data ownership</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="size-4 text-primary" />
                <span>Zero cancellation friction</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Final CTA */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,var(--color-primary),transparent_70%)] opacity-10" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {PILOT_COPY.finalCta.headline}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground leading-relaxed">
            {PILOT_COPY.finalCta.subhead}
          </p>

          <div className="mt-8">
            <Button size="lg" asChild>
              <Link href={PILOT_COPY.finalCta.buttonHref}>
                {PILOT_COPY.finalCta.buttonText}
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>

          <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-muted-foreground">
            {PILOT_COPY.finalCta.supportingLine}
          </p>
        </div>
      </section>
    </div>
  );
}
