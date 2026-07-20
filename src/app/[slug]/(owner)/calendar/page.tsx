import { getSalonBySlug, getAppointments, getServices, getStaff } from "@/lib/owner-data";
import { PageHeader } from "@/components/owner/page-header";
import { CalendarWeek } from "@/components/owner/calendar-week";

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salon = await getSalonBySlug(slug);

  const [appointments, services, staff] = await Promise.all([
    getAppointments(salon.id),
    getServices(salon.id),
    getStaff(salon.id),
  ]);

  return (
    <>
      <PageHeader title="Calendar" subtitle="Your week at a glance. Tap a slot to book." />
      <CalendarWeek appointments={appointments} services={services} staff={staff} />
    </>
  );
}
