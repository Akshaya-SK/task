import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AppointmentWithSlot = {
  id: string;
  status: "active" | "done" | "cancelled";
  patient_id: string;
  doctor_id: string;
  slot_id: string;
  slots: { start_time: string } | null;
};

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { appointmentId, action } = await req.json();
    if (!appointmentId || !action) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    if (!["done", "cancelled"].includes(action)) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    const newStatus = action;

    const { data, error } = await supabaseAdmin
      .from("appointments")
      .select("id, status, patient_id, doctor_id, slot_id, slots(start_time)")
      .eq("id", appointmentId)
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to fetch appointment" }, { status: 500 });
    }

    const appointment = data as AppointmentWithSlot | null;

    if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    if (!appointment.slots?.start_time) {
      return NextResponse.json({ error: "Invalid slot data" }, { status: 500 });
    }

    const isDoctor = appointment.doctor_id === user.id;
    const isPatient = appointment.patient_id === user.id;

    if (!isDoctor && !isPatient) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (isPatient && action === "done") return NextResponse.json({ error: "Patients cannot mark as done" }, { status: 403 });
    if (appointment.status !== "active") return NextResponse.json({ error: `Appointment is already ${appointment.status}` }, { status: 409 });

    const startTime = new Date(appointment.slots.start_time);
    const now = new Date();

    if (isPatient && action === "cancel") {
      if (startTime <= now) {
        return NextResponse.json({ error: "Cannot cancel past appointment" }, { status: 400 });
      }

      if (startTime.getTime() - now.getTime() < 60 * 60 * 1000) {
        return NextResponse.json({ error: "Cannot cancel within 1 hour of appointment" }, { status: 409 });
      }
    }

    if (action === "done" && startTime > now) {
      return NextResponse.json(
        { error: "Cannot mark future appointment as done" },
        { status: 400 }
      );
    }

    const newStatus = action === "done" ? "done" : "cancelled";
    const { data: updated, error: updateError } = await supabaseAdmin
    .from("appointments")
    .update({ status: newStatus })
    .eq("id", appointmentId)
    .eq("status", "active")
    .select();

  if (updateError || !updated || updated.length === 0) {
    return NextResponse.json(
      { error: "Update failed or already processed" },
      { status: 409 }
    );
  }

    return NextResponse.json({ message: "Updated successfully" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}