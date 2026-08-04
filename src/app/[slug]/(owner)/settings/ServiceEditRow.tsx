'use client';

import { useState, useTransition } from 'react';
import { updateService, deleteService } from '@/app/actions/owner/services';

type ServiceItem = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
};

export function ServiceEditRow({ service }: { service: ServiceItem }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteService(service.id);
    });
  }

  function handleSave(formData: FormData) {
    startTransition(async () => {
      await updateService(service.id, {
        name: formData.get('name') as string,
        duration_minutes: parseInt(formData.get('duration') as string, 10),
        price: parseFloat(formData.get('price') as string),
      });
      // Collapse after the server action + revalidation cycle completes
      setOpen(false);
    });
  }

  return (
    <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
      {/* Header row — always visible */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <span>
          {service.name} — {service.duration_minutes}min — ₹{service.price}
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={isPending}
          style={{ fontSize: '0.85em', cursor: 'pointer' }}
        >
          {open ? 'Cancel' : 'Edit'}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          style={{ marginLeft: '0.25rem' }}
        >
          Remove
        </button>
      </div>

      {/* Inline edit form — shown only when open */}
      {open && (
        <form
          style={{ marginTop: '0.5rem', paddingLeft: '1rem' }}
          action={handleSave}
        >
          <input
            name="name"
            defaultValue={service.name}
            required
            style={{ marginRight: '0.5rem' }}
          />
          <input
            name="duration"
            type="number"
            defaultValue={service.duration_minutes}
            style={{ width: '7rem', marginRight: '0.5rem' }}
          />
          <input
            name="price"
            type="number"
            step="0.01"
            defaultValue={service.price}
            style={{ width: '7rem', marginRight: '0.5rem' }}
          />
          <button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}
    </li>
  );
}
