'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NewAppointmentModal } from '@/components/owner/new-appointment-modal';
import type { AppointmentWithRelations } from '@/components/token-stub-card';
import type { StaffRow, ServiceRow } from '@/lib/supabase/types';
import { Pencil, Phone, User, Clock, CalendarDays, MessageSquare, Scissors } from 'lucide-react';
import { formatISTTime, formatISTDate } from '@/lib/timezone';
import { cn } from '@/lib/utils';

interface AppointmentDetailsModalProps {
  appointment: AppointmentWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Required to allow editing */
  salonId?: string;
  salonSlug?: string;
  staff?: StaffRow[];
  services?: ServiceRow[];
  workingHours?: { start: string; end: string };
  onSuccess?: () => void;
}

const STATUS_STYLES: Record<string, { label: string; dot: string; badge: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:   { label: 'Pending',   dot: 'bg-amber-400',   badge: 'outline' },
  confirmed: { label: 'Confirmed', dot: 'bg-emerald-500', badge: 'default' },
  cancelled: { label: 'Cancelled', dot: 'bg-rose-500',    badge: 'destructive' },
};

export function AppointmentDetailsModal({
  appointment,
  open,
  onOpenChange,
  salonId,
  salonSlug,
  staff,
  services,
  workingHours,
  onSuccess,
}: AppointmentDetailsModalProps) {
  const [editOpen, setEditOpen] = useState(false);

  const isPast = new Date(appointment.slot_start).getTime() <= Date.now();
  const canEdit = !isPast && Boolean(salonId && salonSlug && staff && services && workingHours);

  const timeStr = formatISTTime(appointment.slot_start);
  const endTimeStr = formatISTTime(appointment.slot_end);
  const dateStr = formatISTDate(appointment.slot_start, false);

  const clientName = appointment.customers?.name ?? 'Customer';
  const clientPhone = appointment.customers?.phone;
  const staffName = appointment.staff?.name;

  let serviceName = 'Appointment';
  if (appointment.appointment_services && appointment.appointment_services.length > 0) {
    serviceName = appointment.appointment_services
      .map((as) => as.services?.name)
      .filter(Boolean)
      .join(' + ');
  } else if (appointment.services) {
    serviceName = appointment.services.name;
  }

  const status = STATUS_STYLES[appointment.status] ?? STATUS_STYLES['pending'];

  function handleEditClick() {
    onOpenChange(false);
    // small delay lets the details modal close cleanly before edit modal opens
    setTimeout(() => setEditOpen(true), 120);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4 text-muted-foreground" />
              Appointment Details
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 pt-1">
            {/* Status + Service header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">{serviceName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {dateStr} · {timeStr} – {endTimeStr}
                </p>
              </div>
              <Badge variant={status.badge} className="shrink-0 capitalize text-xs">
                <span className={cn('mr-1 inline-block h-1.5 w-1.5 rounded-full', status.dot)} />
                {status.label}
              </Badge>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Details grid */}
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="size-3.5" />
                <span className="text-xs font-medium">Client</span>
              </div>
              <span className="font-medium">{clientName}</span>

              {clientPhone && (
                <>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="size-3.5" />
                    <span className="text-xs font-medium">Phone</span>
                  </div>
                  <span className="font-mono text-xs">{clientPhone}</span>
                </>
              )}

              {staffName && (
                <>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Scissors className="size-3.5" />
                    <span className="text-xs font-medium">Staff</span>
                  </div>
                  <span>{staffName}</span>
                </>
              )}

              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="size-3.5" />
                <span className="text-xs font-medium">Time</span>
              </div>
              <span>{timeStr} – {endTimeStr}</span>
            </div>

            {/* Notes */}
            {appointment.notes && (
              <>
                <div className="border-t border-border" />
                <div className="flex gap-2 text-sm">
                  <MessageSquare className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm text-foreground">{appointment.notes}</p>
                  </div>
                </div>
              </>
            )}

            {/* Past notice */}
            {isPast && (
              <div className="rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
                This appointment is in the past and cannot be edited.
              </div>
            )}

            {/* Actions */}
            {canEdit && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={handleEditClick}
                >
                  <Pencil className="size-3.5" />
                  Edit Appointment
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit modal — only when edit is available */}
      {canEdit && salonId && salonSlug && staff && services && workingHours && (
        <NewAppointmentModal
          open={editOpen}
          onOpenChange={setEditOpen}
          salonId={salonId}
          salonSlug={salonSlug}
          staff={staff}
          services={services}
          workingHours={workingHours}
          appointment={appointment}
          onSuccess={onSuccess}
        />
      )}
    </>
  );
}
