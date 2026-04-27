-- ════════════════════════════════════════════════════════════
-- 담당자 검증 시스템 강화 (Staff Verification Hardening)
-- 실행일: 2026-04-26
-- 순서: migration-staff-portal.sql 이후 실행
-- ════════════════════════════════════════════════════════════
--
-- 목적: 국제처 담당자 권한 부여 시 6가지 검증 추가
--   1. 학교 도메인 이메일만 초대 가능 (allowed_email_domains)
--   2. 자가 승인 차단 (담당자가 본인 신청서는 처리 불가)
--   3. 첫 admin 등록 신청 양식 (staff_registrations)
--   4. 직원증 업로드 (id_card_url)
--   5. 정기 재검증 알림 (last_verified_at)
--   6. 이상 활동 감지를 위한 일괄 처리 카운터

-- ═══ 1. universities 테이블 확장 ═══
ALTER TABLE universities
  ADD COLUMN IF NOT EXISTS allowed_email_domains TEXT[]   DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS official_phone        TEXT,    -- 학교 대표번호 (운영팀 검증용)
  ADD COLUMN IF NOT EXISTS official_address      TEXT,    -- 학교 주소
  ADD COLUMN IF NOT EXISTS website_url           TEXT,    -- 학교 홈페이지
  ADD COLUMN IF NOT EXISTS registered_at         TIMESTAMPTZ; -- 시스템 등록 완료 시각

CREATE INDEX IF NOT EXISTS idx_uni_domains ON universities USING GIN (allowed_email_domains);

COMMENT ON COLUMN universities.allowed_email_domains IS
  '담당자 가입 가능한 학교 공식 이메일 도메인 (예: [hanyang.ac.kr, hanyang.kr])';


-- ═══ 2. university_staff 검증 컬럼 ═══
ALTER TABLE university_staff
  ADD COLUMN IF NOT EXISTS id_card_url       TEXT,        -- 직원증 사진 (Supabase Storage)
  ADD COLUMN IF NOT EXISTS id_card_verified  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS id_card_verified_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS id_card_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS phone_verified    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_verified_at  TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS verification_due_at TIMESTAMPTZ
    GENERATED ALWAYS AS (last_verified_at + INTERVAL '1 year') STORED;

COMMENT ON COLUMN university_staff.last_verified_at IS '마지막 재검증 시각 (1년마다 갱신 필요)';
COMMENT ON COLUMN university_staff.verification_due_at IS '재검증 만료일 (자동 계산)';


-- ═══ 3. 첫 admin 등록 신청 테이블 ═══
-- /staff/register에서 학교가 운영팀에 보내는 공식 신청서
CREATE TABLE IF NOT EXISTS staff_registrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 신청 학교
  university_name TEXT NOT NULL,
  university_id   BIGINT REFERENCES universities(id), -- 운영팀이 매칭

  -- 신청자 정보
  applicant_name      TEXT NOT NULL,
  applicant_position  TEXT NOT NULL,            -- 직위
  applicant_email     TEXT NOT NULL,            -- 학교 공식 이메일 (필수 검증)
  applicant_phone     TEXT NOT NULL,            -- 본인 휴대전화
  applicant_office_phone TEXT,                  -- 사무실 전화 (선택)
  department          TEXT NOT NULL,            -- 소속 부서 (예: 국제처)

  -- 검증 자료
  official_letter_url TEXT,                     -- 공문 PDF (학교 직인)
  id_card_url         TEXT,                     -- 직원증 사진
  business_card_url   TEXT,                     -- 명함 사진 (선택)

  -- 추가 메모 (신청자가 기입)
  notes               TEXT,

  -- 검증 상태
  status              TEXT NOT NULL DEFAULT 'submitted'
                      CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'needs_more_info')),

  -- 운영팀 검증 결과
  reviewer_id         UUID REFERENCES auth.users(id), -- 검토한 운영팀원
  reviewed_at         TIMESTAMPTZ,
  review_notes        TEXT,
  rejection_reason    TEXT,

  -- 검증 체크리스트 (운영팀이 단계별 확인)
  verified_domain_match     BOOLEAN DEFAULT false,  -- 학교 도메인 이메일 ✓
  verified_official_letter  BOOLEAN DEFAULT false,  -- 공문 진위 확인 ✓
  verified_phone_call       BOOLEAN DEFAULT false,  -- 학교 대표번호로 통화 확인 ✓
  verified_website_match    BOOLEAN DEFAULT false,  -- 학교 홈페이지의 담당자 정보 일치 ✓
  verified_id_card          BOOLEAN DEFAULT false,  -- 직원증 사진 확인 ✓

  -- 메타데이터
  ip_address          TEXT,
  user_agent          TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reg_status     ON staff_registrations(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reg_uni        ON staff_registrations(university_id);
CREATE INDEX IF NOT EXISTS idx_reg_email      ON staff_registrations(applicant_email);

COMMENT ON TABLE staff_registrations IS '대학 첫 admin 등록 신청서 (운영팀이 직접 검증)';


-- ═══ 4. 자가 승인 차단 RLS 정책 ═══
-- 담당자가 본인 명의의 신청서는 처리할 수 없도록 차단
DROP POLICY IF EXISTS "Staff cannot self-approve" ON partwork_applications;
CREATE POLICY "Staff cannot self-approve"
  ON partwork_applications FOR UPDATE
  USING (
    -- 담당자 권한이 있고
    university_name IN (
      SELECT u.name FROM universities u
      JOIN university_staff s ON s.university_id = u.id
      WHERE s.user_id = auth.uid() AND s.is_active = true
    )
    -- 그리고 본인의 신청서가 아닌 경우에만 수정 가능
    AND user_id != auth.uid()
  );


-- ═══ 5. 도메인 검증 함수 ═══
CREATE OR REPLACE FUNCTION verify_email_domain(
  p_email TEXT,
  p_university_id BIGINT
) RETURNS BOOLEAN AS $$
DECLARE
  email_domain TEXT;
  allowed TEXT[];
BEGIN
  -- 이메일에서 도메인 추출
  email_domain := lower(split_part(p_email, '@', 2));
  IF email_domain = '' THEN RETURN false; END IF;

  -- 허용 도메인 조회
  SELECT allowed_email_domains INTO allowed
  FROM universities WHERE id = p_university_id;

  -- 빈 배열이거나 NULL이면 거부 (운영팀이 도메인 미설정한 경우 안전 차단)
  IF allowed IS NULL OR array_length(allowed, 1) IS NULL THEN
    RETURN false;
  END IF;

  -- 정확 매칭 또는 서브도메인 매칭
  RETURN EXISTS (
    SELECT 1 FROM unnest(allowed) AS d
    WHERE email_domain = d OR email_domain LIKE '%.' || d
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ═══ 6. 초대 시 도메인 검증 트리거 ═══
CREATE OR REPLACE FUNCTION enforce_invitation_domain() RETURNS TRIGGER AS $$
BEGIN
  IF NOT verify_email_domain(NEW.email, NEW.university_id) THEN
    RAISE EXCEPTION '학교 공식 이메일 도메인이 아닙니다 (이메일: %, 대학 ID: %)',
      NEW.email, NEW.university_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invitation_domain_check ON staff_invitations;
CREATE TRIGGER trg_invitation_domain_check
  BEFORE INSERT ON staff_invitations
  FOR EACH ROW EXECUTE FUNCTION enforce_invitation_domain();


-- ═══ 7. 이상 활동 감지를 위한 처리 통계 뷰 ═══
CREATE OR REPLACE VIEW staff_activity_stats AS
SELECT
  s.id AS staff_id,
  s.user_id,
  s.university_id,
  s.staff_name,
  -- 최근 1시간 처리량
  COUNT(*) FILTER (WHERE l.created_at > now() - INTERVAL '1 hour') AS hourly_actions,
  -- 최근 24시간 처리량
  COUNT(*) FILTER (WHERE l.created_at > now() - INTERVAL '24 hours') AS daily_actions,
  -- 새벽 시간 (0~6시) 처리 건수 (이상 신호)
  COUNT(*) FILTER (
    WHERE l.created_at > now() - INTERVAL '7 days'
    AND EXTRACT(HOUR FROM l.created_at AT TIME ZONE 'Asia/Seoul') BETWEEN 0 AND 5
  ) AS night_actions_week,
  -- 일괄 처리 (동일 분 단위 5건 이상) 횟수
  (
    SELECT COUNT(*)
    FROM (
      SELECT date_trunc('minute', created_at) AS m, COUNT(*) AS c
      FROM partwork_review_log
      WHERE staff_id = s.id AND created_at > now() - INTERVAL '7 days'
      GROUP BY 1
      HAVING COUNT(*) >= 5
    ) bursts
  ) AS burst_count_week,
  s.last_verified_at,
  s.verification_due_at,
  CASE
    WHEN s.verification_due_at < now() THEN 'expired'
    WHEN s.verification_due_at < now() + INTERVAL '30 days' THEN 'due_soon'
    ELSE 'ok'
  END AS verification_status
FROM university_staff s
LEFT JOIN partwork_review_log l ON l.staff_id = s.id
WHERE s.is_active = true
GROUP BY s.id, s.user_id, s.university_id, s.staff_name, s.last_verified_at, s.verification_due_at;


-- ═══ 8. 학생 신고 테이블 (이상 처리 신고용) ═══
CREATE TABLE IF NOT EXISTS staff_misconduct_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     UUID NOT NULL REFERENCES auth.users(id), -- 신고한 학생
  staff_id        UUID REFERENCES university_staff(id),    -- 신고 대상 담당자 (선택)
  application_id  BIGINT REFERENCES partwork_applications(id), -- 관련 신청서 (선택)
  category        TEXT NOT NULL CHECK (category IN (
                    'wrong_rejection',    -- 부당한 반려
                    'delayed_review',     -- 검토 지연
                    'self_approval',      -- 자가 승인 의심
                    'privacy_violation',  -- 개인정보 유출
                    'other'
                  )),
  description     TEXT NOT NULL,
  evidence_urls   TEXT[],                 -- 증거 자료 (스크린샷 등)
  status          TEXT DEFAULT 'submitted'
                  CHECK (status IN ('submitted', 'investigating', 'resolved', 'dismissed')),
  resolved_at     TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_status ON staff_misconduct_reports(status, created_at DESC);

ALTER TABLE staff_misconduct_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can submit reports" ON staff_misconduct_reports;
CREATE POLICY "Students can submit reports"
  ON staff_misconduct_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Students view own reports" ON staff_misconduct_reports;
CREATE POLICY "Students view own reports"
  ON staff_misconduct_reports FOR SELECT
  USING (auth.uid() = reporter_id);


-- ═══ 검증 쿼리 ═══
-- 도메인 매칭 테스트:
-- SELECT verify_email_domain('staff@hanyang.ac.kr', (SELECT id FROM universities WHERE name='한양대학교'));

-- 이상 활동 점검:
-- SELECT * FROM staff_activity_stats WHERE burst_count_week > 0 OR night_actions_week > 5;

-- 만료 임박 담당자:
-- SELECT staff_name, university_name, verification_due_at FROM staff_activity_stats
-- WHERE verification_status IN ('expired', 'due_soon');
