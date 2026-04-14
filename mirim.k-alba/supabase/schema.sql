-- K-ALBA Database Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Profiles (사용자 프로필)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  user_type TEXT CHECK (user_type IN ('student', 'employer')) NOT NULL DEFAULT 'student',

  -- 구직자 필드
  visa TEXT,
  country TEXT,
  organization TEXT,
  address TEXT,
  korean_level TEXT,
  work_types TEXT[],
  regions TEXT[],
  job_types TEXT[],
  home_experience TEXT,
  korea_experience TEXT,

  -- 사장님 필드
  company_name TEXT,
  business_number TEXT,
  business_address TEXT,
  verified BOOLEAN DEFAULT false,

  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Jobs (채용공고)
-- ============================================
CREATE TABLE IF NOT EXISTS jobs (
  id BIGSERIAL PRIMARY KEY,
  employer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  job_type TEXT NOT NULL,
  work_type TEXT,
  pay_type TEXT CHECK (pay_type IN ('시급', '일급', '월급')) NOT NULL,
  pay_amount INTEGER NOT NULL,
  address TEXT,
  address_detail TEXT,
  work_hours TEXT,
  work_days TEXT,
  korean_level TEXT,
  visa_types TEXT,
  headcount TEXT,
  benefits TEXT,
  description TEXT,
  status TEXT CHECK (status IN ('active', 'closed')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS jobs_employer_idx ON jobs(employer_id);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs(status);
CREATE INDEX IF NOT EXISTS jobs_job_type_idx ON jobs(job_type);

-- ============================================
-- 3. Applications (지원 내역)
-- ============================================
CREATE TABLE IF NOT EXISTS applications (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT REFERENCES jobs(id) ON DELETE CASCADE,
  applicant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, applicant_id)
);

CREATE INDEX IF NOT EXISTS applications_job_idx ON applications(job_id);
CREATE INDEX IF NOT EXISTS applications_applicant_idx ON applications(applicant_id);

-- ============================================
-- 4. Messages (채팅)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_sender_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_idx ON messages(receiver_id);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ============================================
-- 5. Work History (K-ALBA 인증 경력)
-- ============================================
CREATE TABLE IF NOT EXISTS work_history (
  id BIGSERIAL PRIMARY KEY,
  worker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id BIGINT REFERENCES jobs(id) ON DELETE SET NULL,
  employer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT,
  start_date DATE,
  end_date DATE,
  rating NUMERIC(2, 1),
  tags TEXT[],
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS work_history_worker_idx ON work_history(worker_id);

-- ============================================
-- 6. Contracts (근로계약서)
-- ============================================
CREATE TABLE IF NOT EXISTS contracts (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT REFERENCES jobs(id) ON DELETE SET NULL,
  employer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- 사장님 정보
  employer_name TEXT,
  company_name TEXT,
  business_number TEXT,
  employer_phone TEXT,
  business_address TEXT,
  address_detail TEXT,

  -- 근로자 정보
  worker_name TEXT,
  worker_phone TEXT,

  -- 계약 조건
  contract_type TEXT DEFAULT '기간제 근로계약',
  contract_start DATE,
  contract_end DATE,
  job_description TEXT,
  job_type TEXT,
  work_days TEXT[],
  work_start TEXT,
  work_end TEXT,

  -- 급여
  pay_type TEXT CHECK (pay_type IN ('시급', '일급', '월급')),
  pay_amount INTEGER,
  monthly_basic INTEGER,
  monthly_holiday INTEGER,
  monthly_total INTEGER,
  weekly_hours INTEGER,
  insurance_required BOOLEAN DEFAULT false,

  -- 서명
  worker_signed BOOLEAN DEFAULT false,
  employer_signed BOOLEAN DEFAULT false,
  worker_sign_date TIMESTAMPTZ,
  employer_sign_date TIMESTAMPTZ,
  worker_signature TEXT,
  employer_signature TEXT,

  -- 상태
  status TEXT CHECK (status IN ('draft', 'worker_signing', 'employer_signing', 'completed')) DEFAULT 'draft',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contracts_job_idx ON contracts(job_id);
CREATE INDEX IF NOT EXISTS contracts_employer_idx ON contracts(employer_id);
CREATE INDEX IF NOT EXISTS contracts_worker_idx ON contracts(worker_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Profiles 정책
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Jobs 정책
CREATE POLICY "Jobs are viewable by everyone" ON jobs FOR SELECT USING (true);
CREATE POLICY "Employers can create jobs" ON jobs FOR INSERT WITH CHECK (auth.uid() = employer_id);
CREATE POLICY "Employers can update own jobs" ON jobs FOR UPDATE USING (auth.uid() = employer_id);
CREATE POLICY "Employers can delete own jobs" ON jobs FOR DELETE USING (auth.uid() = employer_id);

-- Applications 정책
CREATE POLICY "Applicants can view own applications" ON applications FOR SELECT USING (auth.uid() = applicant_id OR auth.uid() IN (SELECT employer_id FROM jobs WHERE id = job_id));
CREATE POLICY "Users can apply to jobs" ON applications FOR INSERT WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "Employers can update application status" ON applications FOR UPDATE USING (auth.uid() IN (SELECT employer_id FROM jobs WHERE id = job_id));

-- Messages 정책
CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Work History 정책
CREATE POLICY "Work history viewable by worker and employer" ON work_history FOR SELECT USING (auth.uid() = worker_id OR auth.uid() = employer_id);
CREATE POLICY "Employers can create work history" ON work_history FOR INSERT WITH CHECK (auth.uid() = employer_id);

-- Contracts 정책
CREATE POLICY "Contracts viewable by parties" ON contracts FOR SELECT USING (auth.uid() = worker_id OR auth.uid() = employer_id);
CREATE POLICY "Employers can create contracts" ON contracts FOR INSERT WITH CHECK (auth.uid() = employer_id);
CREATE POLICY "Parties can update contracts" ON contracts FOR UPDATE USING (auth.uid() = worker_id OR auth.uid() = employer_id);

-- ============================================
-- Trigger: profile 자동 생성
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
