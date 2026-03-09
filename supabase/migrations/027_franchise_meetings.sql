-- ============================================================
-- Migration 027: Franchise Meeting Scheduling (Google Meet)
-- Allows students to book franchise presentation meetings
-- Admin configures availability, system creates Google Meet links
-- ============================================================

-- 1. Availability configuration per day of week
CREATE TABLE IF NOT EXISTS franchise_meeting_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL DEFAULT '09:00',
    end_time TIME NOT NULL DEFAULT '17:00',
    slot_duration_minutes INT NOT NULL DEFAULT 60 CHECK (slot_duration_minutes IN (30, 60)),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_franchise_meeting_avail_day ON franchise_meeting_availability (day_of_week);

DROP TRIGGER IF EXISTS trg_franchise_meeting_availability_updated_at ON franchise_meeting_availability;
CREATE TRIGGER trg_franchise_meeting_availability_updated_at
    BEFORE UPDATE ON franchise_meeting_availability
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

ALTER TABLE franchise_meeting_availability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "franchise_meeting_availability_all" ON franchise_meeting_availability;
CREATE POLICY "franchise_meeting_availability_all" ON franchise_meeting_availability FOR ALL USING (true) WITH CHECK (true);

-- 2. Blocked dates (holidays, vacations, etc.)
CREATE TABLE IF NOT EXISTS franchise_meeting_blocked_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocked_date DATE NOT NULL UNIQUE,
    reason TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE franchise_meeting_blocked_dates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "franchise_meeting_blocked_dates_all" ON franchise_meeting_blocked_dates;
CREATE POLICY "franchise_meeting_blocked_dates_all" ON franchise_meeting_blocked_dates FOR ALL USING (true) WITH CHECK (true);

-- 3. Student bookings
CREATE TABLE IF NOT EXISTS franchise_meeting_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_cpf TEXT NOT NULL,
    student_name TEXT NOT NULL DEFAULT '',
    student_email TEXT NOT NULL DEFAULT '',
    student_phone TEXT DEFAULT '',
    meeting_date DATE NOT NULL,
    meeting_start TIMESTAMPTZ NOT NULL,
    meeting_end TIMESTAMPTZ NOT NULL,
    google_event_id TEXT,
    meet_link TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    admin_notes TEXT DEFAULT '',
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_franchise_meeting_bookings_cpf ON franchise_meeting_bookings (student_cpf);
CREATE INDEX IF NOT EXISTS idx_franchise_meeting_bookings_date ON franchise_meeting_bookings (meeting_date);
CREATE INDEX IF NOT EXISTS idx_franchise_meeting_bookings_status ON franchise_meeting_bookings (status);

DROP TRIGGER IF EXISTS trg_franchise_meeting_bookings_updated_at ON franchise_meeting_bookings;
CREATE TRIGGER trg_franchise_meeting_bookings_updated_at
    BEFORE UPDATE ON franchise_meeting_bookings
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

ALTER TABLE franchise_meeting_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "franchise_meeting_bookings_all" ON franchise_meeting_bookings;
CREATE POLICY "franchise_meeting_bookings_all" ON franchise_meeting_bookings FOR ALL USING (true) WITH CHECK (true);

-- 4. Seed default availability (Mon-Fri 9:00-17:00, 1h slots)
INSERT INTO franchise_meeting_availability (day_of_week, start_time, end_time, slot_duration_minutes, is_active)
VALUES
    (0, '09:00', '17:00', 60, false),
    (1, '09:00', '17:00', 60, true),
    (2, '09:00', '17:00', 60, true),
    (3, '09:00', '17:00', 60, true),
    (4, '09:00', '17:00', 60, true),
    (5, '09:00', '17:00', 60, true),
    (6, '09:00', '17:00', 60, false)
ON CONFLICT (day_of_week) DO NOTHING;

-- 5. Settings stored in crm_settings
INSERT INTO crm_settings (key, value)
VALUES ('franchise_meeting_config', '{"advance_days":30,"max_bookings_per_student":1,"admin_email":"","admin_phone":"","meeting_title":"Reunião Franquia VOLL Studios","meeting_description":"Reunião de apresentação da Franquia VOLL Studios"}')
ON CONFLICT (key) DO NOTHING;
