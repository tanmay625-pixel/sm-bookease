/**
 * Mock data for BookEase, shaped exactly like the real Supabase rows
 * (see src/lib/supabase/types.ts). Pages use these as a graceful fallback
 * when the live Clerk + Supabase backend is unavailable (e.g. no env in
 * preview), so the frontend always renders. Swapping to real data is a
 * find-and-replace job, not a rewrite.
 */
import type {
  SalonRow,
  StaffRow,
  ServiceRow,
  CustomerRow,
  AppointmentRow,
} from "@/lib/supabase/types";

export type ApptWithCustomer = AppointmentRow & { customers: CustomerRow | null };

const SALON_ID = "salon_sharma";

export const mockSalon: SalonRow = {
  id: SALON_ID,
  owner_clerk_id: "user_mock_owner",
  name: "Sharma Hair Salon",
  slug: "sharma-hair-salon",
  working_hours: { start: "09:00", end: "19:00" },
  working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
  created_at: "2024-01-04T09:00:00.000Z",
};

export const mockStaff: StaffRow[] = [
  { id: "staff_1", salon_id: SALON_ID, name: "Priya Sharma", role: "Senior Stylist", email: "priya@sharmasalon.in", phone: "+91 98200 11223", created_at: "2024-01-04T09:00:00.000Z" },
  { id: "staff_2", salon_id: SALON_ID, name: "Rahul Mehta", role: "Barber", email: "rahul@sharmasalon.in", phone: "+91 98200 44556", created_at: "2024-01-04T09:00:00.000Z" },
  { id: "staff_3", salon_id: SALON_ID, name: "Aisha Khan", role: "Colour Specialist", email: "aisha@sharmasalon.in", phone: "+91 98200 77889", created_at: "2024-01-04T09:00:00.000Z" },
  { id: "staff_4", salon_id: SALON_ID, name: "Vikram Rao", role: "Junior Stylist", email: "vikram@sharmasalon.in", phone: "+91 98200 99001", created_at: "2024-01-04T09:00:00.000Z" },
];

export const mockServices: ServiceRow[] = [
  { id: "svc_1", salon_id: SALON_ID, name: "Haircut & Style", duration_minutes: 45, price: 650, created_at: "2024-01-04T09:00:00.000Z" },
  { id: "svc_2", salon_id: SALON_ID, name: "Beard Trim", duration_minutes: 20, price: 250, created_at: "2024-01-04T09:00:00.000Z" },
  { id: "svc_3", salon_id: SALON_ID, name: "Hair Colour", duration_minutes: 90, price: 2200, created_at: "2024-01-04T09:00:00.000Z" },
  { id: "svc_4", salon_id: SALON_ID, name: "Keratin Treatment", duration_minutes: 120, price: 3500, created_at: "2024-01-04T09:00:00.000Z" },
  { id: "svc_5", salon_id: SALON_ID, name: "Head Massage", duration_minutes: 30, price: 400, created_at: "2024-01-04T09:00:00.000Z" },
  { id: "svc_6", salon_id: SALON_ID, name: "Bridal Package", duration_minutes: 180, price: 8500, created_at: "2024-01-04T09:00:00.000Z" },
];

export const mockClients: CustomerRow[] = [
  { id: "cus_1", salon_id: SALON_ID, name: "Ananya Iyer", phone: "+91 90000 10001", email: "ananya@example.com", created_at: "2024-02-10T09:00:00.000Z" },
  { id: "cus_2", salon_id: SALON_ID, name: "Karan Malhotra", phone: "+91 90000 10002", email: "karan@example.com", created_at: "2024-03-01T09:00:00.000Z" },
  { id: "cus_3", salon_id: SALON_ID, name: "Meera Nair", phone: "+91 90000 10003", email: null, created_at: "2024-03-15T09:00:00.000Z" },
  { id: "cus_4", salon_id: SALON_ID, name: "Dev Patel", phone: "+91 90000 10004", email: "dev@example.com", created_at: "2024-04-02T09:00:00.000Z" },
  { id: "cus_5", salon_id: SALON_ID, name: "Sara Ali", phone: "+91 90000 10005", email: "sara@example.com", created_at: "2024-04-20T09:00:00.000Z" },
  { id: "cus_6", salon_id: SALON_ID, name: "Rohan Gupta", phone: "+91 90000 10006", email: null, created_at: "2024-05-05T09:00:00.000Z" },
  { id: "cus_7", salon_id: SALON_ID, name: "Nisha Verma", phone: "+91 90000 10007", email: "nisha@example.com", created_at: "2024-05-18T09:00:00.000Z" },
  { id: "cus_8", salon_id: SALON_ID, name: "Arjun Singh", phone: "+91 90000 10008", email: "arjun@example.com", created_at: "2024-06-01T09:00:00.000Z" },
  { id: "cus_9", salon_id: SALON_ID, name: "Tara Bose", phone: "+91 90000 10009", email: null, created_at: "2024-06-12T09:00:00.000Z" },
  { id: "cus_10", salon_id: SALON_ID, name: "Imran Sheikh", phone: "+91 90000 10010", email: "imran@example.com", created_at: "2024-06-25T09:00:00.000Z" },
  { id: "cus_11", salon_id: SALON_ID, name: "Pooja Desai", phone: "+91 90000 10011", email: "pooja@example.com", created_at: "2024-07-03T09:00:00.000Z" },
  { id: "cus_12", salon_id: SALON_ID, name: "Sanjay Kapoor", phone: "+91 90000 10012", email: null, created_at: "2024-07-09T09:00:00.000Z" },
];

// ── helpers to build appointment datetimes relative to "today" ──
function atDay(offsetDays: number, hh: number, mm: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}
function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString();
}

type Seed = {
  id: string;
  cus: number; // index into mockClients
  svc: number; // index into mockServices
  staff: number; // index into mockStaff
  day: number;
  hh: number;
  mm: number;
  status: "pending" | "confirmed" | "cancelled";
  notes?: string;
};

const seeds: Seed[] = [
  { id: "appt_1", cus: 0, svc: 0, staff: 0, day: 0, hh: 9, mm: 30, status: "confirmed" },
  { id: "appt_2", cus: 1, svc: 1, staff: 1, day: 0, hh: 10, mm: 0, status: "pending" },
  { id: "appt_3", cus: 2, svc: 2, staff: 2, day: 0, hh: 11, mm: 0, status: "confirmed", notes: "Wants ash-brown tones." },
  { id: "appt_4", cus: 3, svc: 4, staff: 3, day: 0, hh: 13, mm: 0, status: "pending" },
  { id: "appt_5", cus: 4, svc: 0, staff: 0, day: 0, hh: 14, mm: 30, status: "cancelled" },
  { id: "appt_6", cus: 5, svc: 3, staff: 2, day: 0, hh: 16, mm: 0, status: "confirmed" },
  { id: "appt_7", cus: 6, svc: 5, staff: 0, day: 1, hh: 9, mm: 30, status: "pending" },
  { id: "appt_8", cus: 7, svc: 1, staff: 1, day: 1, hh: 11, mm: 0, status: "confirmed" },
  { id: "appt_9", cus: 8, svc: 2, staff: 2, day: 1, hh: 12, mm: 30, status: "pending" },
  { id: "appt_10", cus: 9, svc: 0, staff: 3, day: 1, hh: 15, mm: 0, status: "confirmed" },
  { id: "appt_11", cus: 10, svc: 5, staff: 1, day: 2, hh: 10, mm: 0, status: "pending" },
  { id: "appt_12", cus: 11, svc: 3, staff: 2, day: 2, hh: 13, mm: 0, status: "confirmed" },
  { id: "appt_13", cus: 0, svc: 4, staff: 0, day: 2, hh: 16, mm: 30, status: "pending" },
  // past visits (history)
  { id: "appt_14", cus: 0, svc: 2, staff: 2, day: -14, hh: 11, mm: 0, status: "confirmed" },
  { id: "appt_15", cus: 1, svc: 0, staff: 0, day: -7, hh: 15, mm: 0, status: "confirmed" },
];

export const mockAppointments: ApptWithCustomer[] = seeds.map((s) => {
  const svc = mockServices[s.svc];
  const start = atDay(s.day, s.hh, s.mm);
  const cus = mockClients[s.cus];
  return {
    id: s.id,
    salon_id: SALON_ID,
    customer_id: cus.id,
    staff_id: mockStaff[s.staff].id,
    service_id: svc.id,
    slot_start: start,
    slot_end: addMinutes(start, svc.duration_minutes),
    status: s.status,
    notes: s.notes ?? null,
    created_by: "user_mock_owner",
    created_at: atDay(s.day - 3, 12, 0),
    customers: cus,
  };
});

export function serviceName(id: string): string {
  return mockServices.find((s) => s.id === id)?.name ?? "Service";
}
export function staffName(id: string | null): string {
  if (!id) return "Any available";
  return mockStaff.find((s) => s.id === id)?.name ?? "Staff";
}
export function servicePrice(id: string): number {
  return mockServices.find((s) => s.id === id)?.price ?? 0;
}
