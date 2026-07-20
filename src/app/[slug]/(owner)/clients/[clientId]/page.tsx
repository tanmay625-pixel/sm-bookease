import Link from "next/link";
import { notFound } from "next/navigation";
import { getSalonBySlug, getClientDetail, getServices, getStaff } from "@/lib/owner-data";
import { AppointmentStub } from "@/components/appointment-stub";
import { TokenStub } from "@/components/ui/token-stub";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { formatTimeRange, formatLongDate, formatDate, formatPrice } from "@/lib/format";
import {
  ArrowLeft02Icon,
  Call02Icon,
  Mail01Icon,
  Calendar03Icon,
  Coins01Icon,
} from "@hugeicons/core-free-icons";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ slug: string; clientId: string }>;
}) {
  const { slug, clientId } = await params;
  const salon = await getSalonBySlug(slug);
  const [detail, services, staff] = await Promise.all([
    getClientDetail(clientId),
    getServices(salon.id),
    getStaff(salon.id),
  ]);

  if (!detail) notFound();
  const { client, appointments } = detail;

  const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? "Service";
  const servicePrice = (id: string) => services.find((s) => s.id === id)?.price ?? 0;
  const staffName = (id: string | null) =>
    id ? (staff.find((s) => s.id === id)?.name ?? "Staff") : "Any available";

  const sorted = [...appointments].sort(
    (a, b) => new Date(b.slot_start).getTime() - new Date(a.slot_start).getTime()
  );
  const completed = sorted.filter((a) => a.status !== "cancelled");
  const totalSpend = completed.reduce((sum, a) => sum + servicePrice(a.service_id), 0);

  return (
    <>
      <Link
        href={`/${slug}/clients`}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Icon icon={ArrowLeft02Icon} size={16} />
        Back to clients
      </Link>

      <TokenStub className="mb-6 flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-2xl text-primary-foreground">
          {initials(client.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-2xl text-foreground">{client.name}</h1>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Icon icon={Call02Icon} size={15} />
              {client.phone}
            </span>
            {client.email && (
              <span className="inline-flex items-center gap-1.5">
                <Icon icon={Mail01Icon} size={15} />
                {client.email}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Icon icon={Calendar03Icon} size={15} />
              Client since {formatDate(client.created_at)}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <Card className="px-5 py-3 text-center">
            <p className="font-heading text-2xl text-foreground">{completed.length}</p>
            <p className="text-xs text-muted-foreground">Visits</p>
          </Card>
          <Card className="px-5 py-3 text-center">
            <p className="flex items-center gap-1 font-heading text-2xl text-foreground">
              <Icon icon={Coins01Icon} size={18} className="text-accent" />
              {formatPrice(totalSpend)}
            </p>
            <p className="text-xs text-muted-foreground">Lifetime</p>
          </Card>
        </div>
      </TokenStub>

      <h2 className="mb-4 font-heading text-xl text-foreground">Appointment history</h2>
      {sorted.length === 0 ? (
        <Card className="px-6 py-12 text-center text-sm text-muted-foreground">
          No appointments yet.
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((a) => (
            <AppointmentStub
              key={a.id}
              clientName={`${formatLongDate(a.slot_start)}`}
              serviceName={serviceName(a.service_id)}
              staffName={staffName(a.staff_id)}
              timeLabel={formatTimeRange(a.slot_start, a.slot_end)}
              status={a.status}
            />
          ))}
        </div>
      )}
    </>
  );
}
