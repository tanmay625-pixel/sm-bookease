import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { listStaff, createStaff } from '@/app/actions/owner/staff';
import { listServices, createService } from '@/app/actions/owner/services';
import { updateSalonSettings } from '@/app/actions/owner/salon';
import type { SalonRow } from '@/lib/supabase/types';
import { StaffEditRow } from './StaffEditRow';
import { ServiceEditRow } from './ServiceEditRow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Building2, Users, Scissors } from 'lucide-react';
import { ModeToggle } from '@/components/ui/theme-toggle';

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
  const supabase = createClerkSupabaseClient();

  const { data: salonData } = await supabase
    .from('salons')
    .select('*')
    .eq('slug', slug)
    .single();
  const salon = salonData as SalonRow | null;

  const [staffList, servicesList] = salon
    ? await Promise.all([listStaff(salon.id), listServices(salon.id)])
    : [[], []];

  if (!salon) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-sm text-muted-foreground">Salon not found.</p>
      </div>
    );
  }

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
          <form
            className="flex flex-col gap-4"
            action={async (formData: FormData) => {
              'use server';
              const name  = formData.get('name')  as string;
              const start = formData.get('start') as string;
              const end   = formData.get('end')   as string;
              const selectedDays = DAYS
                .filter((d) => formData.get(`day_${d.key}`) === 'on')
                .map((d) => d.key);
              await updateSalonSettings(salon.id, {
                name,
                workingHours: { start, end },
                workingDays:  selectedDays,
              });
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="salon-name" className="text-xs">Studio name</Label>
              <Input
                id="salon-name"
                name="name"
                defaultValue={salon.name}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="working-start" className="text-xs">Opens at</Label>
                <Input id="working-start" name="start" type="time" defaultValue={wh.start} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="working-end" className="text-xs">Closes at</Label>
                <Input id="working-end" name="end" type="time" defaultValue={wh.end} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Working days</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d) => (
                  <label key={d.key} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      name={`day_${d.key}`}
                      defaultChecked={salon.working_days.includes(d.key)}
                      className="rounded border-border"
                    />
                    <span className="text-xs">{d.label}</span>
                  </label>
                ))}
              </div>
              <Label className="text-xs">Toggle Theme</Label>
              <ModeToggle /> 
            </div>

            <Button type="submit" size="sm" className="self-start">Save changes</Button>
          </form>
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
                phone: null,
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
            <Input name="contact" type="contact" placeholder="Contact (optional)" />
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
