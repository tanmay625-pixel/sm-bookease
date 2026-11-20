'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { upsertSalonCustomerAsStaff } from '@/app/actions/staff/clients';
import { createStaffAppointment, updateStaffAppointmentDetails } from '@/app/actions/staff/appointments';
import { checkSlotAvailability } from '@/app/actions/customer/booking';
import type { StaffRow, ServiceRow } from '@/lib/supabase/types';
import type { AppointmentWithRelations } from '@/components/token-stub-card';
import {
  CalendarDays,
  Clock,
  Plus,
  Pencil,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { todayIST, toIST, currentTimeIST, IST_OFFSET_MINUTES } from '@/lib/timezone';
import { SmartTimeInput } from '@/components/smart-time-input';
import { ServiceCombobox } from '@/components/service-combobox';

interface StaffAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  salonId: string;
  staffId: string;
  staff: StaffRow[];
  services: ServiceRow[];
  workingHours: { start: string; end: string };
  /** When provided — edit mode */
  appointment?: AppointmentWithRelations | null;
  onSuccess?: () => void;
  initialDate?: string;
  initialTime?: string;
  timeFormat?: '12h' | '24h';
}

export function StaffAppointmentModal(props: StaffAppointmentModalProps) {
  const { open, onOpenChange, appointment } = props;
  const isEdit = Boolean(appointment);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {isEdit ? <Pencil className="size-4" /> : <Plus className="size-4" />}
            {isEdit ? 'Edit Appointment' : 'New Appointment'}
          </DialogTitle>
        </DialogHeader>

        {open && (
          <StaffAppointmentForm
            key={appointment?.id ?? 'new'}
            {...props}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function StaffAppointmentForm({
  onOpenChange,
  slug,
  salonId,
  staffId,
  staff,
  services,
  workingHours,
  appointment,
  onSuccess,
  initialDate,
  initialTime,
  timeFormat = '12h',
}: StaffAppointmentModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [editConfirmed, setEditConfirmed] = useState(false);

  const isEdit = Boolean(appointment);

  // Initialize state directly from props without useEffect
  const [clientName, setClientName] = useState(() => appointment?.customers?.name ?? '');
  const [clientPhone, setClientPhone] = useState(() => appointment?.customers?.phone ?? '');
  const [clientEmail, setClientEmail] = useState(() => appointment?.customers?.email ?? '');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() => {
    if (appointment?.appointment_services?.length) {
      return appointment.appointment_services
        .map((as) => as.services?.id)
        .filter((id): id is string => Boolean(id));
    }
    return appointment?.service_id ? [appointment.service_id] : [];
  });

  const [date, setDate] = useState(() => {
    if (appointment?.slot_start) {
      const apptDate = new Date(appointment.slot_start);
      const istDate = new Date(apptDate.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
      return `${istDate.getUTCFullYear()}-${String(istDate.getUTCMonth() + 1).padStart(2, '0')}-${String(istDate.getUTCDate()).padStart(2, '0')}`;
    }
    return initialDate || todayIST();
  });

  const [selectedTime, setSelectedTime] = useState(() => {
    if (appointment?.slot_start) {
      const apptDate = new Date(appointment.slot_start);
      const istDate = new Date(apptDate.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
      return `${istDate.getUTCHours().toString().padStart(2, '0')}:${istDate.getUTCMinutes().toString().padStart(2, '0')}`;
    }
    if (initialTime) return initialTime;
    let init = currentTimeIST(5);
    if (init < workingHours.start) init = workingHours.start;
    if (init > workingHours.end) init = workingHours.end;
    return init;
  });

  const [notes, setNotes] = useState(() => appointment?.notes ?? '');

  const [availability, setAvailability] = useState<{ available: boolean; conflictReason?: string } | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);

  // Debounced availability check
  useEffect(() => {
    if (selectedServiceIds.length === 0 || !date || !selectedTime) {
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingAvailability(true);
      try {
        const res = await checkSlotAvailability(
          slug,
          staffId,
          date,
          selectedTime,
          totalDuration,
          isEdit ? appointment?.id : undefined
        );
        setAvailability(res);
      } catch {
        setAvailability({ available: false, conflictReason: 'Failed to check availability.' });
      } finally {
        setCheckingAvailability(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [selectedServiceIds.length, date, selectedTime, totalDuration, slug, staffId, isEdit, appointment?.id]);

  const [comboboxContainer, setComboboxContainer] = useState<HTMLElement | null>(null);
  const containerRef = useCallback((node: HTMLElement | null) => {
    if (node) {
      const portal = node.closest('[data-slot="dialog-portal"]') as HTMLElement;
      setComboboxContainer(portal || node);
    } else {
      setComboboxContainer(null);
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (selectedServiceIds.length === 0) {
      setError('Please choose at least one service.');
      return;
    }
    if (availability && !availability.available) {
      setError('Selected time is not available.');
      return;
    }
    if (isEdit && appointment && new Date(appointment.slot_start).getTime() <= Date.now()) {
      setError('Cannot edit past appointments.');
      return;
    }
    if (!isEdit && toIST(date, selectedTime).getTime() <= Date.now()) {
      setError('Selected time has already passed.');
      setAvailability({ available: false, conflictReason: 'This time slot has already passed.' });
      return;
    }
    if (!isEdit && (!clientName || !clientPhone)) {
      setError('Client name and phone are required.');
      return;
    }

    // For edit — require the confirmation step
    if (isEdit && !editConfirmed) {
      setEditConfirmed(true);
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const slotStartObj = toIST(date, selectedTime);
        const slotEndObj = new Date(slotStartObj.getTime() + totalDuration * 60 * 1000);

        if (isEdit && appointment) {
          await updateStaffAppointmentDetails(slug, {
            appointmentId: appointment.id,
            serviceIds: selectedServiceIds,
            slotStart: slotStartObj.toISOString(),
            slotEnd: slotEndObj.toISOString(),
            notes: notes || null,
          });
        } else {
          const customer = await upsertSalonCustomerAsStaff(slug, {
            name: clientName,
            phone: clientPhone,
            email: clientEmail || null,
          });
          await createStaffAppointment(slug, {
            customerId: customer.id,
            serviceIds: selectedServiceIds,
            slotStart: slotStartObj.toISOString(),
            slotEnd: slotEndObj.toISOString(),
            notes: notes || undefined,
          });
        }

        setSuccess(true);
        onSuccess?.();
        router.refresh();
        setTimeout(() => onOpenChange(false), 1200);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
        setEditConfirmed(false);
      }
    });
  }

  if (success) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm font-medium text-emerald-600">
          ✓ {isEdit ? 'Appointment updated successfully' : 'Appointment created successfully'}
        </p>
      </div>
    );
  }

  return (
    <form ref={containerRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* ── EDIT WARNING BANNER ── */}
      {isEdit && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40 px-3 py-2.5 flex gap-2.5">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Please ask and confirm with the customer before editing.</span>{' '}
            Changes to the appointment time or services should only be made with the customer&apos;s approval.
          </div>
        </div>
      )}

      {/* ── CONFIRMATION STEP ── */}
      {isEdit && editConfirmed && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-xs text-primary font-medium">
          ⚠ You are about to save changes to this appointment. Have you confirmed these changes with the customer?
        </div>
      )}

      {/* Client details (new appointments only) */}
      {!isEdit && (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</legend>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sm-client-name" className="text-xs">Name *</Label>
              <Input
                id="sm-client-name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Full name"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sm-client-phone" className="text-xs">Phone *</Label>
              <Input
                id="sm-client-phone"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                type="tel"
                placeholder="9876543210"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sm-client-email" className="text-xs">Email (optional)</Label>
            <Input
              id="sm-client-email"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </div>
        </fieldset>
      )}

      {/* Edit mode: show read-only client info */}
      {isEdit && appointment?.customers && (
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Client (Read-only)</span>
          <span className="text-sm font-medium">{appointment.customers.name}</span>
          <span className="text-xs text-muted-foreground">{appointment.customers.phone}</span>
        </div>
      )}

      {/* Services */}
      <fieldset className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Service{selectedServiceIds.length > 1 ? 's' : ''} *</Label>
          {selectedServices.length > 0 && (
            <span className="text-[10px] text-muted-foreground font-medium">
              {totalDuration}min · ₹{totalPrice}
            </span>
          )}
        </div>
        <ServiceCombobox
          services={services}
          selectedServiceIds={selectedServiceIds}
          onSelectionChange={setSelectedServiceIds}
          container={comboboxContainer}
          placeholder={selectedServiceIds.length > 0 ? '' : 'Search services…'}
        />
      </fieldset>

      {/* Staff — locked to current staff member */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Staff</Label>
        <Select value={staffId} disabled>
          <SelectTrigger className="bg-muted/50 text-muted-foreground cursor-not-allowed">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {staff.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}{s.role ? ` · ${s.role}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground">Staff is automatically assigned to you</p>
      </div>

      {/* Date */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sm-date" className="text-xs flex items-center gap-1">
          <CalendarDays className="size-3" /> Date *
        </Label>
        <Input
          id="sm-date"
          type="date"
          value={date}
          min={todayIST()}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      {/* Time */}
      <div className="flex flex-col gap-1.5 mt-2">
        <Label className="text-xs flex items-center gap-1 mb-1">
          <Clock className="size-3" /> Time slot *
        </Label>
        {selectedServiceIds.length === 0 ? (
          <p className="text-xs text-muted-foreground">Choose a service first</p>
        ) : (
          <>
            <SmartTimeInput
              value={selectedTime}
              onChange={setSelectedTime}
              minTime={workingHours.start}
              maxTime={workingHours.end}
              stepMinutes={5}
              format={timeFormat}
            />
            <div className="mt-2">
              {checkingAvailability ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded border border-border/50">
                  <Loader2 className="size-3 animate-spin" /> Checking availability…
                </div>
              ) : availability?.available ? (
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded border border-emerald-200 dark:border-emerald-900">
                  <CheckCircle2 className="size-3" /> Time slot is available
                </div>
              ) : availability?.conflictReason ? (
                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                  <AlertCircle className="size-3 shrink-0" />
                  <span>{availability.conflictReason}</span>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5 mt-2">
        <Label htmlFor="sm-notes" className="text-xs">Notes (optional)</Label>
        <Textarea
          id="sm-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any special requests…"
          rows={2}
          className="resize-none"
        />
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive mt-2">
          {error}
        </p>
      )}

      <DialogFooter className="gap-2 mt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending || checkingAvailability || (availability !== null && !availability.available)}
        >
          {isPending
            ? isEdit ? 'Saving…' : 'Creating…'
            : isEdit
              ? editConfirmed ? 'Confirm Save' : 'Save Changes'
              : 'Create Appointment'}
        </Button>
      </DialogFooter>
    </form>
  );
}
