-- ════════════════════════════════════════════════════════════
-- 국제처 담당자 포털 (PartWork Staff Portal)
-- 실행일: 2026-04-25
-- 순서: migration-user-profile.sql 이후 실행
-- ════════════════════════════════════════════════════════════
--
-- 399개 대학의 국제처 담당자가 자신의 대학에 속한 외국인 유학생
-- 시간제취업 신청서를 검토·서명·승인·반려할 수 있는 시스템.
--
-- 주요 기능:
--   1. 담당자 계정 (university_staff) — 대학 ID 기반 권한 분리
--   2. 디지털 서명 (서명 이미지 base64 + 감사 로그)
--   3. 신청서 상태 워크플로 (submitted → reviewing → signed → approved/rejected)
--   4. 알림 (학생/담당자 양방향)
--
-- 보안 모델:
--   - 담당자는 자기 대학의 신청서만 조회/수정 가능 (RLS)
--   - 한 대학에 여러 담당자 가능 (지점/직위별)
--   - 한 사람이 여러 대학 담당자도 가능 (위탁 관리 케이스)
--   - 마스터 관리자(K-ALBA 운영팀)는 전체 조회 가능

-- ═══ 1. universities 테이블 (존재 시 스킵, 없으면 생성) ═══
-- 399개 대학은 이미 다른 마이그레이션에서 등록됨. 여기서는 컬럼만 보장.
CREATE TABLE IF NOT EXISTS universities (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  name_en         TEXT,
  region          TEXT,
  certified       BOOLEAN DEFAULT false,  -- IEQAS 인증대학 여부
  established_year INT,
  type            TEXT, -- '4년제', '전문대학', '대학원대학', '사이버대' 등
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 인증대학 인덱스
CREATE INDEX IF NOT EXISTS idx_universities_certified ON universities(certified) WHERE certified = true;
CREATE INDEX IF NOT EXISTS idx_universities_name ON universities(name);


-- ═══ 2. university_staff (담당자) 테이블 ═══
CREATE TABLE IF NOT EXISTS university_staff (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  university_id   BIGINT NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,

  -- 담당자 정보 (시간제취업확인서에 들어가는 정보)
  staff_name      TEXT NOT NULL,
  staff_position  TEXT,                    -- 직위 (예: "유학생지원팀장", "Korean Coordinator")
  staff_phone     TEXT,
  staff_email     TEXT,
  department      TEXT DEFAULT '국제처',    -- 소속 (예: "국제처", "Office of International Affairs")

  -- 디지털 서명 (Canvas로 그린 후 base64로 저장)
  default_signature TEXT,                    -- data:image/png;base64,...
  signature_updated_at TIMESTAMPTZ,

  -- 권한 / 상태
  role            TEXT NOT NULL DEFAULT 'reviewer'
                  CHECK (role IN ('reviewer', 'manager', 'admin')),
                  -- reviewer: 검토·서명만 / manager: 다른 담당자 관리 가능 / admin: 대학 설정 변경 가능
  is_active       BOOLEAN DEFAULT true,
  invitation_status TEXT DEFAULT 'invited'
                    CHECK (invitation_status IN ('invited', 'accepted', 'declined', 'revoked')),
  invited_by      UUID REFERENCES auth.users(id),
  invited_at      TIMESTAMPTZ DEFAULT now(),
  accepted_at     TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  -- 한 사람이 한 대학에 한 번만 등록 (역할만 다름)
  UNIQUE (user_id, university_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_user      ON university_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_university ON university_staff(university_id);
CREATE INDEX IF NOT EXISTS idx_staff_active    ON university_staff(is_active) WHERE is_active = true;

COMMENT ON TABLE  university_staff IS '국제처/유학생지원팀 담당자 (대학별 권한)';
COMMENT ON COLUMN university_staff.default_signature IS '담당자 기본 서명 (Canvas → base64 PNG, 시간제취업확인서 자동 삽입)';
COMMENT ON COLUMN university_staff.role IS 'reviewer: 검토·서명, manager: 담당자 관리, admin: 대학 설정';


-- ═══ 3. partwork_applications 워크플로 컬럼 추가 ═══
ALTER TABLE partwork_applications
  -- 처리 워크플로
  ADD COLUMN IF NOT EXISTS reviewing_at      TIMESTAMPTZ,    -- 담당자 검토 시작 시각
  ADD COLUMN IF NOT EXISTS reviewer_id       UUID REFERENCES university_staff(id),
  ADD COLUMN IF NOT EXISTS approved_at       TIMESTAMPTZ,    -- 승인 시각
  ADD COLUMN IF NOT EXISTS rejected_at       TIMESTAMPTZ,    -- 반려 시각
  ADD COLUMN IF NOT EXISTS rejection_reason  TEXT,           -- 반려 사유
  -- 추가 서류 요청 (9번 마이그레이션 partwork_documents에서 정의된 requested_documents, documents_requested_at, documents_request_note 사용)
  -- 담당자 서명 (시간제취업확인서에 들어감)
  ADD COLUMN IF NOT EXISTS staff_signature      TEXT,        -- base64 서명 이미지
  ADD COLUMN IF NOT EXISTS staff_signature_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS staff_signed_by      UUID REFERENCES university_staff(id),
  -- 인증대학 체크 (담당자가 확정)
  ADD COLUMN IF NOT EXISTS staff_certified_check BOOLEAN,
  -- 최종 PDF
  ADD COLUMN IF NOT EXISTS final_confirmation_url TEXT,      -- 서명 완료된 시간제취업확인서 PDF
  ADD COLUMN IF NOT EXISTS final_confirmation_generated_at TIMESTAMPTZ;

-- 워크플로 status 확장
ALTER TABLE partwork_applications
  DROP CONSTRAINT IF EXISTS partwork_applications_status_check;
ALTER TABLE partwork_applications
  ADD CONSTRAINT partwork_applications_status_check CHECK (
    status IN (
      'draft',                -- 작성 중 (학생)
      'submitted',            -- 제출됨 (담당자 대기)
      'reviewing',            -- 검토 중 (담당자가 열어봄)
      'documents_needed',     -- 추가 서류 요청됨 (학생 대기)
      'signed',               -- 담당자 서명 완료 (출입국 제출 가능)
      'approved',             -- 승인 (출입국 허가)
      'rejected'              -- 반려
    )
  );

CREATE INDEX IF NOT EXISTS idx_partwork_status_uni
  ON partwork_applications(university_name, status, submitted_at DESC);

COMMENT ON COLUMN partwork_applications.staff_signature IS '담당자 서명 (시간제취업확인서 유학생담당자 확인란)';
-- requested_documents는 9번 마이그레이션 (partwork_documents)에서 COMMENT 정의됨


-- ═══ 4. 처리 이력 테이블 (감사 로그) ═══
CREATE TABLE IF NOT EXISTS partwork_review_log (
  id              BIGSERIAL PRIMARY KEY,
  application_id  UUID NOT NULL REFERENCES partwork_applications(id) ON DELETE CASCADE,
  staff_id        UUID REFERENCES university_staff(id),
  action          TEXT NOT NULL CHECK (action IN (
                    'opened',          -- 신청서 열어봄
                    'requested_docs',  -- 추가 서류 요청
                    'signed',          -- 서명
                    'approved',        -- 승인
                    'rejected',        -- 반려
                    'commented'        -- 메모 추가
                  )),
  note            TEXT,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_review_log_app ON partwork_review_log(application_id, created_at DESC);

-- 감사 로그는 절대 수정/삭제 불가 (APPEND ONLY)
CREATE OR REPLACE FUNCTION prevent_review_log_modify() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION '감사 로그는 수정/삭제할 수 없습니다 (APPEND ONLY)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_review_log_update ON partwork_review_log;
CREATE TRIGGER prevent_review_log_update
  BEFORE UPDATE OR DELETE ON partwork_review_log
  FOR EACH ROW EXECUTE FUNCTION prevent_review_log_modify();


-- ═══ 5. 담당자 초대 테이블 (이메일 인증 기반) ═══
CREATE TABLE IF NOT EXISTS staff_invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id   INT NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  staff_name      TEXT,
  staff_position  TEXT,
  role            TEXT NOT NULL DEFAULT 'reviewer',
  invitation_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by      UUID NOT NULL REFERENCES auth.users(id),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  used            BOOLEAN DEFAULT false,
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (university_id, email)
);
CREATE INDEX IF NOT EXISTS idx_invitation_token ON staff_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_invitation_email ON staff_invitations(email);


-- ═══ 6. RLS 정책 ═══
ALTER TABLE university_staff ENABLE ROW LEVEL SECURITY;

-- 담당자: 자기 자신의 정보만 조회 가능
DROP POLICY IF EXISTS "Staff can view own record" ON university_staff;
CREATE POLICY "Staff can view own record"
  ON university_staff FOR SELECT
  USING (auth.uid() = user_id);

-- 같은 대학 manager 이상은 다른 담당자 조회 가능
DROP POLICY IF EXISTS "Manager can view same university staff" ON university_staff;
CREATE POLICY "Manager can view same university staff"
  ON university_staff FOR SELECT
  USING (
    university_id IN (
      SELECT university_id FROM university_staff
      WHERE user_id = auth.uid() AND role IN ('manager', 'admin') AND is_active = true
    )
  );

-- 담당자: 자기 정보 수정 가능
DROP POLICY IF EXISTS "Staff can update own record" ON university_staff;
CREATE POLICY "Staff can update own record"
  ON university_staff FOR UPDATE
  USING (auth.uid() = user_id);


-- partwork_applications RLS 갱신
ALTER TABLE partwork_applications ENABLE ROW LEVEL SECURITY;

-- 학생: 본인 신청서만
DROP POLICY IF EXISTS "Student can view own applications" ON partwork_applications;
CREATE POLICY "Student can view own applications"
  ON partwork_applications FOR SELECT
  USING (auth.uid() = user_id);

-- 담당자: 자기 대학 신청서만 조회 가능
DROP POLICY IF EXISTS "Staff can view applications of their university" ON partwork_applications;
CREATE POLICY "Staff can view applications of their university"
  ON partwork_applications FOR SELECT
  USING (
    university_name IN (
      SELECT u.name FROM universities u
      JOIN university_staff s ON s.university_id = u.id
      WHERE s.user_id = auth.uid() AND s.is_active = true
    )
  );

-- 담당자: 자기 대학 신청서 수정 가능 (서명, 승인 등)
DROP POLICY IF EXISTS "Staff can update applications of their university" ON partwork_applications;
CREATE POLICY "Staff can update applications of their university"
  ON partwork_applications FOR UPDATE
  USING (
    university_name IN (
      SELECT u.name FROM universities u
      JOIN university_staff s ON s.university_id = u.id
      WHERE s.user_id = auth.uid() AND s.is_active = true
    )
  );


-- ═══ 7. 트리거: 담당자 서명 시 자동 상태 변경 ═══
CREATE OR REPLACE FUNCTION on_staff_signature_apply() RETURNS TRIGGER AS $$
BEGIN
  -- 서명이 새로 추가됐고 status가 reviewing이면 → signed로 자동 변경
  IF NEW.staff_signature IS NOT NULL AND OLD.staff_signature IS NULL THEN
    NEW.staff_signature_at = now();
    IF NEW.status = 'reviewing' OR NEW.status = 'submitted' OR NEW.status = 'documents_needed' THEN
      NEW.status = 'signed';
    END IF;
  END IF;
  -- 승인 시각 자동
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.approved_at = now();
  END IF;
  -- 반려 시각 자동
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    NEW.rejected_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_partwork_staff_action ON partwork_applications;
CREATE TRIGGER trg_partwork_staff_action
  BEFORE UPDATE ON partwork_applications
  FOR EACH ROW EXECUTE FUNCTION on_staff_signature_apply();


-- ═══ 8. 통계 뷰 (담당자 대시보드용) ═══
CREATE OR REPLACE VIEW partwork_university_stats AS
SELECT
  u.id AS university_id,
  u.name AS university_name,
  u.certified,
  COUNT(*) FILTER (WHERE pa.status = 'submitted')        AS pending_count,
  COUNT(*) FILTER (WHERE pa.status = 'reviewing')        AS reviewing_count,
  COUNT(*) FILTER (WHERE pa.status = 'documents_needed') AS docs_needed_count,
  COUNT(*) FILTER (WHERE pa.status = 'signed')           AS signed_count,
  COUNT(*) FILTER (WHERE pa.status = 'approved')         AS approved_count,
  COUNT(*) FILTER (WHERE pa.status = 'rejected')         AS rejected_count,
  COUNT(*) FILTER (WHERE pa.created_at > now() - INTERVAL '7 days') AS weekly_count,
  COUNT(*) AS total_count,
  AVG(EXTRACT(EPOCH FROM (pa.staff_signature_at - pa.submitted_at)) / 3600)
    FILTER (WHERE pa.staff_signature_at IS NOT NULL) AS avg_processing_hours
FROM universities u
LEFT JOIN partwork_applications pa ON pa.university_name = u.name
GROUP BY u.id, u.name, u.certified;


-- ═══ 검증 쿼리 ═══
-- SELECT * FROM partwork_university_stats WHERE pending_count > 0 ORDER BY pending_count DESC;
-- SELECT * FROM university_staff WHERE is_active = true;
-- SELECT * FROM partwork_review_log WHERE application_id = 123 ORDER BY created_at;