# BookMi

Multi-tenant salon appointment booking PWA. Next.js 16 (App Router) + Supabase + Clerk + Serwist.

---

## Prerequisites

- Node 20+
- A [Supabase](https://supabase.com) project with the schema applied (`database/schema.sql`)
- A [Clerk](https://clerk.com) application (set to use JWT templates for Supabase)
- A Meta WhatsApp Cloud API phone number (optional in dev — OTP logs to console)

---

## Environment Variables

Copy `.env.local` and fill in every value. The table below explains what each variable is, where to get it, and what breaks if it's missing.

| Variable | Required | Where to get it | What breaks if missing |
|---|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk dashboard → API Keys | Clerk `<ClerkProvider>` fails to mount |
| `CLERK_SECRET_KEY` | ✅ | Clerk dashboard → API Keys | `auth()` / `clerkClient` fail server-side |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | ✅ | Set to `/sign-in` | Clerk can't redirect to sign-in |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | ✅ | Set to `/sign-up` | Clerk can't redirect to sign-up |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase → Project Settings → API | All Supabase clients fail |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | Supabase → Project Settings → API → anon/public key | Browser-side Supabase calls fail |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase → Project Settings → API → service_role key | Customer-path actions fail (OTP, booking) |
| **`CUSTOMER_SESSION_SECRET`** | ✅ | Generate yourself (see below) | `verifyOtp` crashes with `DOMException` from jose; session cookies can't be signed or verified |
| `WHATSAPP_ACCESS_TOKEN` | ⚠️ prod only | Meta for Developers → WhatsApp → API Setup → permanent System User token | OTP WhatsApp sends fail; dev falls back to console log |
| `WHATSAPP_PHONE_NUMBER_ID` | ⚠️ prod only | Meta for Developers → WhatsApp → API Setup | Same as above |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | ⚠️ prod only | Meta for Developers → WhatsApp → Business Account ID | Same as above |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | ⚠️ prod only | Any random string you choose | Meta webhook verification GET fails |

### Generating CUSTOMER_SESSION_SECRET

**This key is not optional.** It signs customer session JWTs and must be a cryptographically random string distinct from `CLERK_SECRET_KEY` (different trust boundary — Clerk manages owner sessions; this signs customer cookies).

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Paste the output as the value of `CUSTOMER_SESSION_SECRET` in `.env.local` and in your Vercel / hosting environment.

> **Security**: Never commit `.env.local` to git. Never reuse `CLERK_SECRET_KEY` here.

---

## Database Setup

1. Create a Supabase project.
2. In the SQL Editor, run `database/schema.sql` in full.
3. Create a Clerk JWT template named `supabase` that sets `role = 'authenticated'` and `sub = user.id`. This is what the owner Supabase client uses for RLS.

---

## Development

```bash
npm install
npm run dev        # Turbopack — hot reload, SW disabled (Turbopack limitation)
```

OTPs are printed to the server console in development even when WhatsApp isn't configured — look for `[DEV] OTP for <phone> at <slug>: <code>`.

## Production Build

```bash
npm run build      # uses --webpack flag so Serwist can bundle the service worker
npm start
```

---

## Deployment (Vercel)

Set all environment variables in the Vercel project settings. `SUPABASE_SERVICE_ROLE_KEY` and `CUSTOMER_SESSION_SECRET` are server-only — do **not** prefix them with `NEXT_PUBLIC_`.
