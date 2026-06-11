-- ════════════════════════════════════════════════════════════
-- K-ALBA 미등록 학교 처리 + 1회용 검토 토큰
-- 작성일: 2026-04-27
-- 순서: 14번째 (마지막 마이그레이션)
-- ════════════════════════════════════════════════════════════
--
-- 미등록 학교 학생이 시간제취업 신청 시:
--   1. 학생이 본인 학교 국제처 이메일을 직접 입력
--   2. K-ALBA가 1회용 토큰 링크가 담긴 이메일 발송
--   3. 담당자가 가입 없이 링크 클릭 → 검토 페이지 → 승인/반려
--   4. 학생에게 결과 통보, 출입국청 신청 단계로 진행
--
-- 보안 핵심:
--   - 토큰 32자 랜덤 (192비트 엔트로피)
--   - 7일 자동 만료
--   - 1회 사용 후 즉시 무효화
--   - .ac.kr / .edu 도메인만 허용
--   - IP/User-Agent 감사 로그
--   - 사용 후 학생에게 통보

-- ═══ 1. partwork_applications에 미등록 학교 처리 컬럼 추가 ═══
ALTER TABLE partwork_applications
  -- 학교 등록 상태
  ADD COLUMN IF NOT EXISTS school_status TEXT DEFAULT 'registered',
    -- 'registered'    : K-ALBA 정식 등록 학교
    -- 'invited'       : 1회용 토큰으로 초대된 담당자 (옵션 A)
    -- 'self_print'    : 학생이 출력 후 직접 학교 방문 (옵션 B)
    -- 'delegated'     : K-ALBA 운영팀 위임 처리 (옵션 C)
  -- 1회용 초대 정보 (옵션 A)
  ADD COLUMN IF NOT EXISTS invited_staff_email TEXT,
  ADD COLUMN IF NOT EXISTS invited_staff_name TEXT,
  ADD COLUMN IF NOT EXISTS invited_staff_phone TEXT,
  ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ,
  -- 자가 출력 흔적 (옵션 B)
  ADD COLUMN IF NOT EXISTS self_print_uploaded_url TEXT,
  ADD COLUMN IF NOT EXISTS self_print_uploaded_at TIMESTAMPTZ,
  -- 위임 신청 (옵션 C)
  ADD COLUMN IF NOT EXISTS delegation_requested BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS delegation_status TEXT,
    -- 'pending' | 'in_progress' | 'completed' | 'failed'
  ADD COLUMN IF NOT EXISTS delegation_note TEXT;

-- CHECK 제약 추가 (이미 있으면 스킵)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'partwork_applications_school_status_check'
      AND table_name = 'partwork_applications'
  ) THEN
    ALTER TABLE partwork_applications
      ADD CONSTRAINT partwork_applications_school_status_check
      CHECK (school_status IN ('registered', 'invited', 'self_print', 'delegated'));
  END IF;
END $$;

COMMENT ON COLUMN partwork_applications.school_status IS '학교 등록 상태 — registered/invited/self_print/delegated';
COMMENT ON COLUMN partwork_applications.invited_staff_email IS '학생이 직접 입력한 학교 국제처 이메일 (.ac.kr만)';

-- ═══ 2. 1회용 검토 토큰 테이블 ═══
-- 가입 없이 검토 가능한 임시 접근 토큰
CREATE TABLE IF NOT EXISTS staff_invitation_tokens (
  -- 토큰 자체가 인증
  token            TEXT PRIMARY KEY,                     -- 32자 base64url 랜덤
  -- 연결된 신청서
  application_id   UUID NOT NULL REFERENCES partwork_applications(id) ON DELETE CASCADE,
  -- 발급 정보
  invited_email    TEXT NOT NULL,
  invited_name     TEXT,
  email_domain     TEXT NOT NULL,                        -- 'ac.kr' | 'edu' (검증용)
  -- 만료 관리
  expires_at       TIMESTAMPTZ NOT NULL,                 -- 발급 + 7일
  -- 사용 흔적
  first_viewed_at  TIMESTAMPTZ,                          -- 처음 클릭한 시각
  view_count       INT DEFAULT 0,                        -- 본 횟수
  used_at          TIMESTAMPTZ,                          -- 액션 수행한 시각
  used_action      TEXT,                                 -- 'approved' | 'rejected' | 'declined' | 'request_docs'
  decline_reason   TEXT,                                 -- 거부 사유
  reviewer_note    TEXT,                                 -- 담당자가 남긴 메모
  -- 감사 로그
  ip_address       INET,
  user_agent       TEXT,
  -- 메타
  created_at       TIMESTAMPTZ DEFAULT now(),
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- 학생 user_id

  CONSTRAINT staff_invitation_tokens_action_check
    CHECK (used_action IS NULL OR used_action IN ('approved', 'rejected', 'declined', 'request_docs'))
);

CREATE INDEX IF NOT EXISTS idx_staff_invitation_tokens_application
  ON staff_invitation_tokens(application_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitation_tokens_email
  ON staff_invitation_tokens(invited_email);
CREATE INDEX IF NOT EXISTS idx_staff_invitation_tokens_expires
  ON staff_invitation_tokens(expires_at)
  WHERE used_at IS NULL;

COMMENT ON TABLE staff_invitation_tokens IS '1회용 검토 토큰 — 미등록 학교 담당자가 가입 없이 검토';
COMMENT ON COLUMN staff_invitation_tokens.token IS '32자 base64url 랜덤 (192비트 엔트로피)';
COMMENT ON COLUMN staff_invitation_tokens.email_domain IS '.ac.kr 또는 .edu만 허용';

-- ═══ 3. 학교 이메일 도메인 검증 함수 ═══
-- .ac.kr, .edu, .ac.앗(영국), .edu.au 등 학술 도메인만 허용
CREATE OR REPLACE FUNCTION validate_university_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF email IS NULL OR length(email) > 255 THEN
    RETURN false;
  END IF;
  -- 일반 이메일 형식 + 학술 도메인
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.(ac\.kr|edu|ac\.[a-z]{2,3}|edu\.[a-z]{2,3})$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_university_email IS '학교 이메일 도메인 검증 (.ac.kr, .edu 등 학술 도메인만)';

-- ═══ 4. 토큰 발급 함수 ═══
-- 학생 신청서로부터 1회용 토큰 발급
CREATE OR REPLACE FUNCTION issue_staff_invitation_token(
  p_application_id UUID,
  p_email          TEXT,
  p_name           TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_token         TEXT;
  v_domain        TEXT;
  v_expires_at    TIMESTAMPTZ;
  v_existing      INT;
BEGIN
  -- 이메일 형식 검증
  IF NOT validate_university_email(p_email) THEN
    RAISE EXCEPTION '학교 이메일 형식이 올바르지 않습니다 (.ac.kr 또는 .edu): %', p_email;
  END IF;

  -- 같은 application_id + email 조합으로 활성 토큰이 있으면 재사용 (스팸 방지)
  SELECT count(*) INTO v_existing
  FROM staff_invitation_tokens
  WHERE application_id = p_application_id
    AND invited_email = lower(p_email)
    AND used_at IS NULL
    AND expires_at > now();

  IF v_existing > 0 THEN
    -- 기존 토큰 반환
    SELECT token INTO v_token
    FROM staff_invitation_tokens
    WHERE application_id = p_application_id
      AND invited_email = lower(p_email)
      AND used_at IS NULL
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;
    RETURN v_token;
  END IF;

  -- 도메인 추출
  v_domain := substring(lower(p_email) FROM '@(.+)$');
  v_expires_at := now() + INTERVAL '7 days';

  -- pgcrypto의 gen_random_bytes로 32자 랜덤 생성
  v_token := encode(gen_random_bytes(24), 'base64');
  -- base64는 + / = 포함 → URL safe로 변환
  v_token := replace(replace(replace(v_token, '+', '-'), '/', '_'), '=', '');

  INSERT INTO staff_invitation_tokens (
    token, application_id, invited_email, invited_name,
    email_domain, expires_at
  )
  VALUES (
    v_token, p_application_id, lower(p_email), p_name,
    v_domain, v_expires_at
  );

  -- partwork_applications 업데이트
  UPDATE partwork_applications
  SET school_status = 'invited',
      invited_staff_email = lower(p_email),
      invited_staff_name = p_name,
      invitation_sent_at = now(),
      updated_at = now()
  WHERE id = p_application_id;

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION issue_staff_invitation_token IS '학생 신청서 → 1회용 검토 토큰 발급';

-- ═══ 5. 토큰 검증 함수 (사용은 안 함, 단순 조회) ═══
CREATE OR REPLACE FUNCTION verify_staff_invitation_token(p_token TEXT)
RETURNS TABLE (
  is_valid          BOOLEAN,
  reason            TEXT,
  application_id    UUID,
  invited_email     TEXT
) AS $$
DECLARE
  v_record RECORD;
BEGIN
  SELECT * INTO v_record
  FROM staff_invitation_tokens
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'token_not_found'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  IF v_record.expires_at < now() THEN
    RETURN QUERY SELECT false, 'expired'::TEXT, v_record.application_id, v_record.invited_email;
    RETURN;
  END IF;

  IF v_record.used_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'already_used'::TEXT, v_record.application_id, v_record.invited_email;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'valid'::TEXT, v_record.application_id, v_record.invited_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verify_staff_invitation_token IS '토큰 유효성 검증 (만료/사용 여부)';

-- ═══ 6. 토큰 사용 함수 (승인/반려/거부) ═══
-- 토큰을 1회 사용하고 partwork_applications도 업데이트
CREATE OR REPLACE FUNCTION use_staff_invitation_token(
  p_token       TEXT,
  p_action      TEXT,                -- 'approved' | 'rejected' | 'declined' | 'request_docs'
  p_reason      TEXT DEFAULT NULL,
  p_note        TEXT DEFAULT NULL,
  p_ip          TEXT DEFAULT NULL,
  p_user_agent  TEXT DEFAULT NULL
)
RETURNS TABLE (
  success         BOOLEAN,
  message         TEXT,
  application_id  UUID
) AS $$
DECLARE
  v_record  RECORD;
  v_app_id  UUID;
BEGIN
  -- 토큰 검증
  SELECT * INTO v_record FROM staff_invitation_tokens WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'token_not_found'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_record.expires_at < now() THEN
    RETURN QUERY SELECT false, 'expired'::TEXT, v_record.application_id;
    RETURN;
  END IF;

  IF v_record.used_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'already_used'::TEXT, v_record.application_id;
    RETURN;
  END IF;

  -- 액션 검증
  IF p_action NOT IN ('approved', 'rejected', 'declined', 'request_docs') THEN
    RETURN QUERY SELECT false, 'invalid_action'::TEXT, v_record.application_id;
    RETURN;
  END IF;

  v_app_id := v_record.application_id;

  -- 토큰 사용 처리
  UPDATE staff_invitation_tokens
  SET used_at = now(),
      used_action = p_action,
      decline_reason = p_reason,
      reviewer_note = p_note,
      ip_address = p_ip::INET,
      user_agent = p_user_agent
  WHERE token = p_token;

  -- partwork_applications 상태 업데이트
  IF p_action = 'approved' THEN
    UPDATE partwork_applications
    SET status = 'reviewing',                   -- 학교 승인 → 출입국청 단계로
        approved_at = now(),                    -- 학교 승인 시각
        university_certified = true,
        reviewer_note = p_note,
        updated_at = now()
    WHERE id = v_app_id;
  ELSIF p_action = 'rejected' THEN
    UPDATE partwork_applications
    SET status = 'rejected',
        rejected_at = now(),
        rejection_reason = COALESCE(p_reason, p_note),
        updated_at = now()
    WHERE id = v_app_id;
  ELSIF p_action = 'declined' THEN
    -- 학교 측이 검토 자체를 거부 → 학생에게 다른 경로 안내
    UPDATE partwork_applications
    SET school_status = 'self_print',           -- 학교 직접 방문으로 전환
        updated_at = now()
    WHERE id = v_app_id;
  ELSIF p_action = 'request_docs' THEN
    -- 추가 서류 요청 (status는 documents_needed로 통일)
    -- 9번 마이그레이션이 정의한 컬럼: documents_requested_at, documents_request_note, requested_documents
    UPDATE partwork_applications
    SET status = 'documents_needed',
        documents_requested_at = now(),
        documents_request_note = p_note,
        updated_at = now()
    WHERE id = v_app_id;
  END IF;

  -- partwork_review_log에도 기록 (감사용)
  -- ⚠️ partwork_review_log.action CHECK는 ('opened','requested_docs','signed','approved','rejected','commented')만 허용
  -- staff invitation 액션을 매핑: declined/request_docs를 호환되는 값으로 변환
  INSERT INTO partwork_review_log (application_id, action, note, ip_address, user_agent)
  VALUES (
    v_app_id,
    CASE p_action
      WHEN 'request_docs' THEN 'requested_docs'  -- 명명 일치
      WHEN 'declined'     THEN 'commented'       -- 학교가 검토 거부 = 의견 달기로 매핑
      ELSE p_action                              -- approved, rejected는 그대로
    END,
    p_note, p_ip, p_user_agent
  );

  RETURN QUERY SELECT true, p_action::TEXT, v_app_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION use_staff_invitation_token IS '토큰 1회 사용 + 신청서 상태 업데이트';

-- ═══ 7. 조회 횟수 증가 함수 (페이지 진입 시 호출) ═══
CREATE OR REPLACE FUNCTION track_token_view(
  p_token       TEXT,
  p_ip          TEXT DEFAULT NULL,
  p_user_agent  TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE staff_invitation_tokens
  SET view_count = view_count + 1,
      first_viewed_at = COALESCE(first_viewed_at, now()),
      ip_address = COALESCE(ip_address, p_ip::INET),
      user_agent = COALESCE(user_agent, p_user_agent)
  WHERE token = p_token
    AND used_at IS NULL
    AND expires_at > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══ 8. RLS 정책 ═══
ALTER TABLE staff_invitation_tokens ENABLE ROW LEVEL SECURITY;

-- 토큰 자체로 접근 (anon 가능 — 단, application 정보는 RPC를 통해서만)
DROP POLICY IF EXISTS "tokens_no_direct_access" ON staff_invitation_tokens;
CREATE POLICY "tokens_no_direct_access" ON staff_invitation_tokens
  FOR ALL USING (false);  -- 직접 SELECT 차단, 함수로만 접근

-- 학생은 본인 토큰만 조회 가능 (상태 확인용)
DROP POLICY IF EXISTS "tokens_student_view_own" ON staff_invitation_tokens;
CREATE POLICY "tokens_student_view_own" ON staff_invitation_tokens
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM partwork_applications WHERE id = staff_invitation_tokens.application_id)
  );

-- ═══ 9. 만료 토큰 자동 정리 (cron 권장) ═══
-- 운영 시 주기적으로 호출: SELECT cleanup_expired_tokens();
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INT AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM staff_invitation_tokens
  WHERE expires_at < now() - INTERVAL '30 days'  -- 만료 30일 후 완전 삭제
    AND used_at IS NULL;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_tokens IS '만료 30일 경과 + 미사용 토큰 정리 (cron 권장)';

-- ═══ 검증 ═══
-- SELECT validate_university_email('staff@snu.ac.kr');           -- true
-- SELECT validate_university_email('hacker@gmail.com');          -- false
-- SELECT validate_university_email('teacher@harvard.edu');       -- true

-- 토큰 발급 테스트:
-- SELECT issue_staff_invitation_token(
--   '<application_uuid>', 'staff@snu.ac.kr', '국제처담당자'
-- );
