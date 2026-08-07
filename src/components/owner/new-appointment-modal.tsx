'use client';

import { useState, useTransition, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { upsertCustomer } from '@/app/actions/owner/customers';
import {
  createAppointmentAsOwner,
  updateAppointmentDetails,
} from '@/app/actions/owner/appointments';
import { getAvailableSlots } from '@/app/actions/customer/booking';
import type { StaffRow, ServiceRow } from '@/lib/supabase/types';
import type { AppointmentWithRelations } from '@/components/token-stub-card';
import { CalendarDays, Clock, Plus, Pencil } from 'lucide-react';

interface NewAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salonId: string;
  salonSlug: string;
  staff: StaffRow[];
  services: ServiceRow[];
  /** Optional existing appointment. When provided, the modal operates in EDIT mode. */
  appointment?: AppointmentWithRelations | null;
  /** Optional callback fired after a successful creation or update. */
  onSuccess?: () => void;
}

export function NewAppointmentModal({
  open,
  onOpenChange,
  salonId,
  salonSlug,
  staff,
  services,
  appointment,
  onSuccess,
}: NewAppointmentModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isEdit = Boolean(appointment);

  // Form fields
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('any');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [slotStart, setSlotStart] = useState('');
  const [notes, setNotes] = useState('');

  // Available slots
  const [slots, setSlots] = useState<{ slotStart: string; slotEnd: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Initialize or reset form state on open / appointment change
  useEffect(() => {
    if (open) {
      if (appointment) {
        setClientName(appointment.customers?.name ?? '');
        setClientPhone(appointment.customers?.phone ?? '');
        setClientEmail(appointment.customers?.email ?? '');
        setServiceId(appointment.service_id);
        setStaffId(appointment.staff_id ?? 'any');
        setDate(
          appointment.slot_start
            ? appointment.slot_start.split('T')[0]
            : new Date().toISOString().split('T')[0]
        );
        setSlotStart(appointment.slot_start);
        setNotes(appointment.notes ?? '');
      } else {
        setClientName('');
        setClientPhone('');
        setClientEmail('');
        setServiceId('');
        setStaffId('any');
        setDate(new Date().toISOString().split('T')[0]);
        setSlotStart('');
        setNotes('');
      }
      setError(null);
      setSuccess(false);
    }
  }, [open, appointment]);

  // Reload available slots whenever service, staff, or date changes
  useEffect(() => {
    if (!serviceId || !date) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);

    getAvailableSlots(salonSlug, serviceId, staffId, date)
      .then((fetchedSlots) => {
        let combined = [...fetchedSlots];

        // In edit mode: if the date matches the appointment's existing slot,
        // ensure its own current slot is available in the list so it doesn't conflict with itself.
        if (
          isEdit &&
          appointment &&
          appointment.slot_start.split('T')[0] === date &&
          (staffId === 'any' || !appointment.staff_id || staffId === appointment.staff_id)
        ) {
          const hasCurrentSlot = combined.some(
            (s) => s.slotStart === appointment.slot_start
          );
          if (!hasCurrentSlot) {
            combined = [
              { slotStart: appointment.slot_start, slotEnd: appointment.slot_end },
              ...combined,
            ].sort(
              (a, b) =>
                new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime()
            );
          }
        }

        setSlots(combined);
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [serviceId, staffId, date, salonSlug, isEdit, appointment]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!serviceId || !slotStart) {
      setError('Please choose a service and a time slot.');
      return;
    }

    if (!isEdit && (!clientName || !clientPhone)) {
      setError('Client name and phone are required.');
      return;
    }
    setError(null);

    let chosenSlot = slots.find((s) => s.slotStart === slotStart);
    if (!chosenSlot && isEdit && appointment && appointment.slot_start === slotStart) {
      chosenSlot = {
        slotStart: appointment.slot_start,
        slotEnd: appointment.slot_end,
      };
    }

    if (!chosenSlot) {
      setError('This time is no longer available. Please select another slot.');
      return;
    }

    startTransition(async () => {
      try {
        if (isEdit && appointment) {
          // Edit existing appointment
          await updateAppointmentDetails({
            appointmentId: appointment.id,
            staffId: staffId === 'any' ? undefined : staffId,
            slotStart: chosenSlot.slotStart,
            slotEnd: chosenSlot.slotEnd,
            notes: notes || undefined,
          });

          setSuccess(true);
          onSuccess?.();
          router.refresh();
          setTimeout(() => {
            onOpenChange(false);
          }, 1000);
        } else {
          // Create new appointment
          const customer = await upsertCustomer(salonId, {
            name: clientName,
            phone: clientPhone,
            email: clientEmail || null,
          });

          await createAppointmentAsOwner({
            salonId,
            customerId: customer.id,
            serviceId,
            staffId: staffId === 'any' ? undefined : staffId,
            slotStart: chosenSlot.slotStart,
            slotEnd: chosenSlot.slotEnd,
            notes: notes || undefined,
          });

          setSuccess(true);
          onSuccess?.();
          router.refresh();
          setTimeout(() => {
            onOpenChange(false);
          }, 1200);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    });
  }

  const today = new Date().toISOString().split('T')[0];
  const selectedService = services.find((s) => s.id === serviceId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {isEdit ? <Pencil className="size-4" /> : <Plus className="size-4" />}
            {isEdit ? 'Edit Appointment' : 'New Appointment'}
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-emerald-600">
              ✓ {isEdit ? 'Appointment updated successfully' : 'Appointment created successfully'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Client details */}
            <fieldset className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Client
                </legend>
                {isEdit && (
                  <span className="text-[10px] text-muted-foreground uppercase font-medium bg-muted px-1.5 py-0.5 rounded">
                    Read-only
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nm-client-name" className="text-xs">
                    Name {!isEdit && '*'}
                  </Label>
                  <Input
                    id="nm-client-name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Full name"
                    disabled={isEdit}
                    required={!isEdit}
                    className={isEdit ? 'bg-muted/50 text-muted-foreground cursor-not-allowed' : ''}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nm-client-phone" className="text-xs">
                    Phone {!isEdit && '*'}
                  </Label>
                  <Input
                    id="nm-client-phone"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="91XXXXXXXXXX"
                    disabled={isEdit}
                    required={!isEdit}
                    className={isEdit ? 'bg-muted/50 text-muted-foreground cursor-not-allowed' : ''}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nm-client-email" className="text-xs">
                  Email (optional)
                </Label>
                <Input
                  id="nm-client-email"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@example.com"
                  disabled={isEdit}
                  className={isEdit ? 'bg-muted/50 text-muted-foreground cursor-not-allowed' : ''}
                />
              </div>
            </fieldset>

            {/* Service + Staff */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="nm-service" className="text-xs">
                    Service {!isEdit && '*'}
                  </Label>
                  {isEdit && (
                    <span className="text-[10px] text-muted-foreground uppercase font-medium bg-muted px-1.5 py-0.5 rounded">
                      Read-only
                    </span>
                  )}
                </div>
                {isEdit ? (
                  <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                    {selectedService ? `${selectedService.name} · ${selectedService.duration_minutes}m` : 'Selected Service'}
                  </div>
                ) : (
                  <Select value={serviceId} onValueChange={setServiceId} required>
                    <SelectTrigger id="nm-service">
                      <SelectValue placeholder="Pick service…" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} · {s.duration_minutes}min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nm-staff" className="text-xs">
                  Staff
                </Label>
                <Select value={staffId} onValueChange={setStaffId}>
                  <SelectTrigger id="nm-staff">
                    <SelectValue placeholder="Any available" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any available</SelectItem>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}{s.role ? ` · ${s.role}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nm-date" className="text-xs flex items-center gap-1">
                <CalendarDays className="size-3" /> Date *
              </Label>
              <Input
                id="nm-date"
                type="date"
                value={date}
                min={today}
                onChange={(e) => {
                  setDate(e.target.value);
                  setSlotStart('');
                }}
                required
              />
            </div>

            {/* Time slot */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Clock className="size-3" /> Time slot *
              </Label>
              {!serviceId ? (
                <p className="text-xs text-muted-foreground">Choose a service first</p>
              ) : loadingSlots ? (
                <p className="text-xs text-muted-foreground">Loading slots…</p>
              ) : slots.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No available slots on this date — try a different day or staff member.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {slots.map((s) => {
                    const label = new Date(s.slotStart).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const selected = slotStart === s.slotStart;
                    return (
                      <button
                        key={s.slotStart}
                        type="button"
                        onClick={() => setSlotStart(s.slotStart)}
                        className={`rounded-md border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          selected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-foreground hover:bg-muted'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nm-notes" className="text-xs">
                Notes (optional)
              </Label>
              <Textarea
                id="nm-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests…"
                rows={2}
                className="resize-none"
              />
            </div>

            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !slotStart}>
                {isPending
                  ? isEdit
                    ? 'Saving…'
                    : 'Creating…'
                  : isEdit
                  ? 'Save Changes'
                  : 'Create Appointment'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
