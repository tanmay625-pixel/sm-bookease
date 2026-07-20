import { createStaff, deleteStaff } from "@/app/actions/owner/staff";
import { createService, deleteService } from "@/app/actions/owner/services";
import { updateSalonSettings } from "@/app/actions/owner/salon";
import { getSalonBySlug, getStaff, getServices } from "@/lib/owner-data";
import { PageHeader } from "@/components/owner/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { formatDuration, formatPrice } from "@/lib/format";
import {
  Store01Icon,
  UserMultipleIcon,
  Scissor01Icon,
  Delete02Icon,
  Add01Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salon = await getSalonBySlug(slug);
  const [staffList, servicesList] = await Promise.all([
    getStaff(salon.id),
    getServices(salon.id),
  ]);

  const hours = (salon.working_hours ?? { start: "09:00", end: "19:00" }) as {
    start: string;
    end: string;
  };

  function initials(name: string) {
    return name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your shop, team and service menu." />

      <div className="flex flex-col gap-6">
        {/* General */}
        <Card className="p-6">
          <SectionTitle icon={Store01Icon} title="General" subtitle="Shop name and opening hours" />
          <form
            action={async (formData: FormData) => {
              "use server";
              await updateSalonSettings(salon.id, {
                name: formData.get("name") as string,
                workingHours: {
                  start: formData.get("start") as string,
                  end: formData.get("end") as string,
                },
              });
            }}
            className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <Label htmlFor="s-name">Salon name</Label>
              <Input id="s-name" name="name" defaultValue={salon.name} required />
            </div>
            <div>
              <Label htmlFor="s-start">Opens at</Label>
              <Input id="s-start" name="start" type="time" defaultValue={hours.start} />
            </div>
            <div>
              <Label htmlFor="s-end">Closes at</Label>
              <Input id="s-end" name="end" type="time" defaultValue={hours.end} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" variant="primary">
                Save changes
              </Button>
            </div>
          </form>
        </Card>

        {/* Staff */}
        <Card className="p-6">
          <SectionTitle
            icon={UserMultipleIcon}
            title={`Team (${staffList.length})`}
            subtitle="Stylists and barbers customers can book with"
          />
          <ul className="mt-5 flex flex-col gap-2">
            {staffList.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3 py-2.5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                  {initials(s.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                  {s.role && <p className="truncate text-xs text-muted-foreground">{s.role}</p>}
                </div>
                <form
                  action={async () => {
                    "use server";
                    await deleteStaff(s.id);
                  }}
                >
                  <Button type="submit" variant="ghost" size="icon" aria-label={`Remove ${s.name}`}>
                    <Icon icon={Delete02Icon} size={18} className="text-destructive" />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
          <form
            action={async (formData: FormData) => {
              "use server";
              await createStaff(salon.id, {
                name: formData.get("name") as string,
                role: (formData.get("role") as string) || null,
                email: null,
                phone: null,
              });
            }}
            className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <Label htmlFor="st-name">Name</Label>
              <Input id="st-name" name="name" placeholder="e.g. Priya Sharma" required />
            </div>
            <div className="flex-1">
              <Label htmlFor="st-role">Role</Label>
              <Input id="st-role" name="role" placeholder="e.g. Senior Stylist" />
            </div>
            <Button type="submit" variant="accent">
              <Icon icon={Add01Icon} size={18} />
              Add
            </Button>
          </form>
        </Card>

        {/* Services */}
        <Card className="p-6">
          <SectionTitle
            icon={Scissor01Icon}
            title={`Services (${servicesList.length})`}
            subtitle="Your bookable menu with prices and durations"
          />
          <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {servicesList.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Icon icon={Clock01Icon} size={13} />
                      {formatDuration(s.duration_minutes)}
                    </span>
                    <span className="font-medium text-accent-foreground/90">
                      {formatPrice(s.price)}
                    </span>
                  </p>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await deleteService(s.id);
                  }}
                >
                  <Button type="submit" variant="ghost" size="icon" aria-label={`Remove ${s.name}`}>
                    <Icon icon={Delete02Icon} size={18} className="text-destructive" />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
          <form
            action={async (formData: FormData) => {
              "use server";
              await createService(salon.id, {
                name: formData.get("name") as string,
                duration_minutes: parseInt(formData.get("duration") as string, 10),
                price: parseFloat(formData.get("price") as string),
              });
            }}
            className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <Label htmlFor="sv-name">Service name</Label>
              <Input id="sv-name" name="name" placeholder="e.g. Haircut & Style" required />
            </div>
            <div className="sm:w-32">
              <Label htmlFor="sv-duration">Minutes</Label>
              <Input id="sv-duration" name="duration" type="number" min="5" placeholder="45" required />
            </div>
            <div className="sm:w-32">
              <Label htmlFor="sv-price">Price (₹)</Label>
              <Input id="sv-price" name="price" type="number" min="0" step="1" placeholder="650" required />
            </div>
            <Button type="submit" variant="accent">
              <Icon icon={Add01Icon} size={18} />
              Add
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: typeof Store01Icon;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
        <Icon icon={icon} size={22} />
      </span>
      <div>
        <h2 className="font-heading text-lg text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
