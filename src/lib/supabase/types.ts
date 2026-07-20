/**
 * Supabase Database type stub.
 *
 * Replace this with the generated types from the Supabase CLI:
 *   npx supabase gen types typescript --project-id <your-project-id> > src/lib/supabase/types.ts
 *
 * Until then, this allows createClient<Database>() calls to compile.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type WorkingHours = { start: string; end: string };

export type Database = {
  public: {
    Tables: {
      salons: {
        Row: {
          id: string;
          owner_clerk_id: string;
          name: string;
          slug: string;
          working_hours: WorkingHours;
          working_days: string[];
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['salons']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<
          Database['public']['Tables']['salons']['Insert']
        >;
      };
      staff: {
        Row: {
          id: string;
          salon_id: string;
          name: string;
          role: string | null;
          email: string | null;
          phone: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['staff']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<Database['public']['Tables']['staff']['Insert']>;
      };
      services: {
        Row: {
          id: string;
          salon_id: string;
          name: string;
          duration_minutes: number;
          price: number;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['services']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<Database['public']['Tables']['services']['Insert']>;
      };
      customers: {
        Row: {
          id: string;
          salon_id: string;
          name: string;
          phone: string;
          email: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['customers']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };
      appointments: {
        Row: {
          id: string;
          salon_id: string;
          customer_id: string;
          staff_id: string | null;
          service_id: string;
          slot_start: string;
          slot_end: string;
          status: 'pending' | 'confirmed' | 'cancelled';
          notes: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['appointments']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<
          Database['public']['Tables']['appointments']['Insert']
        >;
      };
      otp_codes: {
        Row: {
          id: string;
          salon_id: string;
          phone: string;
          code_hash: string;
          expires_at: string;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['otp_codes']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<Database['public']['Tables']['otp_codes']['Insert']>;
      };
      message_log: {
        Row: {
          id: string;
          salon_id: string | null;
          phone: string | null;
          template_name: string | null;
          direction: string;
          status: string | null;
          wa_message_id: string | null;
          payload: Json | null;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['message_log']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<
          Database['public']['Tables']['message_log']['Insert']
        >;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      appointment_status: 'pending' | 'confirmed' | 'cancelled';
    };
  };
};

// ─────────────────────────────────────────────
// Convenience row type aliases
// Use these for casting query results when TypeScript's inference
// breaks down on the stub (before Supabase CLI type gen is run).
// ─────────────────────────────────────────────

export type SalonRow = Database['public']['Tables']['salons']['Row'];
export type StaffRow = Database['public']['Tables']['staff']['Row'];
export type ServiceRow = Database['public']['Tables']['services']['Row'];
export type CustomerRow = Database['public']['Tables']['customers']['Row'];
export type AppointmentRow = Database['public']['Tables']['appointments']['Row'];
export type OtpCodeRow = Database['public']['Tables']['otp_codes']['Row'];
export type MessageLogRow = Database['public']['Tables']['message_log']['Row'];
export type AppointmentStatus = Database['public']['Enums']['appointment_status'];
