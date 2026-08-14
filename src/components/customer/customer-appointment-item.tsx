'use client';

import { useState, useTransition } from 'react';
import { TokenStubCard } from '@/components/token-stub-card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cancelOwnAppointment } from '@/app/actions/customer/booking';
import { useRouter } from 'next/navigation';
import type { AppointmentRow, ServiceRow, StaffRow } from '@/lib/supabase/types';
import { XCircle, AlertCircle } from 'lucide-react';
import { formatISTTime, formatISTDate } from '@/lib/timezone';

interface CustomerAppointmentItemProps {
  slug: string;
  appointment: AppointmentRow & { 
    services: ServiceRow | null; 
    staff?: StaffRow | null;
    appointment_services?: { services: ServiceRow | null }[];
  };
  isUpcoming?: boolean;
}

export function CustomerAppointmentItem({
  slug,
  appointment,
  isUpcoming = false,
}: CustomerAppointmentItemProps) {
  const router = useRouter();
  const [openCancel, setOpenCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const formattedDate = formatISTDate(appointment.slot_start);
  const formattedTime = formatISTTime(appointment.slot_start);

  let serviceName = 'Service';
  if (appointment.appointment_services && appointment.appointment_services.length > 0) {
    serviceName = appointment.appointment_services
      .map(as => as.services?.name)
      .filter(Boolean)
      .join(' + ');
  } else if (appointment.services) {
    serviceName = appointment.services.name;
  }

  function handleConfirmCancel() {
    setError(null);
    startTransition(async () => {
      const res = await cancelOwnAppointment(slug, appointment.id);
      if (!res.ok) {
        setError(res.error ?? 'Failed to cancel appointment');
        return;
      }
      setOpenCancel(false);
      router.refresh();
    });
  }

  const enriched = {
    ...appointment,
    customers: null,
    services: appointment.services,
    appointment_services: appointment.appointment_services,
    staff: appointment.staff ?? null,
  };

  return (
    <div className="flex flex-col gap-2">
      <TokenStubCard
        appointment={enriched}
        compact={!isUpcoming}
        actions={
          isUpcoming && appointment.status !== 'cancelled' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenCancel(true)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs h-7 px-2.5"
            >
              <XCircle className="size-3.5 mr-1" />
              Cancel
            </Button>
          ) : undefined
        }
      />

      <Dialog open={openCancel} onOpenChange={setOpenCancel}>
        <DialogContent className="max-w-xs sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
              <AlertCircle className="size-5" />
            </div>
            <DialogTitle className="text-base font-semibold">Cancel Appointment?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to cancel your appointment for{' '}
              <span className="font-medium text-foreground">
                {serviceName}
              </span>{' '}
              on <span className="font-medium text-foreground">{formattedDate}</span> at{' '}
              <span className="font-medium text-foreground">{formattedTime}</span>?
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <DialogFooter className="flex flex-row gap-2 justify-end sm:justify-end mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpenCancel(false)}
              disabled={isPending}
              className="text-xs"
            >
              Keep
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmCancel}
              disabled={isPending}
              className="text-xs"
            >
              {isPending ? 'Cancelling…' : 'Yes, Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
