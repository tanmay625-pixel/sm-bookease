'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { updateAppointmentStatus } from '@/app/actions/owner/appointments';
import { NewAppointmentModal } from '@/components/owner/new-appointment-modal';
import type { StaffRow, ServiceRow } from '@/lib/supabase/types';
import type { AppointmentWithRelations } from '@/components/token-stub-card';
import { CheckCircle, XCircle, Pencil } from 'lucide-react';

interface AppointmentStatusActionsProps {
  appointment: AppointmentWithRelations;
  slug: string;
  salonId: string;
  staff: StaffRow[];
  services: ServiceRow[];
  workingHours: { start: string; end: string };
  timeFormat?: '12h' | '24h';
}

export function AppointmentStatusActions({
  appointment,
  slug,
  salonId,
  staff,
  services,
  workingHours,
  timeFormat = '12h',
}: AppointmentStatusActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  if (appointment.status === 'cancelled') return null;

  const isPast = new Date(appointment.slot_start).getTime() <= Date.now();

  function handleConfirm() {
    startTransition(async () => {
      await updateAppointmentStatus(appointment.id, 'confirmed');
    });
  }

  function handleCancel() {
    startTransition(async () => {
      await updateAppointmentStatus(appointment.id, 'cancelled');
    });
  }

  return (
    <>
      <div
        className="flex flex-wrap items-center gap-1.5"
        onClick={(e) => e.stopPropagation()} // prevent bubbling to card click
      >
        {appointment.status === 'pending' && (
          <Button
            size="sm"
            variant="default"
            onClick={(e) => { e.stopPropagation(); handleConfirm(); }}
            disabled={isPending}
            className="h-7 gap-1 text-xs"
          >
            <CheckCircle className="size-3" />
            Confirm
          </Button>
        )}

        {!isPast && (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}
            disabled={isPending}
            className="h-7 gap-1 text-xs"
          >
            <Pencil className="size-3" />
            Edit
          </Button>
        )}

        {!isPast && (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); handleCancel(); }}
            disabled={isPending}
            className="h-7 gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <XCircle className="size-3" />
            Cancel
          </Button>
        )}
      </div>

      <NewAppointmentModal
        open={editOpen}
        onOpenChange={setEditOpen}
        salonId={salonId}
        salonSlug={slug}
        staff={staff}
        services={services}
        workingHours={workingHours}
        appointment={appointment}
        timeFormat={timeFormat}
      />
    </>
  );
}
