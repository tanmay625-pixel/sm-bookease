'use client';

import { useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { updateStaffAppointmentStatus } from '@/app/actions/staff/appointments';
import type { StaffRow, ServiceRow } from '@/lib/supabase/types';
import type { AppointmentWithRelations } from '@/components/token-stub-card';
import { CheckCircle, XCircle, Pencil } from 'lucide-react';

const StaffAppointmentModal = dynamic(
  () => import('@/components/staff/staff-appointment-modal').then((m) => m.StaffAppointmentModal),
  { ssr: false }
);

interface StaffAppointmentStatusActionsProps {
  appointment: AppointmentWithRelations;
  slug: string;
  salonId: string;
  staffId: string;
  staff: StaffRow[];
  services: ServiceRow[];
  workingHours: { start: string; end: string };
  timeFormat?: '12h' | '24h';
}

export function StaffAppointmentStatusActions({
  appointment,
  slug,
  salonId,
  staffId,
  staff,
  services,
  workingHours,
  timeFormat = '12h',
}: StaffAppointmentStatusActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (appointment.status === 'cancelled') return null;

  const [isPast] = useState(() => new Date(appointment.slot_start).getTime() <= Date.now());

  function handleConfirm() {
    startTransition(async () => {
      await updateStaffAppointmentStatus(slug, appointment.id, 'confirmed');
    });
  }

  function handleCancel() {
    startTransition(async () => {
      await updateStaffAppointmentStatus(slug, appointment.id, 'cancelled');
      setCancelOpen(false);
    });
  }

  return (
    <>
      <div
        className="flex flex-wrap items-center gap-1.5"
        onClick={(e) => e.stopPropagation()}
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
            onClick={(e) => { e.stopPropagation(); setCancelOpen(true); }}
            disabled={isPending}
            className="h-7 gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <XCircle className="size-3" />
            Cancel
          </Button>
        )}
      </div>

      {/* Edit modal — with "ask customer" warning */}
      <StaffAppointmentModal
        open={editOpen}
        onOpenChange={setEditOpen}
        slug={slug}
        salonId={salonId}
        staffId={staffId}
        staff={staff}
        services={services}
        workingHours={workingHours}
        appointment={appointment}
        timeFormat={timeFormat}
      />

      {/* Cancel confirmation */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment?</DialogTitle>
            <DialogDescription>
              This will cancel the appointment for{' '}
              <span className="font-medium">{appointment.customers?.name ?? 'the customer'}</span>.
              The customer will not be automatically notified of this cancellation.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCancelOpen(false)}
              disabled={isPending}
            >
              Keep Appointment
            </Button>
            <Button
              onClick={handleCancel}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

