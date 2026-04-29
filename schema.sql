-- ========================
-- TABLES
-- ========================

CREATE TABLE IF NOT EXISTS doctors (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  email     TEXT NOT NULL UNIQUE,
  specialty TEXT NOT NULL DEFAULT 'General'
);

CREATE TABLE IF NOT EXISTS patients (
  id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS slots (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id  UUID        NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time   TIMESTAMPTZ NOT NULL,
  CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS appointments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id  UUID        NOT NULL REFERENCES doctors(id)  ON DELETE CASCADE,
  slot_id    UUID        NOT NULL UNIQUE REFERENCES slots(id) ON DELETE CASCADE,
  status     TEXT        NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'done', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One active appointment per patient per doctor
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_patient_doctor
ON appointments (patient_id, doctor_id)
WHERE status = 'active';

-- Admin = role table (no passwords)
CREATE TABLE IF NOT EXISTS system_admins (
  id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE
);

-- ========================
-- ENABLE RLS
-- ========================

ALTER TABLE doctors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_admins ENABLE ROW LEVEL SECURITY;

-- ========================
-- READ POLICIES
-- ========================

CREATE POLICY "doctors_read_all" ON doctors
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "patients_read_own" ON patients
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "slots_read_all" ON slots
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "appointments_read_patient" ON appointments
FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "appointments_read_doctor" ON appointments
FOR SELECT USING (auth.uid() = doctor_id);

-- ========================
-- WRITE POLICIES
-- ========================

CREATE POLICY "appointments_insert_patient" ON appointments
FOR INSERT
WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "appointments_update_patient" ON appointments
FOR UPDATE
USING (auth.uid() = patient_id);

CREATE POLICY "appointments_update_doctor" ON appointments
FOR UPDATE
USING (auth.uid() = doctor_id);

-- ========================
-- ADMIN POLICIES
-- ========================

CREATE POLICY "admin_full_access_appointments" ON appointments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM system_admins
    WHERE id = auth.uid()
  )
);

CREATE POLICY "admin_read_doctors" ON doctors
FOR SELECT USING (
  EXISTS (SELECT 1 FROM system_admins WHERE id = auth.uid())
);

CREATE POLICY "admin_read_patients" ON patients
FOR SELECT USING (
  EXISTS (SELECT 1 FROM system_admins WHERE id = auth.uid())
);

CREATE POLICY "admin_read_slots" ON slots
FOR SELECT USING (
  EXISTS (SELECT 1 FROM system_admins WHERE id = auth.uid())
);