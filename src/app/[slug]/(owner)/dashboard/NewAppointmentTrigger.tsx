'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import type { StaffRow, ServiceRow } from '@/lib/supabase/types';
import { Plus } from 'lucide-react';

const NewAppointmentModal = dynamic(
  () => import('@/components/owner/new-appointment-modal').then((m) => m.NewAppointmentModal),
  { ssr: false }
);

interface NewAppointmentTriggerProps {
  salonId: string;
  salonSlug: string;
  staff: StaffRow[];
  services: ServiceRow[];
  workingHours: { start: string; end: string };
  timeFormat?: '12h' | '24h';
}

export function NewAppointmentTrigger({
  salonId,
  salonSlug,
  staff,
  services,
  workingHours,
  timeFormat = '12h',
}: NewAppointmentTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        id="new-appointment-btn"
        onClick={() => setOpen(true)}
        className="gap-1.5 shrink-0"
      >
        <Plus className="size-4" />
        New Appointment
      </Button>
      <NewAppointmentModal
        open={open}
        onOpenChange={setOpen}
        salonId={salonId}
        salonSlug={salonSlug}
        staff={staff}
        services={services}
        workingHours={workingHours}
        timeFormat={timeFormat}
      />
    </>
  );
}

