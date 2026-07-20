import { OwnerShell } from "@/components/owner/owner-shell";
import { getSalonBySlug } from "@/lib/owner-data";

/**
 * Owner route group layout — renders the desktop sidebar shell.
 *
 * Ownership/auth gating happens against the live Clerk + Supabase backend
 * inside getSalonBySlug and the server actions. When the backend/env is
 * unavailable (e.g. preview without Clerk keys), it falls back to a mock
 * salon so the frontend still renders.
 *
 * params is a Promise in Next.js 16 — always await it.
 */
export default async function OwnerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salon = await getSalonBySlug(slug);

  return (
    <OwnerShell slug={slug} salonName={salon.name}>
      {children}
    </OwnerShell>
  );
}
