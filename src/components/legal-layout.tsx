import React from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, FileText, Mail, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LegalSection {
  heading: string;
  body: React.ReactNode;
}

export interface LegalLayoutProps {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function LegalLayout({
  title,
  updated,
  intro,
  sections,
}: LegalLayoutProps) {
  const isTerms = title.toLowerCase().includes("terms");
  const isPrivacy = title.toLowerCase().includes("privacy");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Header */}
      <section className="relative overflow-hidden border-b bg-muted/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-muted),transparent_60%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Back to Home
            </Link>

            {/* Document Switcher */}
            <div className="inline-flex items-center rounded-lg border bg-background/80 p-1 text-xs shadow-xs backdrop-blur-xs">
              <Link
                href="/legal/terms"
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors",
                  isTerms
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FileText className="size-3.5" />
                Terms & Conditions
              </Link>
              <Link
                href="/legal/privacy"
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors",
                  isPrivacy
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ShieldCheck className="size-3.5" />
                Privacy Policy
              </Link>
            </div>
          </div>

          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Calendar className="size-3.5" />
              <span>Last updated: {updated}</span>
            </div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              {title}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {intro}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Table of Contents - Sticky Sidebar on Desktop */}
          <aside className="hidden lg:col-span-4 lg:block">
            <div className="sticky top-24 rounded-xl border bg-card/60 p-5 backdrop-blur-xs">
              <h2 className="font-heading text-xs font-semibold uppercase tracking-wider text-foreground">
                On this page
              </h2>
              <nav className="mt-4 flex flex-col gap-1.5 text-sm">
                {sections.map((section, idx) => {
                  const sectionId = slugify(section.heading);
                  const num = String(idx + 1).padStart(2, "0");
                  return (
                    <a
                      key={section.heading}
                      href={`#${sectionId}`}
                      className="group flex items-baseline gap-2 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <span className="font-mono text-xs text-muted-foreground/60 group-hover:text-primary">
                        {num}
                      </span>
                      <span className="line-clamp-1">{section.heading}</span>
                    </a>
                  );
                })}
              </nav>

              <div className="mt-6 border-t pt-5">
                <p className="text-xs text-muted-foreground leading-normal">
                  Questions about our legal policies?
                </p>
                <a
                  href={isPrivacy ? "mailto:privacy@sablemesa.in" : "mailto:hello@sablemesa.in"}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
                >
                  <Mail className="size-3.5" />
                  {isPrivacy ? "privacy@sablemesa.in" : "hello@sablemesa.in"}
                </a>
              </div>
            </div>
          </aside>

          {/* Sections List */}
          <div className="lg:col-span-8">
            <div className="space-y-12">
              {sections.map((section, idx) => {
                const sectionId = slugify(section.heading);
                const num = idx + 1;
                const hasNumberPrefix = /^\d+\./.test(section.heading);
                const displayHeading = hasNumberPrefix
                  ? section.heading
                  : `${num}. ${section.heading}`;

                return (
                  <article
                    key={section.heading}
                    id={sectionId}
                    className="scroll-mt-24 border-b pb-10 last:border-b-0"
                  >
                    <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                      {displayHeading}
                    </h2>
                    <div className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base [&>p]:mt-3 [&>p:first-child]:mt-0 [&>ul]:mt-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-1.5 [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:transition-colors [&_a:hover]:text-primary">
                      {section.body}
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Assistance banner */}
            <div className="mt-12 rounded-xl border bg-muted/40 p-6 sm:p-8">
              <h3 className="font-heading text-base font-semibold text-foreground">
                Need further assistance?
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Our support team is always available to help clarify questions regarding
                our terms, privacy standards, or data protection practices.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href="mailto:hello@sablemesa.in"
                  className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-xs hover:bg-muted transition-colors"
                >
                  <Mail className="size-3.5" />
                  General: hello@sablemesa.in
                </a>
                <a
                  href="mailto:privacy@sablemesa.in"
                  className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-xs hover:bg-muted transition-colors"
                >
                  <ShieldCheck className="size-3.5" />
                  Privacy: privacy@sablemesa.in
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
