-- ════════════════════════════════════════════════════════════
-- K-ALBA 푸시 알림 시스템 마이그레이션
-- 실행일: 2026-04-24
-- 순서: migration-recommendations.sql 이후 실행
-- ════════════════════════════════════════════════════════════
--
-- 포함 내용:
--   1. push_tokens 테이블 (사용자별 FCM/APNs 토큰)
--   2. notifications 테이블 (발송 로그)
--   3. notification_preferences 테이블 (수신 설정)
--   4. 새 공고 발송 대상자 조회 함수

-- ═══ 1. push_tokens 테이블 ═══
CREATE TABLE IF NOT EXISTS push_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  platform    TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(active) WHERE active = true;

-- RLS: 사용자는 자기 토큰만 관리
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_manages_own_tokens" ON push_tokens;
CREATE POLICY "user_manages_own_tokens" ON push_tokens
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ═══ 2. notifications 테이블 (발송 로그) ═══
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,       -- "new_nearby_job" | "application_accepted" | "chat_message" | "contract_request"
  title        TEXT NOT NULL,
  body         TEXT,
  data         JSONB DEFAULT '{}',  -- { job_id, distance_km, ... } (앱 딥링크용)
  read         BOOLEAN DEFAULT false,
  sent         BOOLEAN DEFAULT false,
  sent_at      TIMESTAMPTZ,
  error        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unsent ON notifications(created_at) WHERE sent = false;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_reads_own_notifications" ON notifications;
CREATE POLICY "user_reads_own_notifications" ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_updates_own_read_status" ON notifications;
CREATE POLICY "user_updates_own_read_status" ON notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ═══ 3. notification_preferences 테이블 ═══
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nearby_jobs          BOOLEAN DEFAULT true,
  application_updates  BOOLEAN DEFAULT true,
  chat_messages        BOOLEAN DEFAULT true,
  contract_requests    BOOLEAN DEFAULT true,
  quiet_hours_start    TIME DEFAULT '22:00',
  quiet_hours_end      TIME DEFAULT '08:00',
  updated_at           TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_manages_own_prefs" ON notification_preferences;
CREATE POLICY "user_manages_own_prefs" ON notification_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ═══ 4. 근처 새 공고 알림 대상자 조회 ═══
-- 새 공고가 등록되면 이 함수로 반경 내 구독자를 찾음
-- 이후 Next.js API에서 FCM 발송

CREATE OR REPLACE FUNCTION find_users_to_notify_for_job(job_id BIGINT)
RETURNS TABLE (
  user_id       UUID,
  token         TEXT,
  platform      TEXT,
  distance_km   NUMERIC,
  search_radius_km INTEGER,
  name          TEXT
) AS $$
  SELECT
    p.id AS user_id,
    pt.token,
    pt.platform,
    ROUND(
      (ST_Distance(
        p.home_geog,
        (SELECT geog FROM jobs WHERE id = job_id)
      ) / 1000)::NUMERIC, 2
    ) AS distance_km,
    p.search_radius_km,
    p.name
  FROM profiles p
  JOIN push_tokens pt ON pt.user_id = p.id AND pt.active = true
  LEFT JOIN notification_preferences np ON np.user_id = p.id
  WHERE
    p.home_geog IS NOT NULL
    AND p.location_opted_in = true
    AND COALESCE(np.nearby_jobs, true) = true
    AND ST_DWithin(
      p.home_geog,
      (SELECT geog FROM jobs WHERE id = job_id),
      COALESCE(p.search_radius_km, 10) * 1000
    )
    AND EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = job_id
        AND (
          -- 비자 필터: 사용자 비자가 공고의 visa_types에 있거나, 공고가 특정 비자 요구 안 함
          p.visa IS NULL
          OR j.visa_types IS NULL
          OR p.visa = ANY(j.visa_types)
        )
    );
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION find_users_to_notify_for_job IS '새 공고 등록 시 푸시 알림 대상자 리스트';

-- ═══ 5. 검증 ═══
-- SELECT * FROM find_users_to_notify_for_job('<some-job-id>');
