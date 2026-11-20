import { requireStaffSession } from '@/lib/staff-session';
import { getSalonClientDetail } from '@/app/actions/staff/clients';
import { TokenStubCard } from '@/components/token-stub-card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { ChevronLeft, Mail, Phone, Calendar } from 'lucide-react';

export default async function StaffClientDetailPage({
  params,
}: {
  params: Promise<{ slug: string; clientId: string }>;
}) {
  const { slug, clientId } = await params;
  await requireStaffSession(slug);

  let client;
  try {
    client = await getSalonClientDetail(slug, clientId);
  } catch {
    return (
      <div className="p-4 md:p-6">
        <Link
          href={`/${slug}/staff/clients`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="size-3.5" /> Clients
        </Link>
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">Client not found.</p>
        </div>
      </div>
    );
  }

  const sorted = [...client.appointments].sort(
    (a, b) => new Date(b.slot_start).getTime() - new Date(a.slot_start).getTime()
  );
  const upcoming = sorted.filter((a) => new Date(a.slot_start) >= new Date() && a.status !== 'cancelled');
  const past = sorted.filter((a) => new Date(a.slot_start) < new Date() || a.status === 'cancelled');
  const initials = client.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-2xl">
      <Link
        href={`/${slug}/staff/clients`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" /> Clients
      </Link>

      {/* Client header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-lg font-semibold">{client.name}</h1>
          <div className="flex flex-col gap-0.5 mt-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="size-3" /> {client.phone}
            </span>
            {client.email && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="size-3" /> {client.email}
              </span>
            )}
          </div>
        </div>
        <div className="ml-auto flex flex-col items-end gap-1">
          <Badge variant="secondary" className="text-xs">
            {sorted.length} visit{sorted.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Upcoming */}
      <section>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
          <Calendar className="size-4 text-primary" />
          Upcoming
          {upcoming.length > 0 && (
            <Badge variant="outline" className="text-[10px] ml-auto">{upcoming.length}</Badge>
          )}
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-xs text-muted-foreground">No upcoming appointments.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map((appt) => (
              <TokenStubCard key={appt.id} appointment={appt} compact />
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* History */}
      <section>
        <h2 className="text-sm font-semibold mb-3">
          Visit History
          {past.length > 0 && (
            <Badge variant="outline" className="text-[10px] ml-2">{past.length}</Badge>
          )}
        </h2>
        {past.length === 0 ? (
          <p className="text-xs text-muted-foreground">No past appointments.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {past.map((appt) => (
              <TokenStubCard key={appt.id} appointment={appt} compact />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

