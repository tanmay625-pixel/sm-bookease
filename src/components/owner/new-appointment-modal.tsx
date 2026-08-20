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
import { checkSlotAvailability } from '@/app/actions/customer/booking';
import type { StaffRow, ServiceRow } from '@/lib/supabase/types';
import type { AppointmentWithRelations } from '@/components/token-stub-card';
import { CalendarDays, Clock, Plus, Pencil, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { todayIST, toIST, currentTimeIST } from '@/lib/timezone';
import { ScrollTimePicker } from '@/components/scroll-time-picker';
import {
  Combobox,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox';

interface NewAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salonId: string;
  salonSlug: string;
  staff: StaffRow[];
  services: ServiceRow[];
  workingHours: { start: string; end: string };
  /** Optional existing appointment. When provided, the modal operates in EDIT mode. */
  appointment?: AppointmentWithRelations | null;
  /** Optional callback fired after a successful creation or update. */
  onSuccess?: () => void;
  /** Optional prefilled date for new appointments (YYYY-MM-DD) */
  initialDate?: string;
  /** Optional prefilled time for new appointments (HH:MM) */
  initialTime?: string;
}

export function NewAppointmentModal({
  open,
  onOpenChange,
  salonId,
  salonSlug,
  staff,
  services,
  workingHours,
  appointment,
  onSuccess,
  initialDate,
  initialTime,
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
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [staffId, setStaffId] = useState('any');
  const [date, setDate] = useState(() => todayIST());
  const [selectedTime, setSelectedTime] = useState(() => {
    let init = currentTimeIST(5);
    if (init < workingHours.start) init = workingHours.start;
    if (init > workingHours.end) init = workingHours.end;
    return init;
  });
  const [notes, setNotes] = useState('');

  // Availability state
  const [availability, setAvailability] = useState<{ available: boolean; conflictReason?: string } | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const anchorRef = useComboboxAnchor();

  // Initialize or reset form state on open / appointment change
  useEffect(() => {
    if (open) {
      if (appointment) {
        setClientName(appointment.customers?.name ?? '');
        setClientPhone(appointment.customers?.phone ?? '');
        setClientEmail(appointment.customers?.email ?? '');
        const initIds = appointment.appointment_services?.length
          ? appointment.appointment_services
              .map((as) => as.services?.id)
              .filter((id): id is string => Boolean(id))
          : [appointment.service_id];
        setSelectedServiceIds(initIds);
        setStaffId(appointment.staff_id ?? 'any');
        
        const apptDate = appointment.slot_start ? new Date(appointment.slot_start) : new Date();
        const yyyyMmDd = appointment.slot_start ? appointment.slot_start.split('T')[0] : todayIST();
        setDate(yyyyMmDd);
        
        const h = apptDate.getHours();
        const m = apptDate.getMinutes();
        setSelectedTime(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        
        setNotes(appointment.notes ?? '');
      } else {
        setClientName('');
        setClientPhone('');
        setClientEmail('');
        setSelectedServiceIds([]);
        setStaffId('any');
        setDate(initialDate || todayIST());
        if (initialTime) {
          setSelectedTime(initialTime);
        } else {
          let init = currentTimeIST(5);
          if (init < workingHours.start) init = workingHours.start;
          if (init > workingHours.end) init = workingHours.end;
          setSelectedTime(init);
        }
        setNotes('');
      }
      setError(null);
      setSuccess(false);
      setAvailability(null);
    }
  }, [open, appointment, workingHours.start, initialDate, initialTime]);

  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);

  // Debounced availability check
  useEffect(() => {
    if (!open || selectedServiceIds.length === 0 || !date || !selectedTime) return;

    setCheckingAvailability(true);
    setAvailability(null);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await checkSlotAvailability(
          salonSlug,
          staffId,
          date,
          selectedTime,
          totalDuration,
          isEdit ? appointment?.id : undefined
        );
        setAvailability(res);
      } catch (err) {
        setAvailability({ available: false, conflictReason: 'Failed to check availability.' });
      } finally {
        setCheckingAvailability(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [open, selectedServiceIds, staffId, date, selectedTime, totalDuration, salonSlug, isEdit, appointment]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (selectedServiceIds.length === 0) {
      setError('Please choose at least one service.');
      return;
    }

    if (!availability?.available) {
      setError('Selected time is not available.');
      return;
    }

    if (isEdit && appointment && new Date(appointment.slot_start).getTime() <= Date.now()) {
      setError('Cannot edit past appointments.');
      return;
    }

    if (!isEdit && (!clientName || !clientPhone)) {
      setError('Client name and phone are required.');
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        const slotStartObj = toIST(date, selectedTime);
        const slotEndObj = new Date(slotStartObj.getTime() + totalDuration * 60 * 1000);

        if (isEdit && appointment) {
          await updateAppointmentDetails({
            appointmentId: appointment.id,
            salonId,
            serviceIds: selectedServiceIds,
            staffId: staffId === 'any' ? undefined : staffId,
            slotStart: slotStartObj.toISOString(),
            slotEnd: slotEndObj.toISOString(),
            notes: notes || undefined,
          });

          setSuccess(true);
          onSuccess?.();
          router.refresh();
          setTimeout(() => {
            onOpenChange(false);
          }, 1000);
        } else {
          const customer = await upsertCustomer(salonId, {
            name: clientName,
            phone: clientPhone,
            email: clientEmail || null,
          });

          await createAppointmentAsOwner({
            salonId,
            customerId: customer.id,
            serviceIds: selectedServiceIds,
            staffId: staffId === 'any' ? undefined : staffId,
            slotStart: slotStartObj.toISOString(),
            slotEnd: slotEndObj.toISOString(),
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

  const [comboboxContainer, setComboboxContainer] = useState<HTMLElement | null>(null);

  const dialogContentRef = useCallback((node: HTMLElement | null) => {
    if (node) {
      const portal = node.closest('[data-slot="dialog-portal"]') as HTMLElement;
      setComboboxContainer(portal || node);
    } else {
      setComboboxContainer(null);
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={dialogContentRef} className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
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

            {/* Service(s) */}
            <fieldset className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">
                  Service{selectedServiceIds.length > 1 ? 's' : ''} *
                </Label>
                {selectedServices.length > 0 && (
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {totalDuration}min · ₹{totalPrice}
                  </span>
                )}
              </div>
              <Combobox
                multiple
                value={selectedServiceIds}
                onValueChange={(newValue) => setSelectedServiceIds(newValue)}
                itemToStringLabel={(id) => services.find(s => s.id === id)?.name ?? ''}
                items={services.map((s) => s.id)}
              >
                <ComboboxChips ref={anchorRef}>
                  <ComboboxValue>
                    {(values: string[]) => (
                      <>
                        {values.map((id) => {
                          const svc = services.find(s => s.id === id);
                          return svc ? (
                            <ComboboxChip key={id}>
                              {svc.name}
                            </ComboboxChip>
                          ) : null;
                        })}
                        <ComboboxChipsInput placeholder={values.length > 0 ? '' : 'Search services…'} />
                      </>
                    )}
                  </ComboboxValue>
                </ComboboxChips>
                <ComboboxContent anchor={anchorRef} container={comboboxContainer}>
                  <ComboboxList>
                    {(id: string) => {
                      const svc = services.find((s) => s.id === id);
                      return svc ? (
                        <ComboboxItem key={id} value={id}>
                          <span className="flex-1">{svc.name}</span>
                          <span className="tabular-nums text-muted-foreground ml-auto mr-5">
                            {svc.duration_minutes}m · ₹{svc.price}
                          </span>
                        </ComboboxItem>
                      ) : null;
                    }}
                  </ComboboxList>
                  <ComboboxEmpty>No services found</ComboboxEmpty>
                </ComboboxContent>
              </Combobox>
            </fieldset>

            {/* Staff */}
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

            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nm-date" className="text-xs flex items-center gap-1">
                <CalendarDays className="size-3" /> Date *
              </Label>
              <Input
                id="nm-date"
                type="date"
                value={date}
                min={todayIST()}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {/* Time slot */}
            <div className="flex flex-col gap-1.5 mt-2">
              <Label className="text-xs flex items-center gap-1 mb-1">
                <Clock className="size-3" /> Time slot *
              </Label>
              {selectedServiceIds.length === 0 ? (
                <p className="text-xs text-muted-foreground">Choose a service first</p>
              ) : (
                <>
                  <ScrollTimePicker
                    value={selectedTime}
                    onChange={setSelectedTime}
                    minTime={workingHours.start}
                    maxTime={workingHours.end}
                    minuteStep={5}
                  />

                  {/* Inline Availability Status */}
                  <div className="mt-2">
                    {checkingAvailability ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded border border-border/50">
                        <Loader2 className="size-3 animate-spin" />
                        Checking availability…
                      </div>
                    ) : availability?.available ? (
                      <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded border border-emerald-200 dark:border-emerald-900">
                        <CheckCircle2 className="size-3" />
                        Time slot is available
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
              <Button type="submit" disabled={isPending || checkingAvailability || !availability?.available}>
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
