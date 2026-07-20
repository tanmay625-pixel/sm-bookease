import "server-only";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import {
  mockSalon,
  mockStaff,
  mockServices,
  mockClients,
  mockAppointments,
  type ApptWithCustomer,
} from "@/lib/mock-data";
import type {
  SalonRow,
  StaffRow,
  ServiceRow,
  CustomerRow,
} from "@/lib/supabase/types";

/**
 * Resilient owner-side data access. Each function tries the live
 * Clerk + Supabase backend and gracefully falls back to mock data when the
 * backend/env is unavailable (e.g. in preview without Clerk keys) so the
 * frontend always renders. Point these at the real actions to go live.
 */

export type AppointmentFilters = {
  dateFrom?: string;
  dateTo?: string;
  status?: "pending" | "confirmed" | "cancelled";
  staffId?: string;
  search?: string;
};

export async function getSalonBySlug(slug: string): Promise<SalonRow> {
  try {
    const supabase = createClerkSupabaseClient();
    const { data } = await supabase.from("salons").select("*").eq("slug", slug).single();
    if (data) return data as SalonRow;
  } catch {
    /* fall through to mock */
  }
  return { ...mockSalon, slug };
}

export async function getAppointments(
  salonId: string,
  filters: AppointmentFilters = {}
): Promise<ApptWithCustomer[]> {
  try {
    const supabase = createClerkSupabaseClient();
    let query = supabase
      .from("appointments")
      .select("*, customers(*)")
      .eq("salon_id", salonId)
      .order("slot_start", { ascending: true });
    if (filters.dateFrom) query = query.gte("slot_start", filters.dateFrom);
    if (filters.dateTo) query = query.lte("slot_start", filters.dateTo);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.staffId) query = query.eq("staff_id", filters.staffId);
    const { data, error } = await query;
    if (!error && data) return applySearch(data as ApptWithCustomer[], filters.search);
  } catch {
    /* fall through to mock */
  }
  return filterMockAppointments(filters);
}

export async function getClients(salonId: string, search?: string): Promise<CustomerRow[]> {
  try {
    const supabase = createClerkSupabaseClient();
    let query = supabase
      .from("customers")
      .select("*")
      .eq("salon_id", salonId)
      .order("created_at", { ascending: false });
    if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    const { data, error } = await query;
    if (!error && data) return data as CustomerRow[];
  } catch {
    /* fall through to mock */
  }
  const term = search?.toLowerCase();
  return term
    ? mockClients.filter((c) => c.name.toLowerCase().includes(term) || c.phone.includes(term))
    : mockClients;
}

export async function getClientDetail(
  clientId: string
): Promise<{ client: CustomerRow; appointments: ApptWithCustomer[] } | null> {
  try {
    const supabase = createClerkSupabaseClient();
    const { data, error } = await supabase
      .from("customers")
      .select("*, appointments(*)")
      .eq("id", clientId)
      .single();
    if (!error && data) {
      const { appointments, ...client } = data as CustomerRow & {
        appointments: ApptWithCustomer[];
      };
      return { client, appointments: appointments ?? [] };
    }
  } catch {
    /* fall through to mock */
  }
  const client = mockClients.find((c) => c.id === clientId);
  if (!client) return null;
  const appointments = mockAppointments
    .filter((a) => a.customer_id === clientId)
    .map((a) => ({ ...a, customers: client }));
  return { client, appointments };
}

export async function getStaff(salonId: string): Promise<StaffRow[]> {
  try {
    const supabase = createClerkSupabaseClient();
    const { data, error } = await supabase.from("staff").select("*").eq("salon_id", salonId);
    if (!error && data && data.length) return data as StaffRow[];
  } catch {
    /* fall through to mock */
  }
  return mockStaff;
}

export async function getServices(salonId: string): Promise<ServiceRow[]> {
  try {
    const supabase = createClerkSupabaseClient();
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("salon_id", salonId)
      .order("name");
    if (!error && data && data.length) return data as ServiceRow[];
  } catch {
    /* fall through to mock */
  }
  return mockServices;
}

// ── mock helpers ──
function applySearch(rows: ApptWithCustomer[], search?: string): ApptWithCustomer[] {
  if (!search) return rows;
  const term = search.toLowerCase();
  return rows.filter(
    (a) =>
      a.customers?.name?.toLowerCase().includes(term) || a.customers?.phone?.includes(term)
  );
}

function filterMockAppointments(filters: AppointmentFilters): ApptWithCustomer[] {
  let rows = [...mockAppointments].sort(
    (a, b) => new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime()
  );
  if (filters.dateFrom) rows = rows.filter((a) => a.slot_start >= filters.dateFrom!);
  if (filters.dateTo) rows = rows.filter((a) => a.slot_start <= filters.dateTo!);
  if (filters.status) rows = rows.filter((a) => a.status === filters.status);
  if (filters.staffId) rows = rows.filter((a) => a.staff_id === filters.staffId);
  return applySearch(rows, filters.search);
}
