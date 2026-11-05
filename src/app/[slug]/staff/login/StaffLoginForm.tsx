'use client';

import { useState, useTransition, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  checkStaffPhone,
  requestStaffOtp,
  verifyStaffOtpAndSetPassword,
  loginStaffWithPassword,
} from '@/app/actions/staff/auth';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Lock,
  Phone,
} from 'lucide-react';

type Step = 'phone' | 'password' | 'otp' | 'set_password';
type OtpReason = 'activate' | 'forgot_password';

const OTP_LENGTH = 6;
const COUNTDOWN_SECONDS = 60;

// Password strength checker
function checkPasswordStrength(pw: string): { label: string; color: string; score: number } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;

  if (score <= 1) return { label: 'Weak', color: 'bg-rose-500', score };
  if (score === 2) return { label: 'Fair', color: 'bg-amber-400', score };
  if (score === 3) return { label: 'Good', color: 'bg-blue-500', score };
  return { label: 'Strong', color: 'bg-emerald-500', score };
}

export function StaffLoginForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<Step>('phone');
  const [otpReason, setOtpReason] = useState<OtpReason>('activate');
  const [staffName, setStaffName] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
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

  // ── Step 1: Phone check ────────────────────

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
    setError(null);
  }

  function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await checkStaffPhone(slug, phone);
      if (!result.ok) {
        setError(result.error ?? 'Something went wrong.');
        return;
      }
      if (result.state === 'not_found') {
        setError('This number is not registered for this salon. Contact your manager.');
        return;
      }
      setStaffName(result.name ?? null);
      if (result.state === 'first_login') {
        // First time — need OTP activation
        await sendOtp('activate');
      } else {
        // Returning staff — show password input
        setStep('password');
      }
    });
  }

  // ── Send OTP ──────────────────────────────

  async function sendOtp(reason: OtpReason) {
    setOtpReason(reason);
    const result = await requestStaffOtp(slug, phone, reason);
    if (!result.ok) {
      setError(result.error ?? 'Failed to send OTP.');
      return;
    }
    setOtp(Array(OTP_LENGTH).fill(''));
    setStep('otp');
    startCountdown();
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  }

  // ── Step 2a: Password login ────────────────

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await loginStaffWithPassword(slug, phone, password);
      if (!result.ok) {
        setError(result.error ?? 'Login failed.');
        return;
      }
      router.push(`/${slug}/staff/dashboard`);
      router.refresh();
    });
  }

  // ── Forgot password ───────────────────────

  function handleForgotPassword() {
    setError(null);
    startTransition(async () => {
      await sendOtp('forgot_password');
    });
  }

  // ── Step 2b: OTP verification ──────────────

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value.slice(-1);
    setOtp(updated);
    setError(null);
    if (value && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (text.length === OTP_LENGTH) {
      e.preventDefault();
      setOtp(text.split(''));
      otpRefs.current[OTP_LENGTH - 1]?.focus();
    }
  }

  const otpValue = otp.join('');

  function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otpValue.length !== OTP_LENGTH) {
      setError('Please enter the full 6-digit OTP.');
      return;
    }
    setError(null);
    // For forgot_password, we also need a new password — go to set_password step
    // For activate, same — both flow to set_password
    setStep('set_password');
  }

  function handleResendOtp() {
    if (countdown > 0) return;
    startTransition(async () => {
      await sendOtp(otpReason);
    });
  }

  // ── Step 3: Set password ───────────────────

  const pwStrength = checkPasswordStrength(newPassword);

  function handleSetPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await verifyStaffOtpAndSetPassword(slug, phone, otpValue, newPassword);
      if (!result.ok) {
        setError(result.error ?? 'Failed to set password.');
        // If OTP was bad, go back to OTP step
        if (result.error?.includes('OTP')) setStep('otp');
        return;
      }
      router.push(`/${slug}/staff/dashboard`);
      router.refresh();
    });
  }

  // ── Back navigation ───────────────────────

  function handleBack() {
    setError(null);
    setOtp(Array(OTP_LENGTH).fill(''));
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    if (step === 'password' || step === 'otp') setStep('phone');
    else if (step === 'set_password') setStep('otp');
  }

  // ── Render ────────────────────────────────

  return (
    <div className="w-full rounded-2xl border border-border bg-card shadow-sm p-6 flex flex-col gap-5">

      {/* ── Phone step ── */}
      {step === 'phone' && (
        <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="staff-phone" className="text-sm flex items-center gap-1.5">
              <Phone className="size-3.5 text-muted-foreground" />
              Mobile Number
            </Label>
            <div className="flex items-center rounded-md border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">
              <span className="px-3 py-2 text-sm text-muted-foreground border-r border-input bg-muted/40 select-none">+91</span>
              <Input
                id="staff-phone"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="9876543210"
                value={phone}
                onChange={handlePhoneChange}
                maxLength={10}
                className="border-0 focus-visible:ring-0 rounded-none"
                autoFocus
                autoComplete="tel"
              />
            </div>
          </div>

          {error && <ErrorMsg message={error} />}

          <Button type="submit" disabled={isPending || phone.length !== 10} className="w-full">
            {isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Continue
          </Button>
        </form>
      )}

      {/* ── Password step ── */}
      {step === 'password' && (
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <button type="button" onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <p className="text-sm font-medium">{staffName ? `Welcome back, ${staffName.split(' ')[0]}!` : 'Welcome back!'}</p>
              <p className="text-xs text-muted-foreground">+91 {phone}</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="staff-password" className="text-sm flex items-center gap-1.5">
              <Lock className="size-3.5 text-muted-foreground" />
              Password
            </Label>
            <div className="relative">
              <Input
                id="staff-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Your password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                className="pr-10"
                autoFocus
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {error && <ErrorMsg message={error} />}

          <Button type="submit" disabled={isPending || !password} className="w-full">
            {isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Sign In
          </Button>

          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={isPending}
            className="text-xs text-primary hover:underline self-center disabled:opacity-50"
          >
            Forgot Password?
          </button>
        </form>
      )}

      {/* ── OTP step ── */}
      {step === 'otp' && (
        <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <button type="button" onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5">
                <MessageCircle className="size-4 text-green-600" />
                OTP sent via WhatsApp
              </p>
              <p className="text-xs text-muted-foreground">Sent to +91 {phone}</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground -mt-1">
            {otpReason === 'activate'
              ? 'Enter the 6-digit code to activate your account and set a password.'
              : 'Enter the 6-digit code to reset your password.'}
          </p>

          {/* OTP inputs */}
          <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
            {otp.map((digit, i) => (
              <Input
                key={i}
                ref={(el) => { otpRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                className={cn(
                  'w-10 h-12 text-center text-lg font-semibold p-0',
                  digit ? 'border-primary' : ''
                )}
                autoFocus={i === 0}
              />
            ))}
          </div>

          {error && <ErrorMsg message={error} />}

          <Button
            type="submit"
            disabled={isPending || otpValue.length !== OTP_LENGTH}
            className="w-full"
          >
            {isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Verify OTP
          </Button>

          <div className="text-center text-xs text-muted-foreground">
            {countdown > 0 ? (
              <span>Resend OTP in {countdown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isPending}
                className="text-primary hover:underline disabled:opacity-50"
              >
                Resend OTP
              </button>
            )}
          </div>
        </form>
      )}

      {/* ── Set password step ── */}
      {step === 'set_password' && (
        <form onSubmit={handleSetPasswordSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <button type="button" onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <p className="text-sm font-medium">
                {otpReason === 'activate' ? 'Set your password' : 'Reset your password'}
              </p>
              <p className="text-xs text-muted-foreground">
                {otpReason === 'activate'
                  ? 'Create a secure password to access your account.'
                  : 'Enter a new password for your account.'}
              </p>
            </div>
          </div>

          {/* Password requirements hint */}
          <div className="bg-muted/60 rounded-lg px-3 py-2 text-xs text-muted-foreground space-y-0.5">
            <p className="font-medium text-foreground mb-1">Password must have:</p>
            <PasswordRule met={newPassword.length >= 8} label="At least 8 characters" />
            <PasswordRule met={/[A-Z]/.test(newPassword)} label="1 uppercase letter (A–Z)" />
            <PasswordRule met={/[a-z]/.test(newPassword)} label="1 lowercase letter (a–z)" />
            <PasswordRule met={/[0-9]/.test(newPassword)} label="1 number (0–9)" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password" className="text-sm">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Create password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                className="pr-10"
                autoFocus
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            {/* Strength bar */}
            {newPassword && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', pwStrength.color)}
                    style={{ width: `${(pwStrength.score / 4) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground w-10">{pwStrength.label}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-password" className="text-sm">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
              autoComplete="new-password"
              className={cn(
                confirmPassword && newPassword !== confirmPassword ? 'border-destructive focus-visible:ring-destructive' : '',
                confirmPassword && newPassword === confirmPassword ? 'border-emerald-500' : ''
              )}
            />
            {confirmPassword && newPassword === confirmPassword && (
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="size-3" /> Passwords match
              </p>
            )}
          </div>

          {error && <ErrorMsg message={error} />}

          <Button
            type="submit"
            disabled={isPending || pwStrength.score < 4 || newPassword !== confirmPassword}
            className="w-full"
          >
            {isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            {otpReason === 'activate' ? 'Activate Account' : 'Reset Password'}
          </Button>
        </form>
      )}
    </div>
  );
}

function ErrorMsg({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
      {message}
    </p>
  );
}

function PasswordRule({ met, label }: { met: boolean; label: string }) {
  return (
    <div className={cn('flex items-center gap-1.5', met ? 'text-emerald-600' : 'text-muted-foreground')}>
      <CheckCircle2 className={cn('size-3 shrink-0', met ? 'opacity-100' : 'opacity-30')} />
      <span>{label}</span>
    </div>
  );
}

