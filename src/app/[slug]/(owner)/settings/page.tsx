import { redirect } from 'next/navigation';
import { getCachedOwnerSalon } from '@/lib/supabase/cached';
import { listStaff, createStaff } from '@/app/actions/owner/staff';
import { listServices, createService } from '@/app/actions/owner/services';
import { updateSalonSettings } from '@/app/actions/owner/salon';
import { StaffEditRow } from './StaffEditRow';
import { ServiceEditRow } from './ServiceEditRow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Building2, Users, Scissors } from 'lucide-react';
import { BusinessProfileForm } from './BusinessProfileForm';

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // getCachedOwnerSalon is already memoised for this request by OwnerLayout.
  const salon = await getCachedOwnerSalon(slug);
  if (!salon) redirect('/');

  const [staffList, servicesList] = await Promise.all([
    listStaff(salon.id),
    listServices(salon.id),
  ]);

  const wh = salon.working_hours as { start: string; end: string };

  return (
    <div className="p-4 md:p-6 max-w-2xl flex flex-col gap-5">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="gap-1.5 text-xs">
            <Building2 className="size-3.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-1.5 text-xs">
            <Users className="size-3.5" /> Staff
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-1.5 text-xs">
            <Scissors className="size-3.5" /> Services
          </TabsTrigger>
        </TabsList>

        {/* ── Business Profile ─────────────────────────── */}
        <TabsContent value="profile" className="mt-4">
          <BusinessProfileForm
            salonId={salon.id}
            defaultName={salon.name}
            defaultWorkingHours={wh}
            defaultWorkingDays={salon.working_days}
            defaultTimeFormat={salon.time_format || '12h'}
          />
        </TabsContent>

        {/* ── Staff ────────────────────────────────────── */}
        <TabsContent value="staff" className="mt-4">
          {staffList.length > 0 ? (
            <ul className="flex flex-col divide-y divide-border mb-4">
              {staffList.map((s) => (
                <StaffEditRow key={s.id} staff={s} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground mb-4">No staff yet.</p>
          )}

          <Separator className="my-4" />

          <form
            className="flex flex-col gap-3"
            action={async (formData: FormData) => {
              'use server';
              await createStaff(salon.id, {
                name:  formData.get('name')  as string,
                role:  (formData.get('role')  as string) || null,
                email: (formData.get('contact') as string) || null,
                phone: formData.get('phone') as string,
              });
            }}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Add staff member
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Input name="name"  placeholder="Name *" required />
              <Input name="role"  placeholder="Role (optional)" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input name="phone" type="tel" placeholder="Phone *" required />
              <Input name="contact" type="email" placeholder="Email (optional)" />
            </div>
            <Button type="submit" size="sm" className="self-start">Add Staff</Button>
          </form>
        </TabsContent>

        {/* ── Services ─────────────────────────────────── */}
        <TabsContent value="services" className="mt-4">
          {servicesList.length > 0 ? (
            <ul className="flex flex-col divide-y divide-border mb-4">
              {servicesList.map((s) => (
                <ServiceEditRow key={s.id} service={s} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground mb-4">No services yet.</p>
          )}

          <Separator className="my-4" />

          <form
            className="flex flex-col gap-3"
            action={async (formData: FormData) => {
              'use server';
              await createService(salon.id, {
                name:             formData.get('name')     as string,
                duration_minutes: parseInt(formData.get('duration') as string, 10),
                price:            parseFloat(formData.get('price')    as string),
              });
            }}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Add service
            </p>
            <Input name="name" placeholder="Service name *" required />
            <div className="grid grid-cols-2 gap-2">
              <Input name="duration" type="number" placeholder="Duration (min) *" required min={1} />
              <Input name="price"    type="number" step="0.01" placeholder="Price (₹) *" required min={0} />
            </div>
            <Button type="submit" size="sm" className="self-start">Add Service</Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
