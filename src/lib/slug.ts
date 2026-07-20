import { createServiceSupabaseClient } from '@/lib/supabase/service';

/**
 * Converts a salon name into a URL-safe slug.
 * e.g. "The Hair Studio & Spa" → "the-hair-studio-spa"
 */
function toBaseSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // strip non-alphanumeric (allow hyphens)
    .trim()
    .replace(/[\s]+/g, '-')        // spaces → hyphens
    .replace(/-+/g, '-')           // collapse multiple hyphens
    .replace(/^-|-$/g, '');        // trim leading/trailing hyphens
}

/**
 * Generates a unique slug for a salon name.
 * Checks the database for collisions and appends -2, -3, etc. if needed.
 *
 * @param salonName - Human-readable salon name
 * @returns A unique slug string
 */
export async function generateSlug(salonName: string): Promise<string> {
  const base = toBaseSlug(salonName) || 'salon';
  const supabase = createServiceSupabaseClient();

  // Fetch all slugs that start with the base to check collisions efficiently
  const { data: slugData } = await supabase
    .from('salons')
    .select('slug')
    .or(`slug.eq.${base},slug.like.${base}-%`);
  const existing = (slugData ?? []) as Array<{ slug: string }>;

  const existingSlugs = new Set(existing.map((r) => r.slug));

  if (!existingSlugs.has(base)) return base;

  let counter = 2;
  while (existingSlugs.has(`${base}-${counter}`)) {
    counter++;
  }
  return `${base}-${counter}`;
}
