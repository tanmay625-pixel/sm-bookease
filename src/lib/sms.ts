import 'server-only';
import { createServiceSupabaseClient } from '@/lib/supabase/service';

// ─────────────────────────────────────────────
// SMS Providers for Indian Mobile Numbers
// Supports Fast2SMS (bulkV2) and 2Factor.in (API/V1)
// ─────────────────────────────────────────────

export type SmsProvider = 'fast2sms' | '2factor';

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: SmsProvider;
}

/**
 * Normalizes an Indian phone number to:
 * - tenDigit: "9876543210"
 * - withCountryCode: "919876543210"
 * - e164: "+919876543210"
 */
export function normalizeIndianPhone(phone: string): {
  tenDigit: string;
  withCountryCode: string;
  e164: string;
} {
  const digitsOnly = phone.replace(/\D/g, '');
  const tenDigit = digitsOnly.length > 10 && digitsOnly.startsWith('91')
    ? digitsOnly.slice(2)
    : digitsOnly.slice(-10);

  return {
    tenDigit,
    withCountryCode: `91${tenDigit}`,
    e164: `+91${tenDigit}`,
  };
}

/**
 * Sends an OTP using Fast2SMS API (Quick OTP Route).
 * Endpoint: https://www.fast2sms.com/dev/bulkV2
 */
async function sendFast2SmsOtp(
  tenDigitPhone: string,
  code: string,
  apiKey: string
): Promise<{ success: boolean; messageId?: string; error?: string; rawResponse?: unknown }> {
  try {
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        variables_values: code,
        route: 'otp',
        numbers: tenDigitPhone,
      }),
    });

    const json = (await response.json()) as {
      return?: boolean;
      request_id?: string;
      message?: string[] | string;
    };

    if (response.ok && json.return === true) {
      return {
        success: true,
        messageId: json.request_id,
        rawResponse: json,
      };
    }

    const errorMsg = Array.isArray(json.message)
      ? json.message.join(', ')
      : json.message || `HTTP ${response.status}`;

    return {
      success: false,
      error: errorMsg,
      rawResponse: json,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Sends a general SMS (e.g. Appointment Confirmation) using Fast2SMS Quick SMS route.
 */
async function sendFast2SmsMessage(
  tenDigitPhone: string,
  message: string,
  apiKey: string
): Promise<{ success: boolean; messageId?: string; error?: string; rawResponse?: unknown }> {
  try {
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'q',
        message,
        numbers: tenDigitPhone,
      }),
    });

    const json = (await response.json()) as {
      return?: boolean;
      request_id?: string;
      message?: string[] | string;
    };

    if (response.ok && json.return === true) {
      return {
        success: true,
        messageId: json.request_id,
        rawResponse: json,
      };
    }

    const errorMsg = Array.isArray(json.message)
      ? json.message.join(', ')
      : json.message || `HTTP ${response.status}`;

    return {
      success: false,
      error: errorMsg,
      rawResponse: json,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Sends an OTP using 2Factor.in text SMS API.
 * Endpoint: https://2factor.in/API/V1/{API_KEY}/SMS/{PHONE}/{OTP}
 */
async function send2FactorOtp(
  tenDigitPhone: string,
  code: string,
  apiKey: string
): Promise<{ success: boolean; messageId?: string; error?: string; rawResponse?: unknown }> {
  try {
    // 2Factor expects +91 format as shown in their official cURL:
    // https://2factor.in/API/V1/{API_KEY}/SMS/+91{PHONE}/{OTP}/OTP1
    const template = process.env.TWOFACTOR_OTP_TEMPLATE || 'OTP1';
    const targetPhone = `+91${tenDigitPhone}`;
    const url = `https://2factor.in/API/V1/${encodeURIComponent(apiKey)}/SMS/${encodeURIComponent(targetPhone)}/${encodeURIComponent(code)}/${encodeURIComponent(template)}`;
    const response = await fetch(url, {
      method: 'GET',
    });

    const json = (await response.json()) as {
      Status?: string;
      Details?: string;
    };

    if (response.ok && json.Status?.toLowerCase() === 'success') {
      return {
        success: true,
        messageId: json.Details,
        rawResponse: json,
      };
    }

    return {
      success: false,
      error: json.Details || `HTTP ${response.status}`,
      rawResponse: json,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Sends a general SMS using 2Factor.in Transactional SMS API.
 * Endpoint: https://2factor.in/API/V1/{API_KEY}/ADDON_SERVICES/SEND/TSMS
 */
async function send2FactorMessage(
  tenDigitPhone: string,
  message: string,
  apiKey: string
): Promise<{ success: boolean; messageId?: string; error?: string; rawResponse?: unknown }> {
  try {
    const url = `https://2factor.in/API/V1/${encodeURIComponent(apiKey)}/ADDON_SERVICES/SEND/TSMS`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: process.env.TWOFACTOR_SENDER_ID || 'BOOKMI',
        To: tenDigitPhone,
        Msg: message,
      }),
    });

    const json = (await response.json()) as {
      Status?: string;
      Details?: string;
    };

    if (response.ok && json.Status?.toLowerCase() === 'success') {
      return {
        success: true,
        messageId: json.Details,
        rawResponse: json,
      };
    }

    return {
      success: false,
      error: json.Details || `HTTP ${response.status}`,
      rawResponse: json,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Resolves the active SMS provider from environment variables.
 * Defaults to 'fast2sms'.
 */
export function getActiveSmsProvider(): SmsProvider {
  const provider = (process.env.SMS_PROVIDER || '').trim().toLowerCase();
  if (provider === '2factor' || provider === 'twofactor') {
    return '2factor';
  }
  return 'fast2sms';
}

/**
 * Dispatches an SMS OTP via the configured provider (Fast2SMS or 2Factor)
 * and logs the attempt to Supabase message_log.
 */
export async function sendSmsOtp(
  to: string,
  code: string,
  salonId?: string
): Promise<SmsSendResult> {
  const provider = getActiveSmsProvider();
  const { tenDigit, withCountryCode } = normalizeIndianPhone(to);

  let result: { success: boolean; messageId?: string; error?: string; rawResponse?: unknown };

  if (provider === '2factor') {
    const apiKey = process.env.TWOFACTOR_API_KEY;
    if (!apiKey) {
      const error = 'Missing TWOFACTOR_API_KEY in environment variables';
      console.error(`[SMS:2Factor] ${error}`);
      result = { success: false, error };
    } else {
      result = await send2FactorOtp(tenDigit, code, apiKey);
    }
  } else {
    // Fast2SMS default
    const apiKey = process.env.FAST2SMS_API_KEY;
    if (!apiKey) {
      const error = 'Missing FAST2SMS_API_KEY in environment variables';
      console.error(`[SMS:Fast2SMS] ${error}`);
      result = { success: false, error };
    } else {
      result = await sendFast2SmsOtp(tenDigit, code, apiKey);
    }
  }

  // Record send attempt in Supabase message_log
  try {
    const supabase = createServiceSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('message_log').insert({
      salon_id: salonId ?? null,
      phone: withCountryCode,
      template_name: 'bookmi_otp',
      direction: 'outbound',
      status: result.success ? 'sent' : 'failed',
      wa_message_id: result.messageId ?? null,
      payload: {
        channel: 'sms',
        provider,
        phone_10: tenDigit,
        error: result.error,
        response: result.rawResponse,
      },
    });
  } catch (logErr) {
    console.error('[SMS] Failed to write message_log:', logErr);
  }

  return {
    success: result.success,
    messageId: result.messageId,
    error: result.error,
    provider,
  };
}

/**
 * Dispatches an appointment confirmation SMS via the configured provider
 * and logs the attempt to Supabase message_log.
 */
export async function sendSmsAppointmentConfirmation(
  to: string,
  customerName: string,
  appointmentTime: string,
  salonId?: string
): Promise<SmsSendResult> {
  const provider = getActiveSmsProvider();
  const { tenDigit, withCountryCode } = normalizeIndianPhone(to);

  const message = `Hi ${customerName}, your appointment at BookMi is confirmed for ${appointmentTime}. We look forward to seeing you!`;

  let result: { success: boolean; messageId?: string; error?: string; rawResponse?: unknown };

  if (provider === '2factor') {
    const apiKey = process.env.TWOFACTOR_API_KEY;
    if (!apiKey) {
      const error = 'Missing TWOFACTOR_API_KEY in environment variables';
      console.error(`[SMS:2Factor] ${error}`);
      result = { success: false, error };
    } else {
      result = await send2FactorMessage(tenDigit, message, apiKey);
    }
  } else {
    // Fast2SMS
    const apiKey = process.env.FAST2SMS_API_KEY;
    if (!apiKey) {
      const error = 'Missing FAST2SMS_API_KEY in environment variables';
      console.error(`[SMS:Fast2SMS] ${error}`);
      result = { success: false, error };
    } else {
      result = await sendFast2SmsMessage(tenDigit, message, apiKey);
    }
  }

  // Record send attempt in Supabase message_log
  try {
    const supabase = createServiceSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('message_log').insert({
      salon_id: salonId ?? null,
      phone: withCountryCode,
      template_name: 'appointment_confirmed',
      direction: 'outbound',
      status: result.success ? 'sent' : 'failed',
      wa_message_id: result.messageId ?? null,
      payload: {
        channel: 'sms',
        provider,
        phone_10: tenDigit,
        message,
        error: result.error,
        response: result.rawResponse,
      },
    });
  } catch (logErr) {
    console.error('[SMS] Failed to write message_log:', logErr);
  }

  return {
    success: result.success,
    messageId: result.messageId,
    error: result.error,
    provider,
  };
}
