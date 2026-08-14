import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { AppointmentRow, CustomerRow, ServiceRow, StaffRow } from '@/lib/supabase/types';
import { formatISTTime, formatISTDate } from '@/lib/timezone';

export type AppointmentWithRelations = AppointmentRow & {
  customers?: CustomerRow | null;
  services?: ServiceRow | null;
  staff?: StaffRow | null;
  appointment_services?: { services: ServiceRow | null }[];
};

const STATUS_STYLES: Record<
  AppointmentRow['status'],
  { badge: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; dot: string }
> = {
  pending:   { badge: 'outline',      label: 'Pending',   dot: 'bg-amber-400' },
  confirmed: { badge: 'default',      label: 'Confirmed', dot: 'bg-emerald-500' },
  cancelled: { badge: 'destructive',  label: 'Cancelled', dot: 'bg-rose-500' },
};

interface TokenStubCardProps {
  appointment: AppointmentWithRelations;
  /** Extra content rendered at the bottom of the card (e.g. action buttons) */
  actions?: React.ReactNode;
  /** Compact layout for lists — less vertical padding */
  compact?: boolean;
  className?: string;
}

/**
 * TokenStubCard
 *
 * The recurring appointment-card motif across the app. Styled as a ticket
 * stub: rounded corners, soft shadow, and a circular notch on the left edge
 * (created with a radial-gradient mask). Use this component wherever an
 * appointment is displayed — dashboard, appointments table, client detail,
 * customer history, booking success state.
 */
export function TokenStubCard({
  appointment,
  actions,
  compact = false,
  className,
}: TokenStubCardProps) {
  const status = STATUS_STYLES[appointment.status];
  const slotStart = new Date(appointment.slot_start);
  const slotEnd = new Date(appointment.slot_end);

  const timeStr = formatISTTime(appointment.slot_start);
  const endTimeStr = formatISTTime(appointment.slot_end);
  const dateStr = formatISTDate(appointment.slot_start, false);

  const clientName = appointment.customers?.name ?? 'Customer';
  
  let serviceName = 'Appointment';
  if (appointment.appointment_services && appointment.appointment_services.length > 0) {
    serviceName = appointment.appointment_services
      .map((as) => as.services?.name)
      .filter(Boolean)
      .join(' + ');
  } else if (appointment.services) {
    serviceName = appointment.services.name;
  }

  return (
    <div
      className={cn(
        // Card base
        'relative flex items-stretch overflow-hidden rounded-2xl border border-border bg-card shadow-sm',
        // Notch: the left "tear-off" stub edge via a mask — a circle cut out
        // of the left border mid-height using radial-gradient
        'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-5 before:-translate-x-1/2',
        'before:rounded-full before:bg-background before:border before:border-border before:z-10',
        className
      )}
    >
      {/* Left accent strip */}
      <div
        className={cn(
          'w-1.5 flex-shrink-0',
          appointment.status === 'confirmed' && 'bg-emerald-500',
          appointment.status === 'pending'   && 'bg-amber-400',
          appointment.status === 'cancelled' && 'bg-rose-500'
        )}
      />

      {/* Main content */}
      <div className={cn('flex flex-1 flex-col gap-1 pl-4 pr-4', compact ? 'py-3' : 'py-4')}>
        {/* Top row — service name + status badge */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-card-foreground line-clamp-1">
            {serviceName}
          </span>
          <Badge variant={status.badge} className="shrink-0 capitalize text-xs">
            <span className={cn('mr-1 inline-block h-1.5 w-1.5 rounded-full', status.dot)} />
            {status.label}
          </Badge>
        </div>

        {/* Client name & Staff */}
        <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{clientName}</span>
          {appointment.staff?.name && (
            <>
              <span>·</span>
              <span>Staff: {appointment.staff.name}</span>
            </>
          )}
        </div>

        {/* Time row */}
        <div className="mt-0.5 flex items-center gap-2 text-xs font-medium text-foreground">
          <span>{dateStr}</span>
          <span className="text-muted-foreground">·</span>
          <span>{timeStr} – {endTimeStr}</span>
        </div>

        {/* Notes */}
        {appointment.notes && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 italic">
            {appointment.notes}
          </p>
        )}

        {/* Actions slot */}
        {actions && <div className="mt-2">{actions}</div>}
      </div>
    </div>
  );
}
