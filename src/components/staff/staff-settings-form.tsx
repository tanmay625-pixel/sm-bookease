'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateStaffProfile, changeStaffPassword } from '@/app/actions/staff/profile';
import { Eye, EyeOff, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface StaffSettingsFormProps {
  slug: string;
  profile: {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    role: string | null;
    salon: {
      name: string;
      working_hours: { start: string; end: string };
      working_days: string[];
      time_format: '12h' | '24h';
    };
  };
}

const DAY_LABELS: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

export function StaffSettingsForm({ slug, profile }: StaffSettingsFormProps) {
  const [isPending, startTransition] = useTransition();

  // Profile state
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email ?? '');
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  // Password state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const pwStrength = checkPasswordStrength(newPw);

  function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    startTransition(async () => {
      const result = await updateStaffProfile(slug, { name, email: email || null });
      setProfileMsg(result.ok
        ? { type: 'ok', text: 'Profile updated successfully.' }
        : { type: 'error', text: result.error ?? 'Failed to update profile.' }
      );
    });
  }

  function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setPwMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setPwMsg(null);
    startTransition(async () => {
      const result = await changeStaffPassword(slug, currentPw, newPw);
      if (result.ok) {
        setPwMsg({ type: 'ok', text: 'Password changed successfully.' });
        setCurrentPw('');
        setNewPw('');
        setConfirmPw('');
      } else {
        setPwMsg({ type: 'error', text: result.error ?? 'Failed to change password.' });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Personal Details ── */}
      <section className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Personal Details</h2>
        <form onSubmit={handleProfileSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="staff-name" className="text-xs">Name *</Label>
              <Input
                id="staff-name"
                value={name}
                onChange={(e) => { setName(e.target.value); setProfileMsg(null); }}
                placeholder="Your name"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="staff-email" className="text-xs">Email (optional)</Label>
              <Input
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setProfileMsg(null); }}
                placeholder="you@example.com"
              />
            </div>
          </div>

          {profileMsg && (
            <p className={cn(
              'rounded-lg px-3 py-2 text-xs border',
              profileMsg.type === 'ok'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border-destructive/30 bg-destructive/5 text-destructive'
            )}>
              {profileMsg.text}
            </p>
          )}

          <Button type="submit" size="sm" className="self-start" disabled={isPending}>
            Save Profile
          </Button>
        </form>
      </section>

      {/* ── Account Info (read-only) ── */}
      <section className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Account Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Login Contact Number</Label>
            <div className="flex items-center rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">
              +91 {profile.phone}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Role</Label>
            <div className="flex items-center rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">
              {profile.role ?? '—'}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
          <Info className="size-3.5 shrink-0 mt-0.5" />
          <span>
            To change your login contact number, please contact the salon owner.
            Your phone number is used as your login credential and cannot be changed from here.
          </span>
        </div>
      </section>

      {/* ── Change Password ── */}
      <section className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Change Password</h2>
        <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="current-pw" className="text-xs">Current Password</Label>
            <div className="relative">
              <Input
                id="current-pw"
                type={showCurrent ? 'text' : 'password'}
                value={currentPw}
                onChange={(e) => { setCurrentPw(e.target.value); setPwMsg(null); }}
                placeholder="Current password"
                className="pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-pw" className="text-xs">New Password</Label>
            <div className="bg-muted/60 rounded-lg px-3 py-2 text-xs text-muted-foreground mb-1 space-y-0.5">
              <div className={cn('flex items-center gap-1', newPw.length >= 8 ? 'text-emerald-600' : '')}>
                <CheckCircle2 className={cn('size-3', newPw.length >= 8 ? 'opacity-100' : 'opacity-30')} />
                At least 8 characters
              </div>
              <div className={cn('flex items-center gap-1', /[A-Z]/.test(newPw) ? 'text-emerald-600' : '')}>
                <CheckCircle2 className={cn('size-3', /[A-Z]/.test(newPw) ? 'opacity-100' : 'opacity-30')} />
                1 uppercase letter
              </div>
              <div className={cn('flex items-center gap-1', /[a-z]/.test(newPw) ? 'text-emerald-600' : '')}>
                <CheckCircle2 className={cn('size-3', /[a-z]/.test(newPw) ? 'opacity-100' : 'opacity-30')} />
                1 lowercase letter
              </div>
              <div className={cn('flex items-center gap-1', /[0-9]/.test(newPw) ? 'text-emerald-600' : '')}>
                <CheckCircle2 className={cn('size-3', /[0-9]/.test(newPw) ? 'opacity-100' : 'opacity-30')} />
                1 number
              </div>
            </div>
            <div className="relative">
              <Input
                id="new-pw"
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={(e) => { setNewPw(e.target.value); setPwMsg(null); }}
                placeholder="New password"
                className="pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {newPw && (
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
            <Label htmlFor="confirm-pw" className="text-xs">Confirm New Password</Label>
            <Input
              id="confirm-pw"
              type="password"
              value={confirmPw}
              onChange={(e) => { setConfirmPw(e.target.value); setPwMsg(null); }}
              placeholder="Repeat new password"
              autoComplete="new-password"
              className={cn(
                confirmPw && newPw !== confirmPw ? 'border-destructive focus-visible:ring-destructive' : '',
                confirmPw && newPw === confirmPw ? 'border-emerald-500' : ''
              )}
            />
          </div>

          {pwMsg && (
            <p className={cn(
              'rounded-lg px-3 py-2 text-xs border',
              pwMsg.type === 'ok'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border-destructive/30 bg-destructive/5 text-destructive'
            )}>
              {pwMsg.text}
            </p>
          )}

          <Button
            type="submit"
            size="sm"
            className="self-start"
            disabled={isPending || pwStrength.score < 4 || newPw !== confirmPw || !currentPw}
          >
            Change Password
          </Button>
        </form>
      </section>

      {/* ── Salon Hours (read-only) ── */}
      <section className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Salon Schedule (Read-only)</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Working Hours</Label>
            <div className="flex items-center rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">
              {profile.salon.working_hours.start} – {profile.salon.working_hours.end}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Time Format</Label>
            <div className="flex items-center rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">
              {profile.salon.time_format}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Working Days</Label>
          <div className="flex flex-wrap gap-1.5">
            {profile.salon.working_days.map((day) => (
              <span
                key={day}
                className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
              >
                {DAY_LABELS[day] ?? day}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

