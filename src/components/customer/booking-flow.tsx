'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { checkSlotAvailability, createAppointmentAsCustomer } from '@/app/actions/customer/booking';
import { TokenStubCard } from '@/components/token-stub-card';
import type { ServiceRow, StaffRow, AppointmentRow } from '@/lib/supabase/types';
import { formatISTTime, formatISTDate, todayIST, toIST, currentTimeIST } from '@/lib/timezone';
import {
  Scissors,
  User,
  CalendarDays,
  Clock,
  CheckCircle2,
  ChevronLeft,
  CalendarPlus,
  Loader2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { SmartTimeInput } from '@/components/smart-time-input';
import { ServiceCombobox } from '@/components/service-combobox';

interface BookingFlowProps {
  slug: string;
  services: ServiceRow[];
  staff: StaffRow[];
  isSignedIn: boolean;
  workingHours: { start: string; end: string };
  initialParams?: {
    serviceId?: string;
    staffId?: string;
    date?: string;
    slotStart?: string;
    slotEnd?: string;
    time?: string;
  };
  timeFormat?: '12h' | '24h';
}

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { id: 1, label: 'Service', icon: Scissors },
  { id: 2, label: 'Staff',   icon: User },
  { id: 3, label: 'Time',    icon: CalendarDays },
  { id: 4, label: 'Confirm', icon: CheckCircle2 },
] as const;

export function BookingFlow({
  slug,
  services,
  staff,
  isSignedIn,
  workingHours,
  initialParams,
  timeFormat = '12h',
}: BookingFlowProps) {
  const today = todayIST();

  // Resolve initial state if restored from sign-in redirection
  const initServices = initialParams?.serviceId
    ? services.filter((s) => initialParams.serviceId!.split(',').includes(s.id))
    : [];

  const initStaff = initialParams?.staffId
    ? initialParams.staffId === 'any'
      ? 'any'
      : staff.find((st) => st.id === initialParams.staffId) ?? 'any'
    : 'any';

  const initDate = initialParams?.date || today;

  let initTime = initialParams?.time;
  if (!initTime && initialParams?.slotStart) {
      // Legacy fallback
      const d = new Date(initialParams.slotStart);
      const h = d.getHours();
      const m = d.getMinutes();
      initTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
  
  if (!initTime) {
      if (initDate === today) {
          initTime = currentTimeIST(5);
          if (initTime < workingHours.start) initTime = workingHours.start;
          if (initTime > workingHours.end) initTime = workingHours.end;
      } else {
          initTime = workingHours.start || '10:00';
      }
  }

  const initStep: Step = initServices.length > 0 && initialParams?.time ? 4 : 1;

  const [step, setStep] = useState<Step>(initStep);
  const [selectedServices, setSelectedServices] = useState<ServiceRow[]>(initServices);
  const [selectedStaff, setSelectedStaff] = useState<StaffRow | null | 'any'>(initStaff);
  const [date, setDate] = useState<string>(initDate);
  const [selectedTime, setSelectedTime] = useState<string>(initTime);
  const [availability, setAvailability] = useState<{ available: boolean; conflictReason?: string } | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  
  const [bookingPending, startBooking] = useTransition();
  const [booked, setBooked] = useState<AppointmentRow | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration_minutes, 0);

  // Debounced availability check
  useEffect(() => {
    if (step !== 3 || selectedServices.length === 0) return;

    setCheckingAvailability(true);
    setAvailability(null);

    const staffIdOrAny = selectedStaff === 'any' || !selectedStaff ? 'any' : selectedStaff.id;
    
    const timer = setTimeout(async () => {
      try {
        const res = await checkSlotAvailability(slug, staffIdOrAny, date, selectedTime, totalDuration);
        setAvailability(res);
      } catch (err) {
        setAvailability({ available: false, conflictReason: 'Failed to check availability.' });
      } finally {
        setCheckingAvailability(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [step, slug, date, selectedTime, selectedStaff, selectedServices, totalDuration]);

  function goToStep3() {
    if (selectedServices.length === 0) return;
    setStep(3);
  }

  function handleConfirm() {
    if (selectedServices.length === 0 || !availability?.available) return;
    if (!isSignedIn) return; // UI already shows sign-in prompt

    setBookingError(null);
    startBooking(async () => {
      try {
        const slotStartObj = toIST(date, selectedTime);
        const slotStartISO = slotStartObj.toISOString();
        
        const appt = await createAppointmentAsCustomer(slug, {
          serviceIds: selectedServices.map(s => s.id),
          staffId:
            selectedStaff === 'any' || !selectedStaff
              ? undefined
              : selectedStaff.id,
          slotStart: slotStartISO,
        });
        setBooked(appt);
      } catch (err) {
        setBookingError(
          err instanceof Error ? err.message : 'Booking failed — please try again.'
        );
      }
    });
  }

  // Build sign-in link that carries in-progress booking selection
  const signInParams = new URLSearchParams();
  if (selectedServices.length > 0) signInParams.set('serviceId', selectedServices.map(s => s.id).join(','));
  if (selectedStaff) {
    signInParams.set('staffId', selectedStaff === 'any' ? 'any' : selectedStaff.id);
  }
  if (date) signInParams.set('date', date);
  if (selectedTime) signInParams.set('time', selectedTime);
  
  const signInHref = `/${slug}/sign-in?${signInParams.toString()}`;

  // ── Success state ────────────────────────────────────────────────────────
  if (booked) {
    const bookedAppt: AppointmentRow = booked;
    const enriched = {
      ...bookedAppt,
      services: selectedServices[0] ?? undefined,
      appointment_services: selectedServices.map(s => ({ services: s })),
      customers: null,
      staff: selectedStaff && selectedStaff !== 'any' ? staff.find((s) => s.id === selectedStaff.id) ?? null : null,
    };
    return (
      <div className="flex flex-col items-center gap-6 px-4 py-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
          <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">You&apos;re booked!</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your appointment is scheduled below.
          </p>
        </div>
        <TokenStubCard appointment={enriched} className="w-full max-w-sm" />
        <div className="flex flex-col gap-2 w-full max-w-sm">
          <Button variant="outline" asChild className="gap-2">
            <Link href={`/${slug}/history`}>
              <CalendarPlus className="size-4" />
              View my appointments
            </Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setBooked(null);
              setStep(1);
              setSelectedServices([]);
              setSelectedStaff('any');
            }}
          >
            Book another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* ── Progress bar ────────────────────────────────────────── */}
      <div className="border-b border-border bg-background/50 px-4 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {STEPS.map(({ id, label }) => {
            const isDone = step > id;
            const isCurrent = step === id;
            return (
              <div key={id} className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={id > step}
                  onClick={() => id < step && setStep(id as Step)}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                    isDone && 'bg-primary text-primary-foreground cursor-pointer',
                    isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background',
                    !isDone && !isCurrent && 'bg-muted text-muted-foreground cursor-not-allowed'
                  )}
                  aria-label={`Step ${id}: ${label}`}
                >
                  {isDone ? <CheckCircle2 className="size-3.5" /> : id}
                </button>
                <span
                  className={cn(
                    'hidden sm:inline text-xs font-medium',
                    isCurrent && 'text-foreground',
                    !isCurrent && 'text-muted-foreground'
                  )}
                >
                  {label}
                </span>
                {id < 4 && (
                  <div
                    className={cn(
                      'h-0.5 w-6 sm:w-10 ml-1.5 transition-colors',
                      isDone ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Back button (if past step 1) ────────────────────────── */}
      {step > 1 && (
        <div className="px-4 pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => (s - 1) as Step)}
            className="gap-1 text-xs text-muted-foreground hover:text-foreground h-8 px-2"
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>
        </div>
      )}

      {/* ── Step 1: Select Service ──────────────────────────────── */}
      {step === 1 && (
        <div className="flex-1 p-4 max-w-md mx-auto w-full">
          <h2 className="text-sm font-semibold mb-1">Select services</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Search or select what you&apos;d like to book today.
          </p>

          {services.length === 0 ? (
            <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
              No services available at this salon currently.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <ServiceCombobox
                services={services}
                selectedServiceIds={selectedServices.map((s) => s.id)}
                onSelectionChange={(newIds) => {
                  setSelectedServices(services.filter((s) => newIds.includes(s.id)));
                }}
                placeholder="Search or select services…"
              />
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            {selectedServices.length > 0 && (
              <div className="flex items-center justify-between text-sm px-1">
                <span className="text-muted-foreground">
                  {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {totalDuration} mins
                  </span>
                  <span className="font-semibold">
                    ₹{selectedServices.reduce((acc, s) => acc + Number(s.price), 0)}
                  </span>
                </div>
              </div>
            )}
            <Button
              className="w-full"
              disabled={selectedServices.length === 0}
              onClick={() => setStep(2)}
            >
              Continue to Staff →
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Select Staff ────────────────────────────────── */}
      {step === 2 && (
        <div className="flex-1 p-4 max-w-md mx-auto w-full">
          <h2 className="text-sm font-semibold mb-1">Choose staff member</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Select a preferred stylist or pick any available.
          </p>

          <div className="flex flex-col gap-2.5">
            {/* Any Available option */}
            <button
              type="button"
              onClick={() => setSelectedStaff('any')}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-4 text-left transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selectedStaff === 'any'
                  ? 'border-primary bg-primary/5 shadow-xs'
                  : 'border-border bg-card hover:bg-accent/40'
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Scissors className="size-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Any Available</p>
                <p className="text-xs text-muted-foreground">
                  First available staff member
                </p>
              </div>
              {selectedStaff === 'any' && (
                <CheckCircle2 className="size-4 text-primary shrink-0" />
              )}
            </button>

            {/* Named staff */}
            {staff.map((st) => {
              const isSelected =
                selectedStaff !== 'any' && selectedStaff?.id === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStaff(st)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-4 text-left transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-xs'
                      : 'border-border bg-card hover:bg-accent/40'
                  )}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-semibold">
                    {st.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{st.name}</p>
                    {st.role && (
                      <p className="text-xs text-muted-foreground">{st.role}</p>
                    )}
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="size-4 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <Button className="w-full" onClick={goToStep3}>
              Continue to Time →
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Date & Time ─────────────────────────────────── */}
      {step === 3 && (
        <div className="flex-1 p-4 max-w-md mx-auto w-full">
          <h2 className="text-sm font-semibold mb-1">Pick date & time</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Available slots for {selectedServices.map(s => s.name).join(' + ')}
          </p>

          <div className="mb-6">
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Select date
            </label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="mb-6">
            <SmartTimeInput
              value={selectedTime}
              onChange={setSelectedTime}
              minTime={workingHours.start}
              maxTime={workingHours.end}
              stepMinutes={30}
              format={timeFormat}
            />
          </div>

          {/* Inline Availability Status */}
          <div className="mb-4">
            {checkingAvailability ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
                <Loader2 className="size-4 animate-spin" />
                Checking availability…
              </div>
            ) : availability?.available ? (
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900">
                <CheckCircle2 className="size-4" />
                Time slot is available
              </div>
            ) : availability?.conflictReason ? (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                <AlertCircle className="size-4 shrink-0" />
                <span>{availability.conflictReason}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <Button
              className="w-full"
              disabled={checkingAvailability || !availability?.available}
              onClick={() => setStep(4)}
            >
              Continue to Confirm →
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 4: Summary & Confirm ───────────────────────────── */}
      {step === 4 && (
        <div className="flex-1 p-4 max-w-md mx-auto w-full">
          <h2 className="text-sm font-semibold mb-4">Confirm your booking</h2>

          {/* Summary */}
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Service{selectedServices.length > 1 ? 's' : ''}</span>
              <span className="font-medium max-w-[60%] text-right">{selectedServices.map(s => s.name).join(', ')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium">{totalDuration} min</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Staff</span>
              <span className="font-medium">
                {selectedStaff === 'any' ? 'Any available' : (selectedStaff as StaffRow)?.name}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">
                {date && formatISTDate(`${date}T00:00:00Z`, true)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Time</span>
              <span className="font-medium">
                {(() => {
                  const d = toIST(date, selectedTime);
                  const end = new Date(d.getTime() + totalDuration * 60 * 1000);
                  return `${formatISTTime(d.toISOString())} – ${formatISTTime(end.toISOString())}`;
                })()}
              </span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-border pt-3 mt-1">
              <span>Total</span>
              <span className="text-primary">₹{selectedServices.reduce((sum, s) => sum + Number(s.price), 0)}</span>
            </div>
          </div>

          {bookingError && (
            <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {bookingError}
            </p>
          )}

          {!isSignedIn ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground text-center">
                Sign in to confirm this booking.
              </p>
              <Button asChild>
                <Link href={signInHref}>Sign in with phone →</Link>
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={handleConfirm}
              disabled={bookingPending}
            >
              {bookingPending ? 'Booking…' : 'Book Appointment'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
