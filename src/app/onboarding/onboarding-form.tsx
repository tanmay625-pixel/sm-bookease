'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Loader2 } from 'lucide-react';

export function OnboardingForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      try {
        await action(formData);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="salon-name">Salon Name</Label>
        <Input
          id="salon-name"
          name="name"
          type="text"
          placeholder="e.g. The Hair Studio"
          required
          autoFocus
          disabled={isPending}
          className="h-12 text-base px-4 bg-background"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <Button type="submit" disabled={isPending} className="w-full h-12 text-base gap-2">
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            Create my salon
            <ArrowRight className="size-4" />
          </>
        )}
      </Button>
    </form>
  );
}
