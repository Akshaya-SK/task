"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Appointment = {
  id: string;
  status: "active" | "done" | "cancelled";
  created_at: string;
  patients: { name: string; email: string };
  doctors: { name: string; specialty: string };
  slots: { start_time: string; end_time: string };
};

type Doctor = {
  id: string;
  name: string;
  email: string;
  specialty: string;
};

type Patient = {
  id: string;
  name: string;
  email: string;
};

type Slot = {
  id: string;
  start_time: string;
  end_time: string;
  doctors: { name: string };
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type Tab = "appointments" | "doctors" | "patients" | "slots";

export default function AdminDashboard() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("appointments");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/admin/login"); return; }

      const { data: admin } = await supabase
        .from("system_admins").select("id").eq("id", user.id).single();
      if (!admin) { router.push("/admin/login"); return; }

      const [apptRes, doctorRes, patientRes, slotRes] = await Promise.all([
        supabase.from("appointments")
          .select("id, status, created_at, patients(name, email), doctors(name, specialty), slots(start_time, end_time)")
          .order("created_at", { ascending: false }),
        supabase.from("doctors").select("id, name, email, specialty").order("name"),
        supabase.from("patients").select("id, name, email").order("name"),
        supabase.from("slots").select("id, start_time, end_time, doctors(name)").order("start_time"),
      ]);

      setAppointments((apptRes.data as Appointment[]) ?? []);
      setDoctors((doctorRes.data as Doctor[]) ?? []);
      setPatients((patientRes.data as Patient[]) ?? []);
      setSlots((slotRes.data as Slot[]) ?? []);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "appointments", label: "Appointments", count: appointments.length },
    { key: "doctors", label: "Doctors", count: doctors.length },
    { key: "patients", label: "Patients", count: patients.length },
    { key: "slots", label: "Slots", count: slots.length },
  ];

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">System overview</p>
          </div>
          <button onClick={handleLogout} className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
            Logout
          </button>
        </div>

        {/* Metrics */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border bg-white p-4">
            <p className="text-sm text-gray-500">Total Doctors</p>
            <p className="text-2xl font-bold">{doctors.length}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-sm text-gray-500">Total Patients</p>
            <p className="text-2xl font-bold">{patients.length}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-sm text-gray-500">Total Slots</p>
            <p className="text-2xl font-bold">{slots.length}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-sm text-gray-500">Total Appointments</p>
            <p className="text-2xl font-bold">{appointments.length}</p>
          </div>
        </div>

        {/* Appointment status breakdown */}
        <div className="mb-6 flex gap-3 text-sm">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
            Active: {appointments.filter(a => a.status === "active").length}
          </span>
          <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">
            Done: {appointments.filter(a => a.status === "done").length}
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">
            Cancelled: {appointments.filter(a => a.status === "cancelled").length}
          </span>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.key
                  ? "border-gray-800 text-gray-800"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Appointments Tab */}
        {activeTab === "appointments" && (
          <div className="overflow-hidden rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Patient</th>
                  <th className="px-4 py-3 font-medium">Doctor</th>
                  <th className="px-4 py-3 font-medium">Slot</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Booked At</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {appointments.map((appt) => (
                  <tr key={appt.id}>
                    <td className="px-4 py-3">
                      <div>{appt.patients?.name}</div>
                      <div className="text-xs text-gray-400">{appt.patients?.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{appt.doctors?.name}</div>
                      <div className="text-xs text-gray-400">{appt.doctors?.specialty}</div>
                    </td>
                    <td className="px-4 py-3">{formatDateTime(appt.slots?.start_time)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        appt.status === "active" ? "bg-blue-100 text-blue-700"
                        : appt.status === "done" ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                      }`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDateTime(appt.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Doctors Tab */}
        {activeTab === "doctors" && (
          <div className="overflow-hidden rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Specialty</th>
                  <th className="px-4 py-3 font-medium">Appointments</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {doctors.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-4 py-3 font-medium">{doc.name}</td>
                    <td className="px-4 py-3 text-gray-500">{doc.email}</td>
                    <td className="px-4 py-3">{doc.specialty}</td>
                    <td className="px-4 py-3">
                      {appointments.filter(a => a.doctors?.name === doc.name).length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Patients Tab */}
        {activeTab === "patients" && (
          <div className="overflow-hidden rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Appointments</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {patients.map((pat) => (
                  <tr key={pat.id}>
                    <td className="px-4 py-3 font-medium">{pat.name}</td>
                    <td className="px-4 py-3 text-gray-500">{pat.email}</td>
                    <td className="px-4 py-3">
                      {appointments.filter(a => a.patients?.name === pat.name).length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Slots Tab */}
        {activeTab === "slots" && (
          <div className="overflow-hidden rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Doctor</th>
                  <th className="px-4 py-3 font-medium">Date & Time</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {slots.map((slot) => {
                  const appt = appointments.find(a => a.slots?.start_time === slot.start_time);
                  const status = appt ? appt.status : "available";
                  return (
                    <tr key={slot.id}>
                      <td className="px-4 py-3">{slot.doctors?.name}</td>
                      <td className="px-4 py-3">
                        {formatDateTime(slot.start_time)} —{" "}
                        {new Date(slot.end_time).toLocaleTimeString("en-IN", { timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          status === "active" ? "bg-blue-100 text-blue-700"
                          : status === "done" ? "bg-green-100 text-green-700"
                          : status === "cancelled" ? "bg-gray-100 text-gray-600"
                          : "bg-green-50 text-green-600"
                        }`}>
                          {status === "available" ? "Available" : status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}