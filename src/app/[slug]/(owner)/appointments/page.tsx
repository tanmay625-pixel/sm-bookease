import { getSalonBySlug, getAppointments, getStaff, getServices } from "@/lib/owner-data";
import { PageHeader } from "@/components/owner/page-header";
import { NewAppointmentButton } from "@/components/owner/new-appointment-button";
import { AppointmentsBrowser } from "@/components/owner/appointments-browser";

export default async function AppointmentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salon = await getSalonBySlug(slug);

  const [appointments, staff, services] = await Promise.all([
    getAppointments(salon.id),
    getStaff(salon.id),
    getServices(salon.id),
  ]);

  return (
    <>
      <PageHeader
        title="Appointments"
        subtitle="Every booking across your shop, in one place."
        action={<NewAppointmentButton services={services} staff={staff} />}
      />
      <AppointmentsBrowser appointments={appointments} services={services} staff={staff} />
    </>
  );
}
