import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user from cookie
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slotId } = await req.json();
    if (!slotId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    // Check slot exists and is not already booked
    const { data: existingAppt } = await supabaseAdmin
      .from("appointments")
      .select("id")
      .eq("slot_id", slotId)
      .in("status", ["active", "done"])
      .maybeSingle();

    if (existingAppt) return NextResponse.json({ error: "Slot is already booked" }, { status: 409 });

    // Check patient doesn't already have active appointment with this doctor
    const { data: duplicate } = await supabaseAdmin
      .from("appointments")
      .select("id")
      .eq("patient_id", user.id)
      .eq("doctor_id", slot.doctor_id)
      .eq("status", "active")
      .maybeSingle();

    if (duplicate) return NextResponse.json({ error: "You already have an active appointment with this doctor" }, { status: 409 });

    const now = new Date().toISOString();

    const { data: slot } = await supabaseAdmin
      .from("slots")
      .select("start_time, doctor_id")
      .eq("id", slotId)
      .single();

    if (!slot) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }

    if (new Date(slot.start_time) < new Date()) {
      return NextResponse.json({ error: "Cannot book past slots" }, { status: 400 });
    }

    // Book it
    const { error: insertError } = await supabaseAdmin
      .from("appointments")
      .insert({ patient_id: user.id, doctor_id: slot.doctorId, slot_id: slotId, status: "active" });

    if (insertError) {
      if (insertError.code === "23505") {
        // detect WHICH constraint failed
        if (insertError.message.includes("unique_active_patient_doctor")) {
          return NextResponse.json(
            { error: "You already have an active appointment with this doctor" },
            { status: 409 }
          );
        }

        if (insertError.message.includes("unique_active_slot")) {
          return NextResponse.json(
            { error: "Slot already booked" },
            { status: 409 }
          );
        }
      }

      return NextResponse.json({ error: "Failed to book" }, { status: 500 });
    }

    return NextResponse.json({ message: "Appointment booked successfully" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}