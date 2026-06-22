-- ════════════════════════════════════════════════════════════
-- K-ALBA 사용자 프로필 추가 컬럼 (PartWork 시간제취업확인서용)
-- 실행일: 2026-04-25
-- 순서: 00000000_000_base_schema.sql 이후
-- ════════════════════════════════════════════════════════════
--
-- profiles 테이블은 base_schema에서 이미 생성됨.
-- 이 마이그레이션은 PartWork 자동 채움에 필요한 컬럼만 추가.

-- ═══ 1. profiles 테이블에 PartWork 자동 채움 컬럼 추가 ═══
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS alien_reg_number TEXT,
  ADD COLUMN IF NOT EXISTS passport_number  TEXT,
  ADD COLUMN IF NOT EXISTS nationality      TEXT,
  ADD COLUMN IF NOT EXISTS birth_date       DATE,
  ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.alien_reg_number IS '외국인등록번호 — 개인정보, 본인만 접근';
COMMENT ON COLUMN profiles.passport_number IS '여권번호 (선택)';
COMMENT ON COLUMN profiles.nationality IS '국적 ISO 코드 (예: VN, KR, CN)';
COMMENT ON COLUMN profiles.birth_date IS '생년월일';
COMMENT ON COLUMN profiles.profile_completed_at IS '프로필 작성 완료 시각';

-- ═══ 2. RLS는 base_schema의 일반 정책으로 충분 ═══
-- 민감정보(alien_reg_number 등)는 application 레이어에서 별도 마스킹 처리.

-- 검증:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'profiles' AND column_name IN
-- ('alien_reg_number', 'passport_number', 'nationality', 'birth_date');