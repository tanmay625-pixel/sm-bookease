import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';

// ─────────────────────────────────────────────
// GET — Meta webhook verification handshake
// Meta sends a GET with hub.mode, hub.verify_token, and hub.challenge.
// Echo back hub.challenge if the verify token matches.
// ─────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (
    mode === 'subscribe' &&
    token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ─────────────────────────────────────────────
// POST — Delivery status updates & inbound messages
// Meta sends batched events. Log each one to message_log for debugging
// and for future inbound-reply handling (e.g. OTP replies).
// ─────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();

  try {
    const entries = extractLogEntries(body);

    if (entries.length > 0) {
      await supabase.from('message_log').insert(entries);
    }
  } catch (err) {
    // Non-fatal — always acknowledge so Meta doesn't retry endlessly
    console.error('[WhatsApp Webhook] Failed to log event:', err);
  }

  // Meta expects a 200 quickly; anything else triggers retries
  return NextResponse.json({ ok: true }, { status: 200 });
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

type LogEntry = {
  direction: string;
  status: string | null;
  wa_message_id: string | null;
  phone: string | null;
  payload: Record<string, unknown>;
};

/**
 * Extracts loggable entries from a Meta webhook payload.
 * Handles both status updates (outbound) and inbound messages.
 */
function extractLogEntries(body: Record<string, unknown>): LogEntry[] {
  const entries: LogEntry[] = [];

  const entry = (body.entry as unknown[]) ?? [];

  for (const e of entry) {
    const changes =
      ((e as Record<string, unknown>).changes as unknown[]) ?? [];

    for (const change of changes) {
      const value = (change as Record<string, unknown>)
        .value as Record<string, unknown>;

      // Status updates (delivery receipts for outbound messages)
      const statuses = (value.statuses as unknown[]) ?? [];
      for (const s of statuses) {
        const status = s as Record<string, unknown>;
        entries.push({
          direction: 'outbound',
          status: (status.status as string) ?? null,
          wa_message_id: (status.id as string) ?? null,
          phone: ((status.recipient_id as string) ?? null),
          payload: status,
        });
      }

      // Inbound messages
      const messages = (value.messages as unknown[]) ?? [];
      for (const m of messages) {
        const msg = m as Record<string, unknown>;
        entries.push({
          direction: 'inbound',
          status: (msg.type as string) ?? null,
          wa_message_id: (msg.id as string) ?? null,
          phone: (msg.from as string) ?? null,
          payload: msg,
        });
      }
    }
  }

  return entries;
}
