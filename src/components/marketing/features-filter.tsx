"use client";

import { useState, useMemo } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FeatureItem {
  id: string;
  title: string;
  category: "booking" | "operations" | "staff" | "crm" | "roadmap";
  status: "live" | "in-development" | "planned";
  target: "customer" | "owner" | "both";
  tagline: string;
  description: string;
  highlights: string[];
}

const categoryLabels: Record<FeatureItem["category"], string> = {
  booking: "Booking PWA",
  operations: "Front Desk",
  staff: "Team & Roster",
  crm: "Client CRM",
  roadmap: "Upcoming",
};

const featuresData: FeatureItem[] = [
  // Live: Customer Experience & Booking
  {
    id: "pwa-booking",
    title: "Dedicated Salon Booking PWA",
    category: "booking",
    status: "live",
    target: "both",
    tagline: "Your brand, your custom link, zero friction.",
    description:
      "Every salon gets a personalized URL slug (e.g. bookmi.in/glam-salon). Clients open the link directly from your Instagram bio, Google Maps, or WhatsApp without needing to download any app from the Play Store or App Store.",
    highlights: [
      "Custom salon URL slug",
      "Mobile-first PWA, installable to home screen",
      "Fast 24/7 self-service booking",
    ],
  },
  {
    id: "multi-service",
    title: "Multi-Service Selection Cart",
    category: "booking",
    status: "live",
    target: "customer",
    tagline: "Clients can bundle haircut, spa, and beard care in one go.",
    description:
      "Gone are the days where clients had to book multiple appointments for different treatments. BookMi dynamically calculates total service duration, checks available staff, and tallies pricing in ₹ INR automatically.",
    highlights: [
      "Dynamic duration & pricing sum",
      "Junction table multi-service architecture",
      "Clear itemized service breakdown",
    ],
  },
  {
    id: "otp-auth",
    title: "Frictionless Phone + OTP Sign-In",
    category: "booking",
    status: "live",
    target: "customer",
    tagline: "Zero passwords. Sign in with a phone number in 5 seconds.",
    description:
      "Customers don't want to remember passwords for booking a haircut. We verify customer identities securely via SMS OTP, storing secure encrypted session cookies for effortless future visits.",
    highlights: [
      "100% password-free client onboarding",
      "Secure JWT session management",
      "Reduced drop-off rate during checkout",
    ],
  },
  {
    id: "stylist-choice",
    title: "Staff & Specialist Selection",
    category: "booking",
    status: "live",
    target: "customer",
    tagline: "Let loyal clients choose their favorite stylist.",
    description:
      "Clients can request their regular stylist or select 'Any Available' for the earliest open time slot. BookMi handles the schedule math seamlessly in the background.",
    highlights: [
      "Individual stylist preference",
      "'Any Staff' slot optimization",
      "Real-time availability filtering",
    ],
  },
  {
    id: "client-history",
    title: "Customer Self-Service Portal",
    category: "booking",
    status: "live",
    target: "customer",
    tagline: "Clients can check tokens, times, and past services anytime.",
    description:
      "Customers can access their personal booking history page at any time to review upcoming appointments, check live status, or see past services without having to message or call the reception.",
    highlights: [
      "Live token card & queue status",
      "Historical visit records",
      "Frees up receptionist phone lines",
    ],
  },

  // Live: Calendar & Salon Operations
  {
    id: "conflict-guard",
    title: "Conflict & Double-Booking Guard",
    category: "operations",
    status: "live",
    target: "owner",
    tagline: "Mathematical certainty against scheduling overlaps.",
    description:
      "Our specialized availability engine continuously checks stylist rosters, existing appointments, and duration buffers to guarantee that two clients are never scheduled with the same stylist simultaneously.",
    highlights: [
      "Automated overlap prevention",
      "Buffers for multi-service appointments",
      "Real-time slot lock during booking",
    ],
  },
  {
    id: "calendar-views",
    title: "Multi-View Calendar & Timeline",
    category: "operations",
    status: "live",
    target: "owner",
    tagline: "Complete oversight across day, week, and month views.",
    description:
      "A fast, modern calendar tailored specifically for appointment heavy businesses. View every chair, stylist, and time slot clearly with color-coded appointment statuses.",
    highlights: [
      "Day, week, and month calendar timelines",
      "Color-coded statuses (Scheduled, In-Progress, Completed)",
      "High-density desktop & responsive mobile view",
    ],
  },
  {
    id: "walkin-booking",
    title: "Reception & Walk-In Quick Entry",
    category: "operations",
    status: "live",
    target: "owner",
    tagline: "Book offline walk-in customers in under 15 seconds.",
    description:
      "Not every customer books online. Front-desk staff can punch in walk-ins with smart time inputs, custom stylist selection, and instant slot validation so all appointments stay in one single system.",
    highlights: [
      "Smart time input helper",
      "Quick client name & phone lookup",
      "Accurate total salon capacity tracking",
    ],
  },
  {
    id: "ist-timezone",
    title: "Precision IST Timezone Handling",
    category: "operations",
    status: "live",
    target: "both",
    tagline: "Engineered specifically for Indian service businesses.",
    description:
      "All slot computation, business opening hours, and calendar boundaries operate strictly on Indian Standard Time (UTC+5:30), eliminating the frustrating timezone offsets found in foreign software.",
    highlights: [
      "Native IST slot generation",
      "Accurate day-boundary rollover",
      "Formatted local times (e.g. 02:30 PM)",
    ],
  },

  // Live: Staff & Salon Management
  {
    id: "staff-roster",
    title: "Staff Rosters & Working Hours",
    category: "staff",
    status: "live",
    target: "owner",
    tagline: "Configure shifts, working hours, and specialist skills.",
    description:
      "Manage multiple team members with individual weekly working hours, active statuses, and service specializations. Keep part-time and full-time stylists scheduled accurately.",
    highlights: [
      "Custom working hours per staff member",
      "Skill & service category assignment",
      "One-click active/leave toggle",
    ],
  },
  {
    id: "client-crm",
    title: "Client Directory & Visit CRM",
    category: "crm",
    status: "live",
    target: "owner",
    tagline: "Turn first-time visitors into loyal regulars.",
    description:
      "Keep track of client contact details, lifetime visits, preferred stylists, and appointment history. Know exactly who is sitting in your salon chair before they even speak.",
    highlights: [
      "Instant client search by phone or name",
      "Complete historical service records",
      "Personalized customer relationship building",
    ],
  },

  // Future / Roadmap Capabilities
  {
    id: "whatsapp-reminders",
    title: "Automated WhatsApp & SMS Reminders",
    category: "roadmap",
    status: "in-development",
    target: "both",
    tagline: "Cut salon no-shows by up to 80% automatically.",
    description:
      "Send automatic booking confirmation messages and 2-hour reminders straight to the customer's WhatsApp. Allow clients to confirm or reschedule with a single tap.",
    highlights: [
      "Zero manual typing for salon staff",
      "2-hour & 24-hour reminder triggers",
      "Direct WhatsApp message with directions & token",
    ],
  },
  {
    id: "upi-payments",
    title: "UPI & Advance Token Deposits",
    category: "roadmap",
    status: "planned",
    target: "both",
    tagline: "Collect advance booking tokens via GPay, PhonePe & Paytm.",
    description:
      "Stop losing money on weekend no-shows. Require clients to pay a small advance token (e.g. ₹100) or full payment via UPI QR codes, cards, or netbanking before their slot is reserved.",
    highlights: [
      "Instant UPI payments & QR codes",
      "Custom advance deposit amount per service",
      "Automatic refund or salon credit for timely cancellations",
    ],
  },
  {
    id: "business-analytics",
    title: "Revenue & Peak-Hour Analytics",
    category: "roadmap",
    status: "planned",
    target: "owner",
    tagline: "Data-driven insights to grow your salon's bottom line.",
    description:
      "Visualize your highest-earning services, busiest days and hours, client retention percentages, and individual stylist commission reports in beautiful visual charts.",
    highlights: [
      "Daily, weekly, and monthly revenue trends",
      "Occupancy heatmaps & peak hour identification",
      "Staff performance & service popularity breakdown",
    ],
  },
  {
    id: "product-inventory",
    title: "Retail Product Inventory & POS",
    category: "roadmap",
    status: "planned",
    target: "owner",
    tagline: "Sell shampoos, waxes, and treatments at checkout.",
    description:
      "Combine service appointments and retail product sales into a single invoice. Track stock levels, get alerts when serums or kits run low, and boost retail margins.",
    highlights: [
      "Unified service + product billing",
      "Low-stock alerts & product catalog",
      "Digital WhatsApp invoice generation",
    ],
  },
  {
    id: "loyalty-packages",
    title: "Loyalty Points & Service Packages",
    category: "roadmap",
    status: "planned",
    target: "both",
    tagline: "Reward regular customers and sell prepaid packages.",
    description:
      "Offer packages like 'Buy 5 Haircuts, Get 1 Free' or reward clients with loyalty points redeemable for styling upgrades. Drive recurring revenue and long-term salon loyalty.",
    highlights: [
      "Prepaid treatment bundles & passes",
      "Points on every rupee spent",
      "Festive promotional coupon codes",
    ],
  },
  {
    id: "multi-branch",
    title: "Multi-Branch & Chain Management",
    category: "roadmap",
    status: "planned",
    target: "owner",
    tagline: "Oversee multiple salon outlets from one master dashboard.",
    description:
      "Operating 2 or more locations? Switch between outlets instantly, view combined financial reports, and transfer staff between branches while keeping local calendars separated.",
    highlights: [
      "Single owner sign-in for all branches",
      "Consolidated chain revenue overview",
      "Location-specific services and staff pricing",
    ],
  },
];

type FilterTab = "all" | "live" | "roadmap" | "booking" | "operations";

function FeatureCard({ feature }: { feature: FeatureItem }) {
  const isLive = feature.status === "live";
  const isInDev = feature.status === "in-development";

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs transition-all duration-300 hover:shadow-md",
        isLive
          ? "border-border hover:border-primary/50"
          : "border-dashed border-border/80 bg-card/60 hover:border-primary/40"
      )}
    >
      <div>
        {/* Header Row: Category Tag + Status Badge */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            {categoryLabels[feature.category]}
          </span>

          <div>
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Live
              </span>
            ) : isInDev ? (
              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                In Progress
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                Planned
              </span>
            )}
          </div>
        </div>

        {/* Always-Visible: Heading & Subheading */}
        <div className="mt-3">
          <h3 className="font-heading text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
            {feature.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {feature.tagline}
          </p>
        </div>
      </div>

      {/* Expandable Section: Triggers purely on hover */}
      <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-in-out group-hover:grid-rows-[1fr]">
        <div className="overflow-hidden opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="mt-4 border-t pt-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {feature.description}
            </p>

            <ul className="mt-3 space-y-1.5">
              {feature.highlights.map((h, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-foreground/85"
                >
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeaturesFilter() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFeatures = useMemo(() => {
    return featuresData.filter((feature) => {
      // Tab filter
      if (activeTab === "live" && feature.status !== "live") return false;
      if (
        activeTab === "roadmap" &&
        feature.status !== "in-development" &&
        feature.status !== "planned"
      )
        return false;
      if (activeTab === "booking" && feature.category !== "booking") return false;
      if (
        activeTab === "operations" &&
        feature.category !== "operations" &&
        feature.category !== "staff" &&
        feature.category !== "crm"
      )
        return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = feature.title.toLowerCase().includes(query);
        const matchesDesc = feature.description.toLowerCase().includes(query);
        const matchesTagline = feature.tagline.toLowerCase().includes(query);
        const matchesHighlights = feature.highlights.some((h) =>
          h.toLowerCase().includes(query)
        );
        return matchesTitle || matchesDesc || matchesTagline || matchesHighlights;
      }

      return true;
    });
  }, [activeTab, searchQuery]);

  const liveCount = featuresData.filter((f) => f.status === "live").length;
  const roadmapCount = featuresData.filter(
    (f) => f.status === "in-development" || f.status === "planned"
  ).length;

  return (
    <div>
      {/* Control Bar: Tabs + Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "cursor-pointer rounded-full px-4 py-2 text-xs font-medium transition-all sm:text-sm",
              activeTab === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            All Features ({featuresData.length})
          </button>
          <button
            onClick={() => setActiveTab("live")}
            className={cn(
              "cursor-pointer inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all sm:text-sm",
              activeTab === "live"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Now ({liveCount})
          </button>
          <button
            onClick={() => setActiveTab("roadmap")}
            className={cn(
              "cursor-pointer inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all sm:text-sm",
              activeTab === "roadmap"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            Roadmap ({roadmapCount})
          </button>
          <button
            onClick={() => setActiveTab("booking")}
            className={cn(
              "cursor-pointer rounded-full px-4 py-2 text-xs font-medium transition-all sm:text-sm",
              activeTab === "booking"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            Client Experience
          </button>
          <button
            onClick={() => setActiveTab("operations")}
            className={cn(
              "cursor-pointer rounded-full px-4 py-2 text-xs font-medium transition-all sm:text-sm",
              activeTab === "operations"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            Salon Operations
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-4 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Feature Columns: Each column moves independently on hover */}
      {/* Desktop (3 Columns) */}
      <div className="mt-8 hidden lg:grid lg:grid-cols-3 gap-4 items-start">
        <div className="flex flex-col gap-4">
          {filteredFeatures
            .filter((_, i) => i % 3 === 0)
            .map((feature) => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
        </div>
        <div className="flex flex-col gap-4">
          {filteredFeatures
            .filter((_, i) => i % 3 === 1)
            .map((feature) => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
        </div>
        <div className="flex flex-col gap-4">
          {filteredFeatures
            .filter((_, i) => i % 3 === 2)
            .map((feature) => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
        </div>
      </div>

      {/* Tablet (2 Columns) */}
      <div className="mt-8 hidden md:grid lg:hidden md:grid-cols-2 gap-4 items-start">
        <div className="flex flex-col gap-4">
          {filteredFeatures
            .filter((_, i) => i % 2 === 0)
            .map((feature) => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
        </div>
        <div className="flex flex-col gap-4">
          {filteredFeatures
            .filter((_, i) => i % 2 === 1)
            .map((feature) => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
        </div>
      </div>

      {/* Mobile (1 Column) */}
      <div className="mt-8 flex flex-col gap-4 md:hidden">
        {filteredFeatures.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} />
        ))}
      </div>

      {filteredFeatures.length === 0 && (
        <div className="mt-12 rounded-xl border border-dashed py-16 text-center">
          <SlidersHorizontal className="mx-auto size-8 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium text-foreground">
            No features found matching &quot;{searchQuery}&quot;
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting your search term or select another category tab.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setActiveTab("all");
            }}
            className="mt-4"
          >
            Reset Filters
          </Button>
        </div>
      )}
    </div>
  );
}
