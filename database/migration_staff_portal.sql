-- ============================================================
-- Staff Portal Authentication Migration
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/uyqddnooqilbosoeudak/sql/new
-- ============================================================

-- 1. Add auth columns to the staff table (REQUIRED for staff login)
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS session_version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS password_set_at timestamptz;

-- 2. Fast lookup index for staff login queries
CREATE INDEX IF NOT EXISTS idx_staff_salon_phone ON staff (salon_id, phone);

-- 3. (Optional) Enforce phone unique per salon
-- Note: If you have existing staff with the same phone in the same salon,
-- update them with distinct numbers first before adding this constraint.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'staff_salon_phone_key'
  ) THEN
    BEGIN
      ALTER TABLE staff ADD CONSTRAINT staff_salon_phone_key UNIQUE (salon_id, phone);
    EXCEPTION
      WHEN unique_violation THEN
        RAISE NOTICE 'Skipping UNIQUE constraint: duplicate phone numbers exist in staff table.';
    END;
  END IF;
END $$;


