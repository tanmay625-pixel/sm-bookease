import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createClerkSupabaseClient } from '@/lib/supabase/server';
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Globe,
  CalendarDays,
  Users,
  Clock,
  Scissors,
  Sparkle,
  Building2,
  GraduationCap,
  Briefcase,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "BookMi — Appointment booking software",
  description:
    "Appointment booking software built for salons and every service business after that. Online booking, calendar management, client records, and staff scheduling.",
};

const features = [
  {
    icon: Globe,
    title: "Online booking page",
    description:
      "A shareable, mobile-friendly booking link your clients can use to book 24/7 — no app required.",
  },
  {
    icon: CalendarDays,
    title: "Calendar management",
    description:
      "See every appointment at a glance. Drag, reschedule, and track statuses across day, week, and month views.",
  },
  {
    icon: Users,
    title: "Client records",
    description:
      "Keep contact details, visit history, and notes in one place so every client feels remembered.",
  },
  {
    icon: Clock,
    title: "Staff scheduling",
    description:
      "Manage multiple staff members with individual working hours, services, and availability.",
  },
];

const targeting = [
  { icon: Scissors, label: "Salons", live: true },
  { icon: Sparkle, label: "Spas", live: true },
  { icon: Building2, label: "Beauty studios", live: true },
  { icon: Stethoscope, label: "Clinics", live: false },
  { icon: GraduationCap, label: "Coaching centers", live: false },
  { icon: Briefcase, label: "Agencies", live: false },
];

/**
 * Root page — routes authenticated users to the right place:
 * - Unauthenticated → /sign-in (handled by proxy.ts)
 * - Has a salon → /{slug}/dashboard
 * - No salon yet → /onboarding
 */
export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    const supabase = createClerkSupabaseClient();
    const { data: salonData } = await supabase
      .from('salons')
      .select('slug')
      .eq('owner_clerk_id', userId)
      .single();
    const salon = salonData as { slug: string } | null;

    if (salon) {
      redirect(`/${salon.slug}/dashboard`);
    } else {
      redirect('/onboarding');
    }
  }

  // Unauthenticated / New visitors see the full landing page
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-muted),transparent_60%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 flex items-center justify-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <CalendarCheck className="size-5" />
              </span>
              <span className="font-heading text-lg font-semibold">BookMi</span>
              <Badge variant="default">Live</Badge>
            </div>
            <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Appointment booking software built for salons — and every service
              business after that
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground leading-relaxed text-pretty sm:text-lg">
              Stop juggling phone calls, paper diaries, and missed appointments.
              BookMi gives service businesses a clean, dedicated way to take
              bookings and manage their day.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/pilot">
                  Start Free Pilot
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Targeting */}
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance">
              Built for service businesses
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              We&apos;re live for the beauty industry today and expanding into
              new verticals as we grow.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3">
            {targeting.map(({ icon: Icon, label, live }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-lg bg-card px-4 py-3 ring-1 ring-foreground/10"
              >
                <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </span>
                <span className="text-sm font-medium">{label}</span>
                <Badge
                  variant={live ? "default" : "secondary"}
                  className="ml-auto"
                >
                  {live ? "Live" : "Soon"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance">
              Everything you need to run bookings
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Focused features for the way service businesses actually work.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, description }) => (
              <Card key={title}>
                <CardHeader>
                  <span className="mb-2 flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription className="text-sm">
                    {description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button variant="outline" size="lg" asChild>
              <Link href="/features">
                See all features
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <div className="rounded-xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12">
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance">
              Start your free pilot
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/90 leading-relaxed">
              Join the pilot program on BookMi and get 4 weeks free.
            </p>
            <div className="mt-6">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/pilot">
                  Start Free Pilot
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );

}
