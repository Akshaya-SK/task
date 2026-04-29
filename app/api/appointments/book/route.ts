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

    const { slotId, doctorId } = await req.json();
    if (!slotId || !doctorId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    // Check slot exists and is not already booked
    const { data: existingAppt } = await supabaseAdmin
      .from("appointments")
      .select("id")
      .eq("slot_id", slotId)
      .eq("status", ["active", "done"])
      .maybeSingle();

    if (existingAppt) return NextResponse.json({ error: "Slot is already booked" }, { status: 409 });

    // Check patient doesn't already have active appointment with this doctor
    const { data: duplicate } = await supabaseAdmin
      .from("appointments")
      .select("id")
      .eq("patient_id", user.id)
      .eq("doctor_id", doctorId)
      .eq("status", "active")
      .maybeSingle();

    if (duplicate) return NextResponse.json({ error: "You already have an active appointment with this doctor" }, { status: 409 });

    // Book it
    const { error: insertError } = await supabaseAdmin
      .from("appointments")
      .insert({ patient_id: user.id, doctor_id: doctorId, slot_id: slotId, status: "active" });

    if (insertError) return NextResponse.json({ error: "Failed to book" }, { status: 500 });

    return NextResponse.json({ message: "Appointment booked successfully" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}