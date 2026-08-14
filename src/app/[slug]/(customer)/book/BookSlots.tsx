'use client';

import { useTransition, useState } from 'react';
import { createAppointmentAsCustomer } from '@/app/actions/customer/booking';
import Link from 'next/link';
import { formatISTTime } from '@/lib/timezone';

type Slot = { slotStart: string; slotEnd: string };

export default function BookSlots({
  slug,
  serviceIds,
  staffId,
  slots,
  isSignedIn,
}: {
  slug: string;
  serviceIds: string[];
  staffId: string;
  slots: Slot[];
  isSignedIn: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [bookedSlot, setBookedSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isSignedIn) {
    return (
      <p>
        <Link href={`/${slug}/sign-in`}>Sign in with your phone number</Link> to book a slot.
      </p>
    );
  }

  if (bookedSlot) {
    return (
      <p style={{ color: 'green' }}>
        ✓ Appointment booked for{' '}
        {formatISTTime(bookedSlot)}.{' '}
        <Link href={`/${slug}/history`}>View my appointments →</Link>
      </p>
    );
  }

  return (
    <>
      {error && (
        <p style={{ color: 'red', marginBottom: '0.5rem' }}>{error}</p>
      )}
      <ul
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          listStyle: 'none',
          padding: 0,
        }}
      >
        {slots.map((slot) => (
          <li key={slot.slotStart}>
            <button
              type="button"
              disabled={isPending}
              style={{ padding: '0.5rem 1rem', cursor: isPending ? 'wait' : 'pointer' }}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  try {
                    await createAppointmentAsCustomer(slug, {
                      serviceIds,
                      staffId: staffId === 'any' ? undefined : staffId,
                      slotStart: slot.slotStart,
                    });
                    setBookedSlot(slot.slotStart);
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : 'Booking failed — please try again.'
                    );
                  }
                });
              }}
            >
              {formatISTTime(slot.slotStart)}
            </button>
          </li>
        ))}
      </ul>
      {isPending && <p style={{ marginTop: '0.5rem' }}>Booking…</p>}
    </>
  );
}
