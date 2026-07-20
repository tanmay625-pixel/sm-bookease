"use client";

import * as React from "react";
import Link from "next/link";
import { TokenStub } from "@/components/ui/token-stub";
import { Input } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import {
  Search01Icon,
  UserMultipleIcon,
  Call02Icon,
  Mail01Icon,
  ArrowRight02Icon,
} from "@hugeicons/core-free-icons";
import { relativeVisit } from "@/lib/format";
import type { CustomerRow } from "@/lib/supabase/types";

type ClientWithMeta = CustomerRow & { visitCount?: number; lastVisit?: string | null };

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ClientsBrowser({
  clients,
  slug,
}: {
  clients: ClientWithMeta[];
  slug: string;
}) {
  const [search, setSearch] = React.useState("");
  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter(
      (c) => c.name.toLowerCase().includes(term) || c.phone.includes(term)
    );
  }, [clients, search]);

  return (
    <div className="flex flex-col gap-5">
      <div className="relative max-w-md">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Icon icon={Search01Icon} size={18} />
        </span>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone…"
          className="pl-10"
          aria-label="Search clients"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
            <Icon icon={UserMultipleIcon} size={28} />
          </span>
          <h3 className="font-heading text-xl text-foreground">No clients found</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Clients appear here after their first booking.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <Link key={c.id} href={`/${slug}/clients/${c.id}`} className="group">
              <TokenStub className="flex h-full items-center gap-4 p-4 transition-shadow group-hover:shadow-md">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-base text-primary-foreground">
                  {initials(c.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{c.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <Icon icon={Call02Icon} size={13} />
                    {c.phone}
                  </p>
                  {c.email && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Icon icon={Mail01Icon} size={13} />
                      {c.email}
                    </p>
                  )}
                </div>
                <span className="flex shrink-0 flex-col items-end gap-1 text-right">
                  {typeof c.visitCount === "number" && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      {c.visitCount} visits
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {relativeVisit(c.lastVisit ?? null)}
                  </span>
                  <span className="text-muted-foreground transition-transform group-hover:translate-x-0.5">
                    <Icon icon={ArrowRight02Icon} size={16} />
                  </span>
                </span>
              </TokenStub>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
