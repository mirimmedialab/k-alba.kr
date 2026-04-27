-- ════════════════════════════════════════════════════════════
-- K-ALBA B2B 이메일 아웃리치 시스템 마이그레이션
-- 실행일: 2026-04-24
-- 순서: migration-push-notifications.sql 이후 실행
-- ════════════════════════════════════════════════════════════
--
-- 대상: AgriWork/WorkNet에서 발굴한 사업자 이메일 주소
-- 목적: K-ALBA 서비스 소개 + 외국인 알바 공고 등록 유도
--
-- 🚨 정보통신망법 제50조 준수 필수:
--   1. 수신자의 사전 동의 없이 영리 목적 광고 발송 금지
--   2. 단, "거래관계" 있는 경우 또는 "공개된 연락처"(구인공고에 공개된 사업자 이메일)는 예외
--   3. 제목에 "(광고)" 명시 필수
--   4. 수신자 정보와 거부 방법(링크) 포함 필수
--   5. 수신거부 처리는 24시간 내
--
-- 설계:
--   - email_contacts:  수집한 이메일 + 출처 + 수신동의 상태
--   - email_campaigns: 발송 캠페인 (템플릿, 필터, 발송 로그)
--   - email_sends:     개별 발송 로그 (개봉/클릭 추적)
--   - email_unsubscribes: 수신거부 이력

-- ═══ 1. email_contacts 테이블 ═══
CREATE TABLE IF NOT EXISTS email_contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  company_name    TEXT,
  contact_name    TEXT,
  phone           TEXT,
  job_type        TEXT,                    -- 업종 (농업, 제조업, 서비스업 등)
  sigungu         TEXT,                    -- 지역
  source          TEXT NOT NULL,           -- 'worknet' | 'agriwork' | 'manual' | 'referral'
  source_url      TEXT,                    -- 출처 링크 (법적 근거)
  source_job_id   TEXT,                    -- 원본 공고 ID
  first_contact_at TIMESTAMPTZ,
  last_contact_at  TIMESTAMPTZ,
  consent_status  TEXT DEFAULT 'public' CHECK (consent_status IN (
    'public',       -- 공고에 공개된 이메일 (법적 예외 적용)
    'opted_in',     -- 명시적 수신동의 (링크 클릭 or 가입)
    'opted_out',    -- 수신거부 (재발송 금지)
    'bounced',      -- 이메일 전송 실패 (발송 금지)
    'complained'    -- 스팸 신고 (즉시 발송 금지)
  )),
  opted_in_at     TIMESTAMPTZ,
  opted_out_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_contacts_consent ON email_contacts(consent_status);
CREATE INDEX IF NOT EXISTS idx_email_contacts_source ON email_contacts(source);
CREATE INDEX IF NOT EXISTS idx_email_contacts_sigungu ON email_contacts(sigungu);

-- ═══ 2. email_campaigns 테이블 ═══
CREATE TABLE IF NOT EXISTS email_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,           -- 내부 캠페인 이름
  subject         TEXT NOT NULL,           -- 제목 (자동으로 "(광고)" 접두어 추가)
  body_html       TEXT NOT NULL,           -- HTML 본문 (unsubscribe 링크 필수)
  body_text       TEXT,                    -- 텍스트 본문 (fallback)
  from_name       TEXT DEFAULT 'K-ALBA',
  from_email      TEXT DEFAULT 'hello@k-alba.kr',
  reply_to        TEXT DEFAULT 'hello@k-alba.kr',

  -- 필터 (누구에게 보낼지)
  filter_source    TEXT[],                 -- ['worknet', 'agriwork']
  filter_job_type  TEXT[],                 -- ['농업', '제조업']
  filter_sigungu   TEXT[],                 -- ['강남구', '논산시']
  filter_consent   TEXT[] DEFAULT ARRAY['public', 'opted_in'],

  -- 상태
  status          TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'scheduled', 'sending', 'sent', 'cancelled'
  )),
  scheduled_at    TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,

  -- 통계
  total_targets   INTEGER DEFAULT 0,
  sent_count      INTEGER DEFAULT 0,
  opened_count    INTEGER DEFAULT 0,
  clicked_count   INTEGER DEFAULT 0,
  bounced_count   INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0,

  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══ 3. email_sends 테이블 ═══
CREATE TABLE IF NOT EXISTS email_sends (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES email_contacts(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,

  -- 고유 트래킹 토큰 (open pixel + unsubscribe link)
  tracking_token  UUID DEFAULT gen_random_uuid() UNIQUE,

  status          TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'bounced', 'failed', 'spam'
  )),
  error_message   TEXT,
  sent_at         TIMESTAMPTZ,
  opened_at       TIMESTAMPTZ,
  clicked_at      TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_sends_campaign ON email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_token ON email_sends(tracking_token);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends(status);

-- ═══ 4. email_unsubscribes 테이블 (법적 로그) ═══
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL,
  tracking_token  UUID,
  reason          TEXT,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_email ON email_unsubscribes(email);

-- ═══ 5. 수신거부 자동 처리 트리거 ═══
CREATE OR REPLACE FUNCTION handle_unsubscribe()
RETURNS TRIGGER AS $$
BEGIN
  -- email_contacts 상태 업데이트
  UPDATE email_contacts
  SET consent_status = 'opted_out',
      opted_out_at = now(),
      updated_at = now()
  WHERE email = NEW.email;

  -- 관련 email_sends 업데이트
  IF NEW.tracking_token IS NOT NULL THEN
    UPDATE email_sends
    SET unsubscribed_at = now()
    WHERE tracking_token = NEW.tracking_token;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_handle_unsubscribe ON email_unsubscribes;
CREATE TRIGGER trg_handle_unsubscribe
  AFTER INSERT ON email_unsubscribes
  FOR EACH ROW EXECUTE FUNCTION handle_unsubscribe();

-- ═══ 6. 캠페인 대상자 조회 함수 ═══
CREATE OR REPLACE FUNCTION campaign_targets(campaign_id UUID)
RETURNS TABLE (
  contact_id   UUID,
  email        TEXT,
  company_name TEXT,
  contact_name TEXT
) AS $$
  SELECT
    ec.id,
    ec.email,
    ec.company_name,
    ec.contact_name
  FROM email_contacts ec
  JOIN email_campaigns cp ON cp.id = campaign_targets.campaign_id
  WHERE
    ec.consent_status = ANY(cp.filter_consent)
    -- opted_out, bounced, complained는 항상 제외
    AND ec.consent_status NOT IN ('opted_out', 'bounced', 'complained')
    -- 출처 필터
    AND (
      cp.filter_source IS NULL OR array_length(cp.filter_source, 1) IS NULL
      OR ec.source = ANY(cp.filter_source)
    )
    -- 업종 필터
    AND (
      cp.filter_job_type IS NULL OR array_length(cp.filter_job_type, 1) IS NULL
      OR ec.job_type = ANY(cp.filter_job_type)
    )
    -- 지역 필터
    AND (
      cp.filter_sigungu IS NULL OR array_length(cp.filter_sigungu, 1) IS NULL
      OR ec.sigungu = ANY(cp.filter_sigungu)
    );
$$ LANGUAGE SQL STABLE;

-- ═══ 7. 관리자 RLS ═══
-- email_contacts, email_campaigns, email_sends는 RLS 활성화 후
-- 서비스 롤만 접근 가능 (관리자만 API 경유)
ALTER TABLE email_contacts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns  ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends      ENABLE ROW LEVEL SECURITY;

-- 기본적으로 모두 차단 (service_role만 접근)
-- API 라우트에서 SERVICE_ROLE_KEY로 bypass
