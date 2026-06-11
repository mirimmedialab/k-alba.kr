-- ─────────────────────────────────────────────────────────
-- 2026-05-19  데이터 동기화 인프라
-- ─────────────────────────────────────────────────────────
-- · sync_logs: WorkNet / AgriWork / cleanup cron 실행 로그
-- · jobs.source_type, source_id, fetched_at: 출처 태깅
-- 적용: Supabase SQL Editor 에서 이 파일 전체 실행
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sync_logs (
  id              BIGSERIAL PRIMARY KEY,
  source          TEXT NOT NULL,              -- 'worknet' | 'agriwork' | 'agriwork-callback' | 'cleanup' | ...
  status          TEXT NOT NULL,              -- 'running' | 'success' | 'failed'
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  items_fetched   INT DEFAULT 0,
  items_new       INT DEFAULT 0,
  items_updated   INT DEFAULT 0,
  items_failed    INT DEFAULT 0,
  error           TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_source_started ON sync_logs (source, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs (status);

-- 평균 처리시간 통계 (admin/sync 대시보드용)
CREATE OR REPLACE VIEW sync_logs_summary AS
SELECT
  source,
  COUNT(*)                                                AS total_runs,
  COUNT(*) FILTER (WHERE status = 'success')              AS success_runs,
  COUNT(*) FILTER (WHERE status = 'failed')               AS failed_runs,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at)))    AS avg_duration_seconds,
  SUM(items_new)                                          AS total_items_new,
  SUM(items_updated)                                      AS total_items_updated,
  MAX(started_at)                                         AS last_run
FROM sync_logs
WHERE completed_at IS NOT NULL
GROUP BY source;

-- ─────────────────────────────────────────────────────────
-- jobs 테이블에 출처 컬럼 추가 (이미 있으면 스킵)
-- ─────────────────────────────────────────────────────────
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS source_id   TEXT,
  ADD COLUMN IF NOT EXISTS fetched_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs (source_type, source_id);

-- 같은 출처에서 같은 source_id 가 중복 들어오지 못하도록 UNIQUE (direct 는 제외)
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_source_unique
  ON jobs (source_type, source_id)
  WHERE source_type != 'direct' AND source_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────
-- RLS — sync_logs 는 admin 만 SELECT (서버에서는 service role 로 우회)
-- ─────────────────────────────────────────────────────────
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sync_logs admin read" ON sync_logs;
CREATE POLICY "sync_logs admin read"
  ON sync_logs FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata'  ->> 'role') = 'admin'
  );
