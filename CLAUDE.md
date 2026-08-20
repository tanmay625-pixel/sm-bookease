# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # Turbopack dev server (service worker disabled in dev)
npm run build        # Production build (uses --webpack for Serwist SW bundling)
npm run lint         # ESLint (flat config, next/core-web-vitals + typescript)
npx tsc --noEmit     # Type-check without emitting
```

No test framework is configured.

## Architecture

**BookMi** is a multi-tenant salon appointment booking PWA. Each salon is identified by a URL slug (`/[slug]/...`). Next.js 16 App Router, Supabase (Postgres + RLS), Clerk (owner auth), Serwist (service worker/PWA).

### Dual Auth Model

Two completely separate authentication systems coexist:

- **Owner/staff** — Clerk. Protected by `clerkMiddleware` in `src/proxy.ts` (the middleware file). Authorization (does this user own this slug?) is checked in the `(owner)` layout, not the middleware.
- **Customer** — Phone + OTP, no Clerk. Session is a signed JWT cookie (`bookmi_session`) managed by `src/lib/otp.ts`. Customer routes are public to Clerk middleware; session validation happens in server actions and the `(customer)` layout.

### Route Groups Under `[slug]`

- `(owner)/` — dashboard, appointments, calendar, clients, settings. Clerk-protected.
- `(customer)/` — book, history, sign-in. Phone+OTP session.

These are Next.js route groups (parenthesized directories) sharing the `[slug]` dynamic segment but with different layouts and auth.

### Two Supabase Clients

- `createClerkSupabaseClient()` (`src/lib/supabase/server.ts`) — owner-side. Uses Clerk's `accessToken` callback; RLS policies check `auth.jwt() ->> 'sub'` (Clerk user ID as text, NOT `auth.uid()`).
- `createServiceSupabaseClient()` (`src/lib/supabase/service.ts`) — customer-side and OTP operations. Uses `SUPABASE_SERVICE_ROLE_KEY`, bypasses RLS entirely. Server-only (guarded by `import 'server-only'`).

Both must be instantiated per-request, never cached at module level.

### Server Actions

Split by actor:
- `src/app/actions/owner/` — appointments, customers, services, staff, salon. All call `requireAuth()` (Clerk).
- `src/app/actions/customer/` — auth (OTP), booking, services. Use `requireCustomerSession()` or service-role client.

### Multi-Service Bookings

Appointments support multiple services via the `appointment_services` junction table (`database/migration_appointment_services.sql`). The `appointments.service_id` column is kept for backward compatibility (set to the first service). Server actions accept `serviceIds: string[]` and manage the junction table. Duration and price are summed across all selected services.

### Timezone

All times are IST (UTC+5:30). `src/lib/timezone.ts` provides `toIST()`, `istDateRange()`, `formatISTTime()`, etc. Dates are stored as UTC `timestamptz` in Supabase but all user-facing display and slot computation uses IST.

### Availability

`src/lib/availability.ts` exports `findConflictingStaffIds()` — a pure function that detects staff overlap for a candidate time slot. Used by both owner and customer booking paths.

### Types

`src/lib/supabase/types.ts` is a hand-maintained type stub (not auto-generated). Row types are exported as `SalonRow`, `StaffRow`, `ServiceRow`, `CustomerRow`, `AppointmentRow`. The `AppointmentWithRelations` type (in `src/components/token-stub-card.tsx` and `src/app/actions/owner/appointments.ts`) includes joined `customers`, `services`, `staff`, and `appointment_services`.

## Key Conventions

- **Next.js 16**: `params` is a `Promise` — always `await params` in layouts/pages. Read the docs in `node_modules/next/dist/docs/` when unsure about APIs.
- **React Compiler** is enabled (`reactCompiler: true` in next.config.ts). No manual `useMemo`/`useCallback` needed.
- **Supabase RLS casts**: Owner RLS policies use `auth.jwt() ->> 'sub'` (text), never `auth.uid()` (UUID). Misusing `auth.uid()` silently returns no rows.
- **Supabase type casts**: Many Supabase calls cast the client to `any` to work around the hand-maintained type stub not covering all columns. This is intentional.
- UI components are in `src/components/ui/` (shadcn pattern). Domain components are in `src/components/owner/` and `src/components/customer/`.
- `TokenStubCard` (`src/components/token-stub-card.tsx`) is the shared appointment card used across all views.
- Path alias: `@/*` maps to `./src/*`.

# currentDate
Today's date is 2026-08-20.
