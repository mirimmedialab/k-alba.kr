-- ════════════════════════════════════════════════════════════
-- K-ALBA PartWork 서류 업로드 & 요청 시스템
-- 실행일: 2026-04-24
-- 순서: migration-signatures.sql 이후 실행
-- ════════════════════════════════════════════════════════════
--
-- 추가 기능 (v2 — 2026-04-25 업데이트):
--   1. 표준근로계약서 (contract) — 계약서 챗봇 자동 첨부 또는 직접 업로드
--   2. 재학증명서 (enrollment) — 모든 신청자 필수
--   3. 성적증명서 (grade) — 선택 (담당자 요청 시)
--   4. 한국어능력증명서 (topik_cert) — 선택 (TOPIK 보유 시)
--   5. 여권 사본 (passport) — 모든 신청자 필수
--   6. 외국인등록증 (arc) — 모든 신청자 필수
--
-- 저장 전략:
--   - 개인정보 보호를 위해 Supabase Storage 'partwork-documents' (비공개 버킷)
--   - 서명된 URL (signed URL, 24시간 만료) 로만 접근
--   - RLS: 본인과 해당 대학 국제처 담당자만 접근

-- ═══ 1. 업로드 파일 필드 (6종) ═══
ALTER TABLE partwork_applications
  -- 표준근로계약서 (자동 첨부 외 직접 업로드 시)
  ADD COLUMN IF NOT EXISTS contract_file_url TEXT,
  ADD COLUMN IF NOT EXISTS contract_file_name TEXT,
  -- 재학증명서 (필수)
  ADD COLUMN IF NOT EXISTS enrollment_file_url TEXT,
  ADD COLUMN IF NOT EXISTS enrollment_file_name TEXT,
  ADD COLUMN IF NOT EXISTS enrollment_uploaded_at TIMESTAMPTZ,
  -- 성적증명서 (선택)
  ADD COLUMN IF NOT EXISTS grade_file_url TEXT,
  ADD COLUMN IF NOT EXISTS grade_file_name TEXT,
  -- 한국어능력증명서 (선택, TOPIK 성적표)
  ADD COLUMN IF NOT EXISTS topik_cert_file_url TEXT,
  ADD COLUMN IF NOT EXISTS topik_cert_file_name TEXT,
  -- 여권 (필수)
  ADD COLUMN IF NOT EXISTS passport_file_url TEXT,
  ADD COLUMN IF NOT EXISTS passport_file_name TEXT,
  ADD COLUMN IF NOT EXISTS passport_uploaded_at TIMESTAMPTZ,
  -- 외국인등록증 (필수)
  ADD COLUMN IF NOT EXISTS arc_file_url TEXT,
  ADD COLUMN IF NOT EXISTS arc_file_name TEXT,
  ADD COLUMN IF NOT EXISTS arc_uploaded_at TIMESTAMPTZ,
  -- 레거시 호환 (기존 transcript/attendance 컬럼 유지)
  ADD COLUMN IF NOT EXISTS transcript_file_url TEXT,
  ADD COLUMN IF NOT EXISTS transcript_file_name TEXT,
  ADD COLUMN IF NOT EXISTS transcript_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attendance_file_url TEXT,
  ADD COLUMN IF NOT EXISTS attendance_file_name TEXT,
  ADD COLUMN IF NOT EXISTS attendance_uploaded_at TIMESTAMPTZ;

COMMENT ON COLUMN partwork_applications.contract_file_url IS '표준근로계약서 직접 업로드 (PDF 자동 첨부 외)';
COMMENT ON COLUMN partwork_applications.enrollment_file_url IS '재학증명서 (대학 발급, 필수)';
COMMENT ON COLUMN partwork_applications.grade_file_url IS '성적증명서 (선택, 담당자 요청 시)';
COMMENT ON COLUMN partwork_applications.topik_cert_file_url IS 'TOPIK 한국어능력증명서 (선택)';
COMMENT ON COLUMN partwork_applications.passport_file_url IS '여권 스캔 (개인정보, 비공개 버킷)';
COMMENT ON COLUMN partwork_applications.arc_file_url IS '외국인등록증 스캔 (개인정보, 비공개 버킷)';

-- ═══ 2. 추가 서류 요청 트래킹 ═══
ALTER TABLE partwork_applications
  ADD COLUMN IF NOT EXISTS requested_documents TEXT[],          -- ['transcript', 'attendance']
  ADD COLUMN IF NOT EXISTS documents_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS documents_request_note TEXT;

COMMENT ON COLUMN partwork_applications.requested_documents IS '국제처 담당자가 요청한 추가 서류 목록';
COMMENT ON COLUMN partwork_applications.documents_requested_at IS '요청 시각 (학생에게 알림 발송용)';

-- ═══ 3. 계약서 자동 연동을 위한 뷰 ═══
-- 학생이 partwork 신청할 때 본인의 서명 완료 계약서 조회
CREATE OR REPLACE VIEW my_signed_contracts AS
SELECT
  c.id,
  c.job_id,
  c.employer_name,
  c.company_name,
  c.business_number,
  c.business_address,
  c.employer_phone,
  c.worker_id,
  c.worker_name,
  c.job_description,
  c.job_type,
  c.work_days,
  c.work_start,
  c.work_end,
  c.pay_type,
  c.pay_amount,
  c.contract_start,
  c.contract_end,
  c.worker_signed,
  c.employer_signed,
  c.status,
  c.pdf_url,
  c.created_at,
  -- 주당 근무 시간 자동 계산
  CASE
    WHEN c.work_days IS NOT NULL AND c.work_start IS NOT NULL AND c.work_end IS NOT NULL THEN
      array_length(c.work_days, 1) *
      (EXTRACT(EPOCH FROM (c.work_end::TIME - c.work_start::TIME)) / 3600)::INT
    ELSE 20
  END AS weekly_hours_calculated
FROM contracts c
WHERE c.worker_signed = true AND c.employer_signed = true
  AND c.status = 'completed';

-- ═══ 4. 서류 요청 처리 함수 (담당자용) ═══
CREATE OR REPLACE FUNCTION request_partwork_documents(
  p_application_id UUID,
  p_documents TEXT[],
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_app RECORD;
BEGIN
  -- 유효성 검사
  IF NOT (p_documents <@ ARRAY['transcript', 'attendance', 'other']) THEN
    RAISE EXCEPTION '유효하지 않은 서류 종류입니다. (허용: transcript, attendance, other)';
  END IF;

  SELECT * INTO v_app FROM partwork_applications WHERE id = p_application_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION '신청서를 찾을 수 없습니다.';
  END IF;

  UPDATE partwork_applications SET
    requested_documents = p_documents,
    documents_requested_at = now(),
    documents_request_note = p_note,
    status = 'documents_needed',
    updated_at = now()
  WHERE id = p_application_id;

  RETURN jsonb_build_object(
    'ok', true,
    'application_id', p_application_id,
    'requested', p_documents,
    'requested_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══ 5. RLS 정책 (partwork-documents Storage 버킷) ═══
-- Supabase 콘솔에서 버킷 생성 후, Storage Policy 설정 필요:
--
-- Policy 1: 본인 파일만 업로드
--   FOR INSERT
--   WITH CHECK (bucket_id = 'partwork-documents' AND auth.uid()::text = (storage.foldername(name))[1])
--
-- Policy 2: 본인 파일만 읽기
--   FOR SELECT
--   USING (bucket_id = 'partwork-documents' AND auth.uid()::text = (storage.foldername(name))[1])
--
-- Policy 3: 본인 파일만 삭제
--   FOR DELETE
--   USING (bucket_id = 'partwork-documents' AND auth.uid()::text = (storage.foldername(name))[1])
--
-- (관리자/국제처 담당자 접근은 service_role 경유)

-- 검증 쿼리
-- SELECT * FROM my_signed_contracts;
-- SELECT request_partwork_documents('uuid-here', ARRAY['transcript','attendance'], '성적증명서 원본이 필요합니다');
