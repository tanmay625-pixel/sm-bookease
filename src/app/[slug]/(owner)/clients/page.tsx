import { getSalonBySlug, getClients, getAppointments } from "@/lib/owner-data";
import { PageHeader } from "@/components/owner/page-header";
import { ClientsBrowser } from "@/components/owner/clients-browser";

export default async function ClientsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salon = await getSalonBySlug(slug);

  const [clients, appointments] = await Promise.all([
    getClients(salon.id),
    getAppointments(salon.id),
  ]);

  const now = Date.now();
  const enriched = clients.map((c) => {
    const past = appointments
      .filter((a) => a.customer_id === c.id && a.status !== "cancelled")
      .sort((a, b) => new Date(b.slot_start).getTime() - new Date(a.slot_start).getTime());
    const lastDone = past.find((a) => new Date(a.slot_start).getTime() <= now);
    return {
      ...c,
      visitCount: past.length,
      lastVisit: lastDone?.slot_start ?? past[0]?.slot_start ?? null,
    };
  });

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} people have booked with ${salon.name}.`}
      />
      <ClientsBrowser clients={enriched} slug={slug} />
    </>
  );
}
