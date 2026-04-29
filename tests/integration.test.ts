import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAvailableSlot(doctorId: string) {
  const { data: allSlots } = await supabase
    .from("slots").select("id").eq("doctor_id", doctorId);

  const { data: takenSlots } = await supabase
    .from("appointments").select("slot_id")
    .in("status", ["active", "done"]);

  const takenIds = new Set((takenSlots ?? []).map(a => a.slot_id));
  const available = (allSlots ?? []).find(s => !takenIds.has(s.id));
  return available?.id ?? null;
}
describe("Booking Flow", () => {
  let appointmentId: string;

  afterAll(async () => {
    if (appointmentId) {
      await supabase.from("appointments").delete().eq("id", appointmentId);
    }
  });

  it("should create an appointment when a valid patient books an available slot", async () => {
    const { data: patient } = await supabase
      .from("patients").select("id").limit(1).single();

    const { data: doctor } = await supabase
      .from("doctors").select("id").limit(1).single();

    const slotId = await getAvailableSlot(doctor!.id);
    expect(slotId).not.toBeNull();

    const { data, error } = await supabase
      .from("appointments")
      .insert({
        patient_id: patient!.id,
        doctor_id: doctor!.id,
        slot_id: slotId,
        status: "active",
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.status).toBe("active");
    expect(data!.patient_id).toBe(patient!.id);
    expect(data!.slot_id).toBe(slotId);

    appointmentId = data!.id;
  });
});

describe("Cancellation Flow", () => {
  let appointmentId: string;

  beforeAll(async () => {
    const { data: patient } = await supabase
      .from("patients").select("id").limit(1).single();

    const { data: doctor } = await supabase
      .from("doctors").select("id").limit(1).single();

    const slotId = await getAvailableSlot(doctor!.id);

    const { data } = await supabase
      .from("appointments")
      .insert({
        patient_id: patient!.id,
        doctor_id: doctor!.id,
        slot_id: slotId,
        status: "active",
      })
      .select()
      .single();

    appointmentId = data!.id;
  });

  afterAll(async () => {
    if (appointmentId) {
      await supabase.from("appointments").delete().eq("id", appointmentId);
    }
  });

  it("should update appointment status to cancelled on valid cancellation", async () => {
    const { data, error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointmentId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.status).toBe("cancelled");
  });
});