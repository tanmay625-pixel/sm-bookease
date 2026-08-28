'use client';

import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/ui/theme-toggle';
import { SmartTimeInput } from '@/components/smart-time-input';
import { updateSalonSettings } from '@/app/actions/owner/salon';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

interface BusinessProfileFormProps {
  salonId: string;
  defaultName: string;
  defaultWorkingHours: { start: string; end: string };
  defaultWorkingDays: string[];
  defaultTimeFormat: '12h' | '24h';
}

export function BusinessProfileForm({
  salonId,
  defaultName,
  defaultWorkingHours,
  defaultWorkingDays,
  defaultTimeFormat,
}: BusinessProfileFormProps) {
  const [start, setStart] = useState(defaultWorkingHours.start || '09:00');
  const [end, setEnd] = useState(defaultWorkingHours.end || '17:00');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(defaultTimeFormat);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    const name = formData.get('name') as string;
    const selectedDays = DAYS
      .filter((d) => formData.get(`day_${d.key}`) === 'on')
      .map((d) => d.key);

    startTransition(async () => {
      await updateSalonSettings(salonId, {
        name,
        workingHours: { start, end },
        workingDays: selectedDays,
        timeFormat,
      });
    });
  }

  return (
    <form className="flex flex-col gap-4" action={handleSubmit}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="salon-name" className="text-xs">Studio name</Label>
        <Input
          id="salon-name"
          name="name"
          defaultValue={defaultName}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-xs">Time format</Label>
        <RadioGroup
          value={timeFormat}
          onValueChange={(val: '12h' | '24h') => setTimeFormat(val)}
          className="flex items-center gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="12h" id="r1" />
            <Label htmlFor="r1" className="cursor-pointer font-normal text-sm">12-hour (1:00 PM)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="24h" id="r2" />
            <Label htmlFor="r2" className="cursor-pointer font-normal text-sm">24-hour (13:00)</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label className="text-xs">Opens at</Label>
          <SmartTimeInput
            value={start}
            onChange={setStart}
            stepMinutes={30}
            minTime="00:00"
            maxTime="23:55"
            format={timeFormat}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-xs">Closes at</Label>
          <SmartTimeInput
            value={end}
            onChange={setEnd}
            stepMinutes={30}
            minTime="00:00"
            maxTime="23:55"
            format={timeFormat}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mt-2">
        <Label className="text-xs">Working days</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {DAYS.map((d) => (
            <label key={d.key} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                name={`day_${d.key}`}
                defaultChecked={defaultWorkingDays.includes(d.key)}
                className="rounded border-border"
              />
              <span className="text-xs">{d.label}</span>
            </label>
          ))}
        </div>
        <Label className="text-xs mt-2 mb-1">Theme</Label>
        <ModeToggle />
      </div>

      <Button type="submit" size="sm" className="self-start mt-2" disabled={isPending}>
        {isPending ? 'Saving...' : 'Save changes'}
      </Button>
    </form>
  );
}