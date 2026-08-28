'use client';

import { useState } from 'react';
import { TokenStubCard } from '@/components/token-stub-card';
import { AppointmentDetailsModal } from '@/components/owner/appointment-details-modal';
import type { AppointmentWithRelations } from '@/components/token-stub-card';
import type { StaffRow, ServiceRow } from '@/lib/supabase/types';

interface AppointmentCardWithDetailsProps {
  appointment: AppointmentWithRelations;
  /** Extra content rendered at the bottom of the card (e.g. status action buttons) */
  actions?: React.ReactNode;
  compact?: boolean;
  className?: string;
  /** Props below are forwarded to AppointmentDetailsModal for edit support */
  salonId?: string;
  salonSlug?: string;
  staff?: StaffRow[];
  services?: ServiceRow[];
  workingHours?: { start: string; end: string };
  onSuccess?: () => void;
  timeFormat?: '12h' | '24h';
}

/**
 * AppointmentCardWithDetails
 *
 * Wraps TokenStubCard with a click handler that opens the AppointmentDetailsModal.
 * Use this instead of TokenStubCard wherever appointments are listed.
 */
export function AppointmentCardWithDetails({
  appointment,
  actions,
  compact,
  className,
  salonId,
  salonSlug,
  staff,
  services,
  workingHours,
  onSuccess,
  timeFormat = '12h',
}: AppointmentCardWithDetailsProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <>
      <div
        className="cursor-pointer"
        onClick={() => setDetailsOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setDetailsOpen(true);
          }
        }}
      >
        <TokenStubCard
          appointment={appointment}
          actions={actions}
          compact={compact}
          className={className}
        />
      </div>

      <AppointmentDetailsModal
        appointment={appointment}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        salonId={salonId}
        salonSlug={salonSlug}
        staff={staff}
        services={services}
        workingHours={workingHours}
        onSuccess={onSuccess}
        timeFormat={timeFormat}
      />
    </>
  );
}
