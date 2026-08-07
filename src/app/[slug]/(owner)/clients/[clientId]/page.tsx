import { getClientDetail } from '@/app/actions/owner/appointments';
import { TokenStubCard } from '@/components/token-stub-card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { ChevronLeft, Mail, Phone, Calendar } from 'lucide-react';

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ slug: string; clientId: string }>;
}) {
  const { slug, clientId } = await params;

  let client;
  try {
    client = await getClientDetail(clientId);
  } catch {
    return (
      <div className="p-4 md:p-6">
        <Link
          href={`/${slug}/clients`}
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
      {/* Back */}
      <Link
        href={`/${slug}/clients`}
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
          <h1 className="text-xl font-semibold">{client.name}</h1>
          <div className="flex flex-col gap-0.5 mt-1">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="size-3" /> {client.phone}
            </span>
            {client.email && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="size-3" /> {client.email}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="size-3" />
              Client since {new Date(client.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex gap-3">
        <div className="flex-1 rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{client.appointments.length}</p>
          <p className="text-xs text-muted-foreground">Total visits</p>
        </div>
        <div className="flex-1 rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{upcoming.length}</p>
          <p className="text-xs text-muted-foreground">Upcoming</p>
        </div>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            Upcoming
            <Badge variant="outline" className="text-xs">{upcoming.length}</Badge>
          </h2>
          <div className="flex flex-col gap-2">
            {upcoming.map((a) => (
              <TokenStubCard key={a.id} appointment={a} />
            ))}
          </div>
        </section>
      )}

      {/* History */}
      {past.length > 0 && (
        <>
          {upcoming.length > 0 && <Separator />}
          <section>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              History
              <Badge variant="outline" className="text-xs">{past.length}</Badge>
            </h2>
            <div className="flex flex-col gap-2">
              {past.map((a) => (
                <TokenStubCard key={a.id} appointment={a} compact />
              ))}
            </div>
          </section>
        </>
      )}

      {client.appointments.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No appointments yet for this client.
          </p>
        </div>
      )}
    </div>
  );
}
