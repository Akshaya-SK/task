import { canBookSlot, canCancelAppointment, canBookWithDoctor } from "@/lib/validation";

// Test 1: Patient cannot book an already booked slot
describe("canBookSlot", () => {
  it("should fail if slot is already booked", () => {
    const result = canBookSlot(true);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Slot is already booked");
  });

  it("should succeed if slot is available", () => {
    const result = canBookSlot(false);
    expect(result.ok).toBe(true);
  });
});

// Test 2: Patient cannot cancel an already done or cancelled appointment
describe("canCancelAppointment - status check", () => {
  const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  it("should fail if appointment is already done", () => {
    const result = canCancelAppointment("done", futureTime, false);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("already done");
  });

  it("should fail if appointment is already cancelled", () => {
    const result = canCancelAppointment("cancelled", futureTime, false);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("already cancelled");
  });
});

// Test 3: Patient cannot cancel within 1 hour, but doctor can
describe("canCancelAppointment - 1 hour rule", () => {
  const soonTime = new Date(Date.now() + 30 * 60 * 1000); // 30 mins from now

  it("should fail for patient if appointment is within 1 hour", () => {
    const result = canCancelAppointment("active", soonTime, false);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("1 hour");
  });

  it("should succeed for doctor even if appointment is within 1 hour", () => {
    const result = canCancelAppointment("active", soonTime, true);
    expect(result.ok).toBe(true);
  });
});

// Test 4: Patient cannot book another appointment with same doctor
describe("canBookWithDoctor", () => {
  it("should fail if patient already has active appointment with this doctor", () => {
    const result = canBookWithDoctor(true);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("already have an active appointment");
  });

  it("should succeed if patient has no active appointment with this doctor", () => {
    const result = canBookWithDoctor(false);
    expect(result.ok).toBe(true);
  });
});