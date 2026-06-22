-- ════════════════════════════════════════════════════════════
-- K-ALBA 기초 스키마 마이그레이션
-- 작성일: 2026-04-27
-- 실행 순서: 첫 번째 (모든 다른 마이그레이션의 기반)
-- ════════════════════════════════════════════════════════════
--
-- 현재 Supabase에 수동 생성된 5개 테이블(jobs, profiles, applications,
-- messages, work_history)을 코드로 정의합니다.
-- contracts 테이블은 20260415_001_signatures.sql이 ALTER 하므로
-- 여기서 미리 생성합니다.
--
-- ⚠️ 이 마이그레이션은 IF NOT EXISTS를 사용하므로
--    기존 테이블이 있어도 안전합니다.

-- ═══ 1. PROFILES 테이블 ═══
-- 사용자 프로필 (auth.users와 1:1 연결)
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  name            TEXT,
  phone           TEXT,
  user_type       TEXT NOT NULL DEFAULT 'worker',  -- 'worker' | 'employer' | 'admin' | 'staff'
  -- 외국인 근로자 정보
  visa            TEXT,                            -- 'D-2', 'E-9', 'H-2', 'F-2' 등
  country         TEXT,
  organization    TEXT,                            -- 소속 (학교/회사)
  address         TEXT,
  korean_level    TEXT,                            -- 'beginner' | 'intermediate' | 'advanced'
  work_types      TEXT[],                          -- 희망 업무 유형
  regions         TEXT[],                          -- 희망 근무 지역
  job_types       TEXT[],                          -- 희망 직종
  home_experience TEXT,                            -- 본국 경력
  korea_experience TEXT,                           -- 한국 경력
  -- 사장님(employer) 정보
  company_name    TEXT,
  business_number TEXT,                            -- 사업자등록번호
  business_address TEXT,
  -- 메타
  verified        BOOLEAN DEFAULT false,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

COMMENT ON TABLE profiles IS '사용자 프로필 — auth.users와 1:1 연결';
COMMENT ON COLUMN profiles.user_type IS 'worker(알바생) / employer(사장님) / admin / staff(국제처)';


-- ═══ 2. JOBS 테이블 ═══
-- 일자리 게시글
CREATE TABLE IF NOT EXISTS jobs (
  id            BIGSERIAL PRIMARY KEY,
  employer_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  job_type      TEXT NOT NULL,                    -- 'cafe', 'factory', 'agriculture' 등
  work_type     TEXT,                              -- 'full_time' | 'part_time' | 'short_term'
  pay_type      TEXT NOT NULL,                    -- 'hourly' | 'daily' | 'monthly'
  pay_amount    INTEGER NOT NULL,
  -- 위치
  address       TEXT,
  address_detail TEXT,
  -- 근무 조건
  work_hours    TEXT,
  work_days     TEXT,
  korean_level  TEXT,
  visa_types    TEXT,                              -- 가능한 비자 (예: 'D-2,D-4,F-2')
  headcount     TEXT,
  benefits      TEXT,
  description   TEXT,
  -- 상태
  status        TEXT DEFAULT 'active',            -- 'active' | 'closed' | 'pending'
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_employer ON jobs(employer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_job_type ON jobs(job_type);

COMMENT ON TABLE jobs IS '일자리 게시글';


-- ═══ 3. APPLICATIONS 테이블 ═══
-- 알바 지원 내역
CREATE TABLE IF NOT EXISTS applications (
  id           BIGSERIAL PRIMARY KEY,
  job_id       BIGINT REFERENCES jobs(id) ON DELETE CASCADE,
  applicant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message      TEXT,
  status       TEXT DEFAULT 'pending',             -- 'pending' | 'accepted' | 'rejected' | 'withdrawn'
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_applicant ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

COMMENT ON TABLE applications IS '알바 지원 내역';


-- ═══ 4. MESSAGES 테이블 ═══
-- 알바생 ↔ 사장님 채팅
CREATE TABLE IF NOT EXISTS messages (
  id          BIGSERIAL PRIMARY KEY,
  sender_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, read);
CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(sender_id, receiver_id, created_at DESC);

COMMENT ON TABLE messages IS '채팅 메시지';


-- ═══ 5. WORK_HISTORY 테이블 ═══
-- 근무 이력 (K-ALBA 인증 경력)
CREATE TABLE IF NOT EXISTS work_history (
  id          BIGSERIAL PRIMARY KEY,
  worker_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id      BIGINT REFERENCES jobs(id) ON DELETE SET NULL,
  employer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title       TEXT,
  start_date  DATE,
  end_date    DATE,
  rating      NUMERIC(2,1),                        -- 사장님 평가 (1.0 ~ 5.0)
  tags        TEXT[],                              -- ['성실', '시간 준수', '친절'] 등
  review      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_history_worker ON work_history(worker_id, end_date DESC);
CREATE INDEX IF NOT EXISTS idx_work_history_employer ON work_history(employer_id);

COMMENT ON TABLE work_history IS 'K-ALBA 인증 근무 이력';


-- ═══ 6. CONTRACTS 테이블 ═══
-- 표준근로계약서 (20260415_001_signatures.sql이 ALTER하므로 미리 생성)
CREATE TABLE IF NOT EXISTS contracts (
  id              BIGSERIAL PRIMARY KEY,
  job_id          BIGINT REFERENCES jobs(id) ON DELETE SET NULL,
  application_id  BIGINT REFERENCES applications(id) ON DELETE SET NULL,
  worker_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  employer_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  -- 계약 내용
  worker_name     TEXT,
  employer_name   TEXT,
  business_name   TEXT,
  business_number TEXT,
  business_address TEXT,
  job_title       TEXT,
  start_date      DATE,
  end_date        DATE,
  work_hours      TEXT,
  work_days       TEXT,
  hourly_pay      INTEGER,
  pay_day         TEXT,
  pay_method      TEXT,
  workplace       TEXT,
  workplace_detail TEXT,
  -- 다국어 지원
  language        TEXT DEFAULT 'ko',                -- 'ko' | 'en' | 'zh' | 'vi' | 'ja' | 'mn' | 'uz'
  -- PDF
  pdf_url         TEXT,
  -- 상태
  status          TEXT DEFAULT 'draft',             -- 'draft' | 'sent' | 'signed' | 'cancelled'
  -- 메타
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contracts_worker ON contracts(worker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_employer ON contracts(employer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

COMMENT ON TABLE contracts IS '표준근로계약서 (7개 언어 지원)';


-- ═══ 7. RLS 정책 ═══
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts     ENABLE ROW LEVEL SECURITY;

-- profiles: 모두 조회 가능, 본인 것만 수정
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- jobs: 모두 조회 가능, 본인이 등록한 것만 수정
DROP POLICY IF EXISTS "jobs_select_all" ON jobs;
CREATE POLICY "jobs_select_all" ON jobs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "jobs_insert_own" ON jobs;
CREATE POLICY "jobs_insert_own" ON jobs
  FOR INSERT WITH CHECK (auth.uid() = employer_id);

DROP POLICY IF EXISTS "jobs_update_own" ON jobs;
CREATE POLICY "jobs_update_own" ON jobs
  FOR UPDATE USING (auth.uid() = employer_id);

DROP POLICY IF EXISTS "jobs_delete_own" ON jobs;
CREATE POLICY "jobs_delete_own" ON jobs
  FOR DELETE USING (auth.uid() = employer_id);

-- applications: 본인이 지원한 것 + 사장님이 받은 것
DROP POLICY IF EXISTS "applications_select_own" ON applications;
CREATE POLICY "applications_select_own" ON applications
  FOR SELECT USING (
    auth.uid() = applicant_id
    OR auth.uid() = (SELECT employer_id FROM jobs WHERE jobs.id = applications.job_id)
  );

DROP POLICY IF EXISTS "applications_insert_own" ON applications;
CREATE POLICY "applications_insert_own" ON applications
  FOR INSERT WITH CHECK (auth.uid() = applicant_id);

DROP POLICY IF EXISTS "applications_update_employer" ON applications;
CREATE POLICY "applications_update_employer" ON applications
  FOR UPDATE USING (
    auth.uid() = applicant_id
    OR auth.uid() = (SELECT employer_id FROM jobs WHERE jobs.id = applications.job_id)
  );

-- messages: 본인이 보낸 것 + 받은 것
DROP POLICY IF EXISTS "messages_select_own" ON messages;
CREATE POLICY "messages_select_own" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "messages_insert_own" ON messages;
CREATE POLICY "messages_insert_own" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "messages_update_receiver" ON messages;
CREATE POLICY "messages_update_receiver" ON messages
  FOR UPDATE USING (auth.uid() = receiver_id);

-- work_history: 본인 이력 + 사장님이 등록한 평가
DROP POLICY IF EXISTS "work_history_select_own" ON work_history;
CREATE POLICY "work_history_select_own" ON work_history
  FOR SELECT USING (
    auth.uid() = worker_id OR auth.uid() = employer_id OR true  -- 채용 검증 위해 모두 조회 허용
  );

DROP POLICY IF EXISTS "work_history_insert_employer" ON work_history;
CREATE POLICY "work_history_insert_employer" ON work_history
  FOR INSERT WITH CHECK (auth.uid() = employer_id);

DROP POLICY IF EXISTS "work_history_update_employer" ON work_history;
CREATE POLICY "work_history_update_employer" ON work_history
  FOR UPDATE USING (auth.uid() = employer_id);

-- contracts: 본인이 당사자(worker 또는 employer)인 것만
DROP POLICY IF EXISTS "contracts_select_party" ON contracts;
CREATE POLICY "contracts_select_party" ON contracts
  FOR SELECT USING (auth.uid() = worker_id OR auth.uid() = employer_id);

DROP POLICY IF EXISTS "contracts_insert_party" ON contracts;
CREATE POLICY "contracts_insert_party" ON contracts
  FOR INSERT WITH CHECK (auth.uid() = worker_id OR auth.uid() = employer_id);

DROP POLICY IF EXISTS "contracts_update_party" ON contracts;
CREATE POLICY "contracts_update_party" ON contracts
  FOR UPDATE USING (auth.uid() = worker_id OR auth.uid() = employer_id);


-- ═══ 8. 자동 updated_at 트리거 ═══
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_jobs_updated_at ON jobs;
CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_contracts_updated_at ON contracts;
CREATE TRIGGER trg_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ═══ 9. auth.users → profiles 자동 생성 트리거 ═══
-- 신규 가입 시 profiles 행 자동 생성
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'worker')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ═══ 검증 ═══
-- 실행 후 다음 쿼리로 확인:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name IN
-- ('profiles', 'jobs', 'applications', 'messages', 'work_history', 'contracts');
-- → 6개 모두 표시되어야 함
