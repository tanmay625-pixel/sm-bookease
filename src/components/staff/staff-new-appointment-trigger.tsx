'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import type { StaffRow, ServiceRow } from '@/lib/supabase/types';
import { Plus } from 'lucide-react';

const StaffAppointmentModal = dynamic(
  () => import('@/components/staff/staff-appointment-modal').then((m) => m.StaffAppointmentModal),
  { ssr: false }
);

interface StaffNewAppointmentTriggerProps {
  slug: string;
  salonId: string;
  staffId: string;
  staff: StaffRow[];
  services: ServiceRow[];
  workingHours: { start: string; end: string };
  timeFormat?: '12h' | '24h';
}

export function StaffNewAppointmentTrigger({
  slug,
  salonId,
  staffId,
  staff,
  services,
  workingHours,
  timeFormat = '12h',
}: StaffNewAppointmentTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-1.5 shrink-0">
        <Plus className="size-4" />
        New Appointment
      </Button>
      <StaffAppointmentModal
        open={open}
        onOpenChange={setOpen}
        slug={slug}
        salonId={salonId}
        staffId={staffId}
        staff={staff}
        services={services}
        workingHours={workingHours}
        timeFormat={timeFormat}
      />
    </>
  );
}

