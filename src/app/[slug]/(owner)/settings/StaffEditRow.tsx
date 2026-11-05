'use client';

import { useState, useTransition } from 'react';
import { updateStaff, deleteStaff } from '@/app/actions/owner/staff';

type StaffItem = {
  id: string;
  name: string;
  role: string | null;
  phone: string;
  email: string | null;
};

export function StaffEditRow({ staff }: { staff: StaffItem }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [phoneChanged, setPhoneChanged] = useState(false);
  const [currentPhone, setCurrentPhone] = useState(staff.phone);

  function handleDelete() {
    startTransition(async () => {
      await deleteStaff(staff.id);
    });
  }

  function handleSave(formData: FormData) {
    const rawPhone = formData.get('phone') as string;
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
    startTransition(async () => {
      await updateStaff(staff.id, {
        name: formData.get('name') as string,
        role: (formData.get('role') as string) || null,
        phone: cleanPhone,
        email: (formData.get('email') as string) || null,
      });
      setPhoneChanged(false);
      setCurrentPhone(cleanPhone);
      setOpen(false);
    });
  }

  return (
    <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
      {/* Header row — always visible */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <span>{staff.name}{staff.role ? ` (${staff.role})` : ''}</span>
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
          style={{ marginTop: '0.5rem', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
          action={handleSave}
        >
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              name="name"
              defaultValue={staff.name}
              required
              placeholder="Name *"
            />
            <input
              name="role"
              defaultValue={staff.role ?? ''}
              placeholder="Role (optional)"
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                name="phone"
                type="tel"
                defaultValue={staff.phone}
                placeholder="9876543210"
                required
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  e.target.value = val;
                  setPhoneChanged(val !== currentPhone);
                }}
              />
              <input
                name="email"
                type="email"
                defaultValue={staff.email ?? ''}
                placeholder="Email (optional)"
              />
              <button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
            {phoneChanged && (
              <p style={{ fontSize: '0.75rem', color: '#d97706', margin: '0' }}>
                ⚠ Changing the contact number will require the staff member to re-verify their WhatsApp number on next login and their current session will be invalidated.
              </p>
            )}
          </div>
        </form>
      )}
    </li>
  );
}
