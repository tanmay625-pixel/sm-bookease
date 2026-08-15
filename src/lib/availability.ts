/**
 * Pure function to detect conflicting staff members.
 * 
 * Determines which staff members are busy during a given candidate slot window
 * by checking if their existing appointments overlap with the candidate slot.
 * 
 * Overlap logic: an existing appointment overlaps the candidate slot if its
 * start time is strictly before the candidate slot's end time, AND its end time
 * is strictly after the candidate slot's start time.
 * (Adjacent appointments, e.g., one ending exactly when the other begins, do not overlap).
 */
export function findConflictingStaffIds(
  existingAppointments: Array<{ slot_start: string; slot_end: string; staff_id: string | null }>,
  slotStartMs: number,
  slotEndMs: number
): Set<string> {
  const busyStaffIds = new Set<string>();
  
  for (const appt of existingAppointments) {
    if (!appt.staff_id) continue;
    const apptStart = new Date(appt.slot_start).getTime();
    const apptEnd = new Date(appt.slot_end).getTime();
    
    // Strict overlap: start < end and end > start
    if (apptStart < slotEndMs && apptEnd > slotStartMs) {
      busyStaffIds.add(appt.staff_id);
    }
  }
  
  return busyStaffIds;
}
