import 'server-only';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { sendSmsOtp, sendSmsAppointmentConfirmation } from '@/lib/sms';

export type NotificationProvider = 'whatsapp' | 'sms';

/**
 * Gets the configured active provider for customer communications and OTP.
 * Defaults to 'sms' unless OTP_PROVIDER is explicitly set to 'whatsapp'.
 */
export function getNotificationProvider(): NotificationProvider {
  const provider = (process.env.OTP_PROVIDER || process.env.NOTIFICATION_PROVIDER || '')
    .trim()
    .toLowerCase();

  return provider === 'whatsapp' ? 'whatsapp' : 'sms';
}

/**
 * Unified authentication OTP sender.
 * Respects OTP_PROVIDER ("sms" | "whatsapp"), defaulting to "sms".
 * Seamlessly routes to WhatsApp Cloud API or SMS (Fast2SMS / 2Factor).
 */
export async function sendAuthOtp(
  phone: string,
  code: string,
  salonId?: string
): Promise<{ success: boolean; messageId?: string; error?: string; channel: NotificationProvider }> {
  const provider = getNotificationProvider();

  if (provider === 'whatsapp') {
    const res = await sendWhatsAppMessage(
      phone,
      'bookmi_otp',
      'en',
      [code],
      salonId
    );
    return {
      success: res.success,
      messageId: res.messageId,
      error: res.error,
      channel: 'whatsapp',
    };
  }

  // SMS dispatch (Fast2SMS or 2Factor)
  const res = await sendSmsOtp(phone, code, salonId);
  return {
    success: res.success,
    messageId: res.messageId,
    error: res.error,
    channel: 'sms',
  };
}

/**
 * Unified appointment confirmation message sender.
 * Dispatches via WhatsApp or SMS based on the active provider.
 */
export async function sendAppointmentConfirmation(
  phone: string,
  customerName: string,
  slotStartFormatted: string,
  salonId?: string
): Promise<{ success: boolean; messageId?: string; error?: string; channel: NotificationProvider }> {
  const provider = getNotificationProvider();

  if (provider === 'whatsapp') {
    const res = await sendWhatsAppMessage(
      phone,
      'appointment_confirmed',
      'en',
      [customerName, slotStartFormatted],
      salonId
    );
    return {
      success: res.success,
      messageId: res.messageId,
      error: res.error,
      channel: 'whatsapp',
    };
  }

  // SMS dispatch (Fast2SMS or 2Factor)
  const res = await sendSmsAppointmentConfirmation(
    phone,
    customerName,
    slotStartFormatted,
    salonId
  );
  return {
    success: res.success,
    messageId: res.messageId,
    error: res.error,
    channel: 'sms',
  };
}
