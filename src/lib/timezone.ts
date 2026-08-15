export const IST_OFFSET_MINUTES = 330; // +5:30

/**
 * Parses an IST date and time string into a Date object representing that exact UTC moment.
 * @param dateString YYYY-MM-DD in IST
 * @param timeString HH:MM in IST
 * @returns Date object
 */
export function toIST(dateString: string, timeString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Construct UTC date as if the inputs were UTC, then subtract the offset to find the real UTC time
  return new Date(Date.UTC(year, month - 1, day, hours, minutes - IST_OFFSET_MINUTES));
}

/**
 * Given a date in IST, returns the UTC ISO strings corresponding to the start and end of that IST day.
 */
export function istDateRange(dateString: string): { startOfDay: string; endOfDay: string } {
  const start = toIST(dateString, '00:00');
  const end = toIST(dateString, '23:59');
  end.setSeconds(59);
  end.setMilliseconds(999);
  
  return {
    startOfDay: start.toISOString(),
    endOfDay: end.toISOString()
  };
}

/**
 * Formats a UTC ISO string into an IST time string (e.g., "10:30 AM").
 */
export function formatISTTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formats a UTC ISO string into an IST date string (e.g., "Thu, 14 Aug 2026" or "Thu, 14 Aug").
 */
export function formatISTDate(isoString: string, includeYear = true): string {
  const d = new Date(isoString);
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  };
  if (includeYear) {
    options.year = 'numeric';
  }
  return d.toLocaleDateString('en-IN', options);
}

/**
 * Returns the current date in IST as a YYYY-MM-DD string.
 */
export function todayIST(): string {
  const d = new Date();
  // Shift current UTC time by +5:30
  const istTime = new Date(d.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  return istTime.toISOString().split('T')[0];
}

/**
 * Returns the current time in IST as a HH:MM string, rounded up to the nearest minuteStep (default 5).
 */
export function currentTimeIST(minuteStep = 5): string {
  const d = new Date();
  const istTime = new Date(d.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  let h = istTime.getUTCHours();
  let m = istTime.getUTCMinutes();

  m = Math.ceil(m / minuteStep) * minuteStep;
  if (m >= 60) {
    m = 0;
    h = (h + 1) % 24;
  }
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
