'use client';

import { useState, useTransition, use } from 'react';
import { requestOtp, verifyOtp } from '@/app/actions/customer/auth';
import { useRouter } from 'next/navigation';

/**
 * Customer OTP sign-in page.
 * Plain HTML form — v0 component will replace the markup.
 * Server actions handle the OTP lifecycle.
 */
export default function CustomerSignInPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const result = await requestOtp(slug, phone);
      if (result.ok) {
        setStep('otp');
      } else {
        setError(result.error ?? 'Something went wrong');
      }
    });
  }

  function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const result = await verifyOtp(slug, phone, otp);
      if (result.ok) {
        router.push(`/${slug}/book`);
      } else {
        setError(result.error ?? 'Invalid code');
      }
    });
  }

  return (
    <main style={{ padding: '2rem', maxWidth: '400px', fontFamily: 'sans-serif' }}>
      <h1>Sign in to book</h1>

      {step === 'phone' ? (
        <form onSubmit={handleRequestOtp}>
          <label>
            Phone number (with country code, e.g. 919876543210)
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              style={{ display: 'block', width: '100%', marginBottom: '1rem' }}
            />
          </label>
          <button type="submit" disabled={isPending}>
            {isPending ? 'Sending…' : 'Send OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp}>
          <p>Enter the 6-digit code sent to {phone}</p>
          <input
            type="text"
            inputMode="numeric"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            required
            style={{ display: 'block', width: '100%', marginBottom: '1rem', letterSpacing: '0.5rem' }}
          />
          <button type="submit" disabled={isPending}>
            {isPending ? 'Verifying…' : 'Verify'}
          </button>
          <button
            type="button"
            onClick={() => setStep('phone')}
            style={{ marginLeft: '1rem' }}
          >
            Back
          </button>
        </form>
      )}

      {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}
    </main>
  );
}
