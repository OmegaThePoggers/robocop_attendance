-- ============================================================
-- AI Attendance System — PostgreSQL Schema
-- Requires: pgvector extension
-- ============================================================

-- FIX 1: Always create extensions safely (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('created', 'processing', 'review', 'confirmed', 'locked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'overridden_present', 'overridden_absent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE dispute_status AS ENUM ('pending', 'auto_approved', 'admin_review', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------
-- users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email                 VARCHAR(255) UNIQUE NOT NULL,
    password_hash         VARCHAR(255) NOT NULL,
    role                  user_role NOT NULL,
    name                  VARCHAR(255) NOT NULL,
    failed_login_attempts SMALLINT NOT NULL DEFAULT 0,
    locked_until          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ------------------------------------------------------------
-- students
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
    id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    sap_id  VARCHAR(50) UNIQUE NOT NULL
);

-- ------------------------------------------------------------
-- student_faces  (pgvector embeddings)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_faces (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students (id) ON DELETE CASCADE,
    embedding  vector(512) NOT NULL,
    image_url  VARCHAR(1024),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_student_faces_student_id ON student_faces (student_id);
-- FIX 3: IVFFlat index for approximate nearest-neighbour cosine search
CREATE INDEX IF NOT EXISTS idx_student_faces_embedding ON student_faces
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ------------------------------------------------------------
-- teachers
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teachers (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID UNIQUE NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE NOT NULL
);

-- ------------------------------------------------------------
-- classes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS classes (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       VARCHAR(255) NOT NULL,
    subject    VARCHAR(255),
    teacher_id UUID REFERENCES teachers (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- class_students  (many-to-many)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS class_students (
    class_id   UUID NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students (id) ON DELETE CASCADE,
    PRIMARY KEY (class_id, student_id)
);
-- FIX 3: Performance index on class_id for fast class-student lookups
CREATE INDEX IF NOT EXISTS idx_class_students_class_id ON class_students (class_id);

-- ------------------------------------------------------------
-- attendance_sessions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id     UUID NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    teacher_id   UUID NOT NULL REFERENCES teachers (id),
    image_url    VARCHAR(1024),
    status       session_status NOT NULL DEFAULT 'created',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ
);

-- ------------------------------------------------------------
-- attendance_records
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_records (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id            UUID NOT NULL REFERENCES attendance_sessions (id) ON DELETE CASCADE,
    student_id            UUID NOT NULL REFERENCES students (id),
    status                attendance_status NOT NULL,
    confidence            FLOAT,
    overridden_by_teacher BOOLEAN NOT NULL DEFAULT false,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- FIX 2: UNIQUE constraint prevents duplicate attendance entries
    CONSTRAINT uq_session_student UNIQUE (session_id, student_id)
);
-- FIX 3: Index on session_id for fast record lookups per session
CREATE INDEX IF NOT EXISTS idx_attendance_records_session_id ON attendance_records (session_id);

-- ------------------------------------------------------------
-- attendance_disputes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_disputes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id       UUID NOT NULL REFERENCES attendance_records (id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students (id),
    bbox_x          INTEGER NOT NULL,
    bbox_y          INTEGER NOT NULL,
    bbox_w          INTEGER NOT NULL,
    bbox_h          INTEGER NOT NULL,
    status          dispute_status NOT NULL DEFAULT 'pending',
    admin_id        UUID REFERENCES users (id),
    resolution_note TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- FIX 3: Index on status for fast admin filtering of pending/admin_review disputes
CREATE INDEX IF NOT EXISTS idx_attendance_disputes_status ON attendance_disputes (status);
