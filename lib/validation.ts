export function canBookSlot(isBooked: boolean): { ok: boolean; error?: string } {
  if (isBooked) return { ok: false, error: "Slot is already booked" };
  return { ok: true };
}

export function canCancelAppointment(
  status: string,
  startTime: Date,
  isDoctor: boolean
): { ok: boolean; error?: string } {
  if (status !== "active") {
    return { ok: false, error: `Appointment is already ${status}` };
  }
  if (!isDoctor) {
    const oneHourMs = 60 * 60 * 1000;
    if (startTime.getTime() - Date.now() < oneHourMs) {
      return { ok: false, error: "Cannot cancel within 1 hour of appointment" };
    }
  }
  return { ok: true };
}

export function canBookWithDoctor(hasActiveAppointment: boolean): { ok: boolean; error?: string } {
  if (hasActiveAppointment) {
    return { ok: false, error: "You already have an active appointment with this doctor" };
  }
  return { ok: true };
}