'use client';

import { useState, useTransition, useRef, useCallback, Suspense } from 'react';
import { requestOtp, verifyOtp, saveCustomerName } from '@/app/actions/customer/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Scissors, ArrowLeft, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OtpSignInProps {
  slug: string;
}

const COUNTDOWN_SECONDS = 30;
const OTP_LENGTH = 6;

function OtpSignInContent({ slug }: OtpSignInProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'phone' | 'otp' | 'name'>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [isPending, startTransition] = useTransition();
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const startCountdown = useCallback(() => {
    setCountdown(COUNTDOWN_SECONDS);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  const getDestinationUrl = useCallback(() => {
    const paramsString = searchParams.toString();
    return paramsString ? `/${slug}/book?${paramsString}` : `/${slug}/book`;
  }, [slug, searchParams]);

  /** Only allow digits, cap at 10 chars */
  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
  }

  /** Full E.164 number sent to the server */
  const fullPhone = `91${phone}`;

  function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await requestOtp(slug, fullPhone);
      if (!result.ok) {
        setError(result.error ?? 'Failed to send OTP');
        return;
      }
      setStep('otp');
      startCountdown();
    });
  }

  function handleResend() {
    if (countdown > 0) return;
    setError(null);
    setOtp(Array(OTP_LENGTH).fill(''));
    startTransition(async () => {
      const result = await requestOtp(slug, fullPhone);
      if (!result.ok) {
        setError(result.error ?? 'Failed to resend OTP');
        return;
      }
      startCountdown();
    });
  }

  function handleOtpInput(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
    // Auto-submit when all boxes filled
    if (next.every((d) => d !== '') && next.join('').length === OTP_LENGTH) {
      doVerify(next.join(''));
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < OTP_LENGTH) {
      setError('Please enter the complete 6-digit code.');
      return;
    }
    doVerify(code);
  }

  function doVerify(code: string) {
    setError(null);
    startTransition(async () => {
      const result = await verifyOtp(slug, fullPhone, code);
      if (!result.ok) {
        setError(result.error ?? 'Verification failed');
        setOtp(Array(OTP_LENGTH).fill(''));
        otpRefs.current[0]?.focus();
        return;
      }

      if (result.needsName) {
        // First-time signer: prompt for Name
        setStep('name');
      } else {
        // Returning customer: redirect immediately
        router.push(getDestinationUrl());
      }
    });
  }

  function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveCustomerName(slug, name, email || null);
      if (!result.ok) {
        setError(result.error ?? 'Failed to save name');
        return;
      }
      router.push(getDestinationUrl());
    });
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-sm mx-auto px-4 py-8">
      {/* Logo */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          {step === 'name' ? <UserCheck className="size-6" /> : <Scissors className="size-6" />}
        </div>
        <h1 className="text-xl font-semibold tracking-tight">
          {step === 'name' ? 'Welcome to BookMi!' : 'Sign in'}
        </h1>
        <p className="text-xs text-muted-foreground text-center">
          {step === 'phone'
            ? 'Enter your mobile number to get a one-time code'
            : step === 'otp'
            ? `Code sent to +91 ${phone}`
            : 'Please enter your name to complete your profile'}
        </p>
      </div>

      {/* ── Step 1 — Phone ─────────────────────────────── */}
      {step === 'phone' && (
        <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone-input" className="text-xs">Mobile number</Label>
            <div className="flex items-center gap-0">
              <span className="inline-flex h-7.5 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground select-none">
                +91
              </span>
              <Input
                id="phone-input"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="9876543210"
                required
                autoFocus
                inputMode="numeric"
                maxLength={10}
                className="rounded-l-none"
              />
            </div>
          </div>
          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Sending…' : 'Send OTP →'}
          </Button>
        </form>
      )}

      {/* ── Step 2 — OTP ───────────────────────────────── */}
      {step === 'otp' && (
        <form onSubmit={handleVerify} className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => { setStep('phone'); setError(null); setOtp(Array(OTP_LENGTH).fill('')); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground self-start"
          >
            <ArrowLeft className="size-3.5" /> Change number
          </button>

          {/* OTP boxes */}
          <div className="flex gap-2 justify-center">
            {Array.from({ length: OTP_LENGTH }).map((_, i) => (
              <input
                key={i}
                ref={(el) => { otpRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={otp[i]}
                onChange={(e) => handleOtpInput(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                aria-label={`OTP digit ${i + 1}`}
                className={cn(
                  'h-12 w-10 rounded-lg border border-input bg-background text-center text-lg font-bold',
                  'focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
                  otp[i] ? 'border-primary' : 'border-input'
                )}
              />
            ))}
          </div>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive text-center">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={otp.some((d) => !d)}>
            {isPending ? 'Verifying…' : 'Verify →'}
          </Button>

          {/* Resend */}
          <p className="text-center text-xs text-muted-foreground">
            {countdown > 0 ? (
              <>Resend in <span className="font-medium">{countdown}s</span></>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isPending}
                className="text-primary underline-offset-4 hover:underline"
              >
                Resend code
              </button>
            )}
          </p>
        </form>
      )}

      {/* ── Step 3 — Name (First-time signers) ─────────── */}
      {step === 'name' && (
        <form onSubmit={handleSaveName} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name-input" className="text-xs">Your full name</Label>
            <Input
              id="name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email-input" className="text-xs">Email (optional)</Label>
            <Input
              id="email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. priya@example.com"
            />
          </div>
          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isPending || !name.trim()}>
            {isPending ? 'Saving…' : 'Continue to Booking →'}
          </Button>
        </form>
      )}
    </div>
  );
}

export function OtpSignIn({ slug }: OtpSignInProps) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading…</div>}>
      <OtpSignInContent slug={slug} />
    </Suspense>
  );
}
