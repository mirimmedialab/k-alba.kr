-- ════════════════════════════════════════════════════════════
-- K-ALBA 사용자 프로필 (PartWork 시간제취업확인서 자동 채움용)
-- 실행일: 2026-04-25
-- 순서: migration-partwork-documents.sql 이후 실행
-- ════════════════════════════════════════════════════════════
--
-- 시간제취업확인서 양식(붙임 4-1)에 필요한 개인정보 필드를
-- profiles 테이블에 추가합니다. 회원가입 후 사용자가 입력하면
-- PartWork 신청 시 자동으로 채워집니다.
--
-- 추가 필드:
--   phone:           전화번호 (010-XXXX-XXXX)
--   email:           이메일 (auth.users.email과 별도 가능)
--   alien_reg_number: 외국인등록번호 (XXXXXX-XXXXXXX)
--   passport_number:  여권번호 (선택)
--   nationality:      국적 (ISO 3166-1 alpha-2 코드, 예: VN, KR, CN)
--   birth_date:       생년월일
--
-- 보안:
--   - alien_reg_number는 개인정보보호법 적용 → RLS 본인만 접근 가능
--   - 전화번호도 본인만 조회/수정 가능

-- ═══ 1. profiles 테이블 컬럼 추가 ═══
-- profiles 테이블이 없는 경우 먼저 생성 (Supabase auth 연동)
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- PartWork 시간제취업확인서 자동 채움 필드
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone            TEXT,
  ADD COLUMN IF NOT EXISTS email            TEXT,
  ADD COLUMN IF NOT EXISTS alien_reg_number TEXT,
  ADD COLUMN IF NOT EXISTS passport_number  TEXT,
  ADD COLUMN IF NOT EXISTS nationality      TEXT,
  ADD COLUMN IF NOT EXISTS birth_date       DATE,
  ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;

-- ═══ 2. 외국인등록번호 형식 검증 (XXXXXX-XXXXXXX) ═══
-- ALTER TABLE profiles
--   ADD CONSTRAINT alien_reg_format CHECK (
--     alien_reg_number IS NULL
--     OR alien_reg_number ~ '^\d{6}-\d{7}$'
--   );
-- 주의: 운영 데이터에 잘못된 형식이 이미 있을 수 있으므로 주석 처리.
-- 입력 단계에서 클라이언트 검증으로 처리.

COMMENT ON COLUMN profiles.phone IS '전화번호 (PartWork 시간제취업확인서)';
COMMENT ON COLUMN profiles.email IS '연락 이메일 (auth 이메일과 별도일 수 있음)';
COMMENT ON COLUMN profiles.alien_reg_number IS '외국인등록번호 — 개인정보, RLS 본인만';
COMMENT ON COLUMN profiles.passport_number IS '여권번호 (선택)';
COMMENT ON COLUMN profiles.nationality IS '국적 ISO 코드 (예: VN, KR, CN)';

-- ═══ 3. RLS 정책 ═══
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 본인만 자기 프로필 조회 가능
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 본인만 자기 프로필 수정 가능
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 회원가입 시 자기 프로필 생성 가능 (id = auth.uid())
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ═══ 4. 신규 사용자 자동 프로필 생성 트리거 ═══
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ═══ 5. updated_at 자동 갱신 ═══
CREATE OR REPLACE FUNCTION profiles_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  -- 필수 필드가 모두 채워졌으면 profile_completed_at 설정
  IF NEW.phone IS NOT NULL AND NEW.alien_reg_number IS NOT NULL
     AND OLD.profile_completed_at IS NULL THEN
    NEW.profile_completed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_update ON profiles;
CREATE TRIGGER trg_profiles_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION profiles_update_timestamp();

-- ═══ 6. 인덱스 ═══
CREATE INDEX IF NOT EXISTS idx_profiles_completed
  ON profiles(profile_completed_at)
  WHERE profile_completed_at IS NOT NULL;

-- ═══ 검증 쿼리 ═══
-- SELECT id, phone, alien_reg_number, profile_completed_at FROM profiles;
