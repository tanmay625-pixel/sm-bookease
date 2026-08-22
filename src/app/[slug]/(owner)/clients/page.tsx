import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { listClients } from '@/app/actions/owner/appointments';
import type { SalonRow } from '@/lib/supabase/types';
import { ClientsSearch } from '@/components/owner/clients-search';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import { Suspense } from 'react';
import { ChevronRight, UserRound } from 'lucide-react';

function ClientsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-xl" />
      ))}
    </div>
  );
}

export default async function ClientsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ search?: string }>;
}) {
  const { slug } = await params;
  const { search } = await searchParams;

  const supabase = createClerkSupabaseClient();
  const { data: salonData } = await supabase
    .from('salons')
    .select('id, name')
    .eq('slug', slug)
    .single();
  const salon = salonData as SalonRow | null;

  const clients = salon ? await listClients(salon.id, search) : [];

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4">
      {/* Sticky Header + Search */}
      <div className="sticky top-0 z-20 bg-background pb-3 flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Clients</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {clients.length} client{clients.length !== 1 ? 's' : ''}
            {search ? ` matching "${search}"` : ''}
          </p>
        </div>

        {/* Search */}
        <Suspense>
          <ClientsSearch defaultValue={search} />
        </Suspense>
      </div>

      {/* List */}
      <Suspense fallback={<ClientsSkeleton />}>
        {clients.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <UserRound className="size-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {search ? 'No clients match that search.' : 'No clients yet.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {clients.map((c) => (
              <Link
                key={c.id}
                href={`/${slug}/clients/${c.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                    {c.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.phone}</p>
                </div>
                {c.email && (
                  <p className="hidden sm:block text-xs text-muted-foreground truncate max-w-[180px]">
                    {c.email}
                  </p>
                )}
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </Suspense>
    </div>
  );
}
