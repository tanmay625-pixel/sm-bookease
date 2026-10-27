import 'server-only';
import { createServiceSupabaseClient } from '@/lib/supabase/service';

// ─────────────────────────────────────────────
// Meta WhatsApp Cloud API — direct (no BSP)
//
// API version: v25.0 (current as of July 2026; rotates ~quarterly — verify at
// https://developers.facebook.com/docs/graph-api/guides/versioning before upgrading)
//
// Auth: permanent System User token (NOT the 24-hour App Dashboard quick-test
// token — that one expires and silently breaks production).
// ─────────────────────────────────────────────

const GRAPH_API_VERSION = 'v25.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

type ComponentParameter =
  | { type: 'text'; text: string }
  | { type: 'currency'; currency: { fallback_value: string; code: string; amount_1000: number } }
  | { type: 'date_time'; date_time: { fallback_value: string } };

type TemplateComponent = {
  type: 'header' | 'body' | 'button';
  sub_type?: string;
  index?: string;
  parameters: ComponentParameter[];
};

/**
 * Sends a WhatsApp template message via the Meta Cloud API.
 *
 * @param to            - E.164 phone number (e.g. "919876543210")
 * @param templateName  - Approved template name in WhatsApp Manager
 *                        // TODO: confirm exact template name once approved
 * @param languageCode  - BCP-47 language code (e.g. "en", "en_US")
 * @param params        - Ordered array of text parameter values to inject into the template body
 * @param salonId       - Optional salon ID for logging purposes
 *
 * Template names are NOT final until approved by Meta (24–48h wait).
 * Create templates in WhatsApp Manager (Meta Business Suite) or via the
 * /message_templates Graph API endpoint. Going direct (no BSP) means no
 * BSP subscription fee but also no BSP dashboard for template management.
 */
export async function sendWhatsAppMessage(
  to: string,
  templateName: string,
  languageCode: string,
  params: string[],
  salonId?: string,
  options?: {
    components?: TemplateComponent[];
    hasCopyCodeButton?: boolean;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.error('[WhatsApp] Missing env vars: WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN');
    return { success: false, error: 'WhatsApp not configured' };
  }

  const cleanTo = to.replace(/\D/g, '');

  let components: TemplateComponent[];

  if (options?.components) {
    components = options.components;
  } else {
    components = [];

    if (params.length > 0) {
      components.push({
        type: 'body',
        parameters: params.map((text) => ({ type: 'text' as const, text })),
      });
    }

    // Authentication templates with COPY_CODE buttons (such as costumer_auth or customer_auth)
    // require an explicit button component parameter in the Meta Cloud API payload.
    const isAuthTemplate =
      options?.hasCopyCodeButton ??
      (templateName === 'costumer_auth' ||
        templateName === 'customer_auth' ||
        templateName.toLowerCase().includes('auth') ||
        templateName.toLowerCase().includes('otp'));

    if (isAuthTemplate && params.length > 0) {
      components.push({
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: params[0] }],
      });
    }
  }

  const body = {
    messaging_product: 'whatsapp',
    to: cleanTo,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components.length > 0 ? { components } : {}),
    },
  };

  let waMessageId: string | undefined;
  let status = 'failed';
  let errorMessage: string | undefined;

  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const json = (await response.json()) as Record<string, unknown>;

    if (response.ok) {
      const messages = json.messages as Array<{ id: string }> | undefined;
      waMessageId = messages?.[0]?.id;
      status = 'sent';
    } else {
      const err = json.error as Record<string, unknown> | undefined;
      errorMessage = err
        ? `${err.code}: ${err.message}`
        : `HTTP ${response.status}`;
      console.error('[WhatsApp] API error:', errorMessage, json);
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[WhatsApp] Fetch error:', errorMessage);
  }

  // Log the send attempt (service-role — message_log has RLS-on/no-policies)
  try {
    const supabase = createServiceSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('message_log').insert({
      salon_id: salonId ?? null,
      phone: to,
      template_name: templateName,
      direction: 'outbound',
      status,
      wa_message_id: waMessageId ?? null,
      payload: body as unknown as Record<string, unknown>,
    });
  } catch (logErr) {
    // Non-fatal — don't let logging failures break the send path
    console.error('[WhatsApp] Failed to write message_log:', logErr);
  }

  return errorMessage
    ? { success: false, error: errorMessage }
    : { success: true, messageId: waMessageId };
}
