-- ════════════════════════════════════════════════════════════
-- K-ALBA 전자서명 시스템 마이그레이션
-- 실행일: 2026-04-24
-- 순서: migration-partwork.sql 이후 실행
-- ════════════════════════════════════════════════════════════
--
-- 목적:
--   1. 손글씨 서명 이미지 저장 (Canvas → PNG base64)
--   2. 서명 시점의 법적 감사 로그 (IP, User-Agent, 기기, 위치)
--   3. 프로필에 기본 서명 저장 → 재사용
--   4. contracts, partwork_applications 양쪽에 서명 삽입
--
-- 법적 근거:
--   - 전자서명법 제3조: 당사자 간 합의된 전자서명은 효력 인정
--   - 근로기준법 제17조: 서면(전자문서 포함) 계약서 의무
--
-- 보안:
--   - 서명 이미지는 Supabase Storage가 아닌 DB에 base64 저장 (짧고 빠름)
--   - 감사 로그는 삭제/수정 불가 (APPEND ONLY)
--   - 서명 완료 후 계약서 내용 변경 시 모든 서명 무효화 트리거

-- ═══ 1. profiles에 기본 서명 컬럼 추가 ═══
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS default_signature TEXT,
  ADD COLUMN IF NOT EXISTS default_signature_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.default_signature IS '사장님 기본 서명 (PNG base64). 계약서/확인서에 재사용';

-- ═══ 2. 서명 감사 로그 테이블 (APPEND ONLY) ═══
CREATE TABLE IF NOT EXISTS signature_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 참조 (계약서 or 시간제취업확인서 중 하나)
  contract_id   BIGINT REFERENCES contracts(id) ON DELETE CASCADE,
  partwork_id   UUID REFERENCES partwork_applications(id) ON DELETE CASCADE,

  -- 서명자
  user_id       UUID REFERENCES auth.users(id),
  role          TEXT NOT NULL CHECK (role IN ('worker', 'employer', 'student', 'reviewer')),
  signer_name   TEXT NOT NULL,

  -- 서명 이미지
  signature_png TEXT NOT NULL,               -- base64 data URL
  signature_hash TEXT,                        -- SHA-256 해시 (위변조 증명)
  stroke_count  INT,                          -- 획수 (품질 검증)

  -- 서명 시점 감사 데이터
  ip_address    INET,
  user_agent    TEXT,
  device_type   TEXT,                         -- mobile | desktop | tablet
  platform      TEXT,                         -- ios | android | web
  browser       TEXT,

  -- 위치 (선택)
  location_lat  DOUBLE PRECISION,
  location_lng  DOUBLE PRECISION,
  location_accuracy INT,

  -- 계약서 스냅샷 해시 (내용 변경 감지)
  document_hash TEXT,                         -- 서명 당시 계약서 전체 내용 SHA-256

  -- 타임스탬프
  signed_at     TIMESTAMPTZ DEFAULT now(),

  -- 무결성 체크 (두 참조 중 하나만 있어야 함)
  CONSTRAINT signature_audit_single_ref CHECK (
    (contract_id IS NOT NULL AND partwork_id IS NULL) OR
    (contract_id IS NULL AND partwork_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_signature_audit_contract ON signature_audit_log(contract_id);
CREATE INDEX IF NOT EXISTS idx_signature_audit_partwork ON signature_audit_log(partwork_id);
CREATE INDEX IF NOT EXISTS idx_signature_audit_user ON signature_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_signature_audit_signed_at ON signature_audit_log(signed_at DESC);

-- APPEND ONLY 규정 (업데이트/삭제 차단)
ALTER TABLE signature_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_readonly_select" ON signature_audit_log;
CREATE POLICY "audit_log_readonly_select" ON signature_audit_log
  FOR SELECT
  USING (
    -- 본인의 서명 로그만 조회 가능
    user_id = auth.uid()
    -- 또는 해당 계약/확인서에 관련된 자만 (worker/employer)
    OR contract_id IN (
      SELECT id FROM contracts
      WHERE worker_id = auth.uid() OR employer_id = auth.uid()
    )
    OR partwork_id IN (
      SELECT id FROM partwork_applications WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "audit_log_insert_own" ON signature_audit_log;
CREATE POLICY "audit_log_insert_own" ON signature_audit_log
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 업데이트/삭제 차단 (RLS로 모두 거부)
DROP POLICY IF EXISTS "audit_log_no_update" ON signature_audit_log;
CREATE POLICY "audit_log_no_update" ON signature_audit_log FOR UPDATE USING (false);

DROP POLICY IF EXISTS "audit_log_no_delete" ON signature_audit_log;
CREATE POLICY "audit_log_no_delete" ON signature_audit_log FOR DELETE USING (false);

-- ═══ 3. contracts에 서명 메타 추가 ═══
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS worker_signature_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS employer_signature_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS worker_signature_ip INET,
  ADD COLUMN IF NOT EXISTS employer_signature_ip INET,
  ADD COLUMN IF NOT EXISTS document_hash_at_signing TEXT,
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMPTZ;

COMMENT ON COLUMN contracts.document_hash_at_signing IS '양측 서명 완료 시점의 계약서 내용 해시 (위변조 감지)';
COMMENT ON COLUMN contracts.pdf_url IS '서명이 삽입된 최종 PDF Supabase Storage URL';

-- ═══ 4. partwork_applications에 서명 필드 추가 ═══
ALTER TABLE partwork_applications
  ADD COLUMN IF NOT EXISTS student_signature TEXT,       -- 학생 본인 서명
  ADD COLUMN IF NOT EXISTS student_signature_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS employer_signature TEXT,      -- 사장님 서명 (시간제취업확인서용)
  ADD COLUMN IF NOT EXISTS employer_signature_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmation_pdf_url TEXT,    -- 시간제취업확인서 PDF
  ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMPTZ;

COMMENT ON COLUMN partwork_applications.employer_signature IS '사장님 서명 (프로필에서 자동 불러옴)';
COMMENT ON COLUMN partwork_applications.confirmation_pdf_url IS '시간제취업확인서 PDF (출입국청 제출용)';

-- ═══ 5. 계약서 내용 변경 감지 트리거 ═══
-- 양측 서명 완료 후 주요 내용 수정 시 경고
CREATE OR REPLACE FUNCTION prevent_signed_contract_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.worker_signed = true AND OLD.employer_signed = true THEN
    -- 서명 완료된 계약서는 주요 필드 수정 금지
    IF (
      OLD.pay_amount IS DISTINCT FROM NEW.pay_amount OR
      OLD.contract_start IS DISTINCT FROM NEW.contract_start OR
      OLD.contract_end IS DISTINCT FROM NEW.contract_end OR
      OLD.work_start IS DISTINCT FROM NEW.work_start OR
      OLD.work_end IS DISTINCT FROM NEW.work_end OR
      OLD.job_description IS DISTINCT FROM NEW.job_description
    ) THEN
      RAISE EXCEPTION '서명 완료된 계약서의 주요 조건은 수정할 수 없습니다. 부속 합의서를 작성하세요.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_signed_mod ON contracts;
CREATE TRIGGER trg_prevent_signed_mod
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION prevent_signed_contract_modification();

-- ═══ 6. 서명 검증 뷰 (관리자용) ═══
CREATE OR REPLACE VIEW contract_signature_verification AS
SELECT
  c.id AS contract_id,
  c.worker_name,
  c.employer_name,
  c.worker_signed,
  c.employer_signed,
  c.worker_signature_at,
  c.employer_signature_at,
  (SELECT COUNT(*) FROM signature_audit_log WHERE contract_id = c.id) AS audit_log_count,
  (SELECT MIN(signed_at) FROM signature_audit_log WHERE contract_id = c.id) AS first_signed_at,
  (SELECT MAX(signed_at) FROM signature_audit_log WHERE contract_id = c.id) AS last_signed_at,
  c.document_hash_at_signing,
  c.pdf_url
FROM contracts c
WHERE c.worker_signed = true OR c.employer_signed = true;

-- ═══ 검증 쿼리 ═══
-- SELECT * FROM contract_signature_verification LIMIT 5;
-- SELECT * FROM signature_audit_log ORDER BY signed_at DESC LIMIT 10;
