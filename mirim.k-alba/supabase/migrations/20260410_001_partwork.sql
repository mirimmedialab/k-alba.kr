-- ════════════════════════════════════════════════════════════
-- K-ALBA PartWork 시간제취업 신청 시스템
-- 실행일: 2026-04-24
-- 순서: migration-email-outreach.sql 이후 실행
-- ════════════════════════════════════════════════════════════
--
-- 대상: D-2/D-4 비자 유학생
-- 흐름:
--   1. 알바계약서 앱에서 계약 완료
--   2. 유학생이 /partwork/apply 접근 (계약 정보 자동 연동)
--   3. 자격 요건 입력 (비자/대학/TOPIK)
--   4. 법무부 기준 자동 검증 (허용 시간 계산)
--   5. 국제처 제출 → partwork_applications 레코드 생성
--   6. 학교 국제처 담당자가 관리자 페이지에서 승인/반려
--
-- 필요 사전 조건:
--   - profiles 테이블에 visa, organization, korean_level 필드 존재
--   - 교육부 인증대학 목록 별도 관리 (universities 테이블)

-- ═══ 1. universities 테이블 (교육부 인증대학 마스터) ═══
CREATE TABLE IF NOT EXISTS universities (
  id              SERIAL PRIMARY KEY,
  name            TEXT UNIQUE NOT NULL,
  english_name    TEXT,
  certified       BOOLEAN DEFAULT true,      -- 교육부 대학기관인증
  region          TEXT,                       -- 서울, 경기, 부산 등
  type            TEXT CHECK (type IN ('university', 'college', 'graduate_school')),
  website         TEXT,
  international_office_email TEXT,           -- 국제처 이메일 (제출 시 사용)
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_universities_certified ON universities(certified);
CREATE INDEX IF NOT EXISTS idx_universities_name_search ON universities USING gin(to_tsvector('simple', name));

-- 주요 대학 시드 데이터 (일부)
INSERT INTO universities (name, english_name, certified, region, type) VALUES
  ('서울대학교', 'Seoul National University', true, '서울', 'university'),
  ('연세대학교', 'Yonsei University', true, '서울', 'university'),
  ('고려대학교', 'Korea University', true, '서울', 'university'),
  ('성균관대학교', 'Sungkyunkwan University', true, '서울', 'university'),
  ('한양대학교', 'Hanyang University', true, '서울', 'university'),
  ('중앙대학교', 'Chung-Ang University', true, '서울', 'university'),
  ('경희대학교', 'Kyung Hee University', true, '서울', 'university'),
  ('한국외국어대학교', 'Hankuk University of Foreign Studies', true, '서울', 'university'),
  ('서강대학교', 'Sogang University', true, '서울', 'university'),
  ('이화여자대학교', 'Ewha Womans University', true, '서울', 'university')
ON CONFLICT (name) DO NOTHING;

-- ═══ 2. partwork_applications 테이블 ═══
CREATE TABLE IF NOT EXISTS partwork_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 신청자 정보
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  applicant_name  TEXT NOT NULL,
  applicant_email TEXT,
  applicant_phone TEXT,

  -- 비자 정보
  visa            TEXT NOT NULL CHECK (visa IN ('D-2', 'D-4')),
  arrival_date    DATE,                       -- D-4 전용 (6개월 경과 검증)

  -- 재학 정보
  course          TEXT NOT NULL CHECK (course IN ('lang', 'as', 'ug12', 'ug34', 'grad')),
  university_id   INT REFERENCES universities(id),
  university_name TEXT NOT NULL,              -- snapshot (대학명 변경 대비)
  university_certified BOOLEAN NOT NULL,

  -- 한국어 능력
  topik_level     INT DEFAULT 0 CHECK (topik_level BETWEEN 0 AND 6),

  -- 근무 정보 (알바계약서에서 연동)
  contract_id     BIGINT,                     -- contracts 테이블 참조 (optional)
  contract_pdf_url TEXT,                      -- 표준근로계약서 PDF (계약서 챗봇 자동 첨부)
  employer_name   TEXT NOT NULL,
  employer_business_no TEXT,
  position        TEXT,
  work_days       TEXT,
  weekly_hours    INT NOT NULL,
  hourly_pay      INT,
  contract_start  DATE,
  contract_end    DATE,
  season          TEXT NOT NULL CHECK (season IN ('semester', 'vacation', 'weekend')),
  work_pattern    JSONB,                       -- 자동 분석 결과 (평일/주말/방학 시간 분리)

  -- 자동 검증 결과 (신청 시점의 스냅샷)
  validation_max_hours INT,                   -- NULL = 무제한
  validation_passed    BOOLEAN NOT NULL,
  validation_detail    JSONB,                  -- 검증 체크리스트 전체

  -- 심사 상태
  status          TEXT DEFAULT 'submitted' CHECK (status IN (
    'draft',
    'submitted',      -- 제출됨 (국제처 검토 대기)
    'reviewing',      -- 검토 중
    'documents_needed', -- 추가 서류 요청
    'approved',       -- 승인
    'rejected',       -- 반려
    'cancelled'       -- 취소
  )),
  reviewer_id     UUID REFERENCES auth.users(id),   -- 국제처 담당자
  reviewer_note   TEXT,
  reviewed_at     TIMESTAMPTZ,

  -- 추가 서류 (URL 또는 파일 메타)
  documents       JSONB DEFAULT '[]',         -- [{name, url, uploaded_at}]

  -- 타임스탬프
  submitted_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partwork_user ON partwork_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_partwork_status ON partwork_applications(status);
CREATE INDEX IF NOT EXISTS idx_partwork_university ON partwork_applications(university_id);
CREATE INDEX IF NOT EXISTS idx_partwork_submitted ON partwork_applications(submitted_at DESC);

-- ═══ 3. RLS ═══
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "universities_public_read" ON universities;
CREATE POLICY "universities_public_read" ON universities FOR SELECT USING (true);

ALTER TABLE partwork_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_reads_own_applications" ON partwork_applications;
CREATE POLICY "user_reads_own_applications" ON partwork_applications
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_creates_own_application" ON partwork_applications;
CREATE POLICY "user_creates_own_application" ON partwork_applications
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_updates_own_draft" ON partwork_applications;
CREATE POLICY "user_updates_own_draft" ON partwork_applications
  FOR UPDATE
  USING (user_id = auth.uid() AND status IN ('draft', 'documents_needed'))
  WITH CHECK (user_id = auth.uid());

-- 관리자(국제처 담당)는 service_role 경유로만 업데이트

-- ═══ 4. 상태 변경 트리거 (타임스탬프 자동) ═══
CREATE OR REPLACE FUNCTION partwork_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();

  -- 상태 변경 시 해당 타임스탬프 자동 설정
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'submitted' AND OLD.submitted_at IS NULL THEN
      NEW.submitted_at := now();
    END IF;
    IF NEW.status IN ('approved', 'rejected') AND OLD.reviewed_at IS NULL THEN
      NEW.reviewed_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_partwork_update ON partwork_applications;
CREATE TRIGGER trg_partwork_update
  BEFORE UPDATE ON partwork_applications
  FOR EACH ROW EXECUTE FUNCTION partwork_update_timestamp();

-- ═══ 5. 통계 뷰 (관리자 대시보드용) ═══
CREATE OR REPLACE VIEW partwork_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'submitted') AS pending_count,
  COUNT(*) FILTER (WHERE status = 'reviewing') AS reviewing_count,
  COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
  COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_count,
  COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '7 days') AS weekly_count,
  COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '30 days') AS monthly_count,
  COUNT(*) AS total_count
FROM partwork_applications;

-- ═══ 검증 쿼리 ═══
-- SELECT * FROM universities WHERE certified = true LIMIT 10;
-- SELECT * FROM partwork_stats;

-- ═══════════════════════════════════════════════════════
-- ALTER TABLE 마이그레이션 (이미 운영 중인 DB에 적용)
-- ═══════════════════════════════════════════════════════
-- 표준근로계약서 PDF 자동 첨부 (계약서 챗봇 → PartWork)
ALTER TABLE partwork_applications
  ADD COLUMN IF NOT EXISTS contract_pdf_url TEXT;

-- 근무 패턴 자동 분석 결과 (평일/주말/방학 시간 분리)
ALTER TABLE partwork_applications
  ADD COLUMN IF NOT EXISTS work_pattern JSONB;

-- season에 'weekend' (학기 중 주말·공휴일) 추가 — 자동 판정용
ALTER TABLE partwork_applications
  DROP CONSTRAINT IF EXISTS partwork_applications_season_check;
ALTER TABLE partwork_applications
  ADD CONSTRAINT partwork_applications_season_check
    CHECK (season IN ('semester', 'vacation', 'weekend'));
