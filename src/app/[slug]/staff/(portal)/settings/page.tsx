import { requireStaffSession } from '@/lib/staff-session';
import { getStaffProfile } from '@/app/actions/staff/profile';
import { StaffSettingsForm } from '@/components/staff/staff-settings-form';

export default async function StaffSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireStaffSession(slug);

  const profile = await getStaffProfile(slug);

  return (
    <div className="p-4 md:p-6 max-w-2xl flex flex-col gap-5">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
      <StaffSettingsForm slug={slug} profile={profile} />
    </div>
  );
}

