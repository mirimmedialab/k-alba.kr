-- 관심공고(찜) 테이블 — 알바생이 공고를 저장
CREATE TABLE IF NOT EXISTS job_favorites (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id     BIGINT REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_job_favorites_user ON job_favorites(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_favorites_job ON job_favorites(job_id);

COMMENT ON TABLE job_favorites IS '관심공고(찜) — 알바생이 저장한 공고';

ALTER TABLE job_favorites ENABLE ROW LEVEL SECURITY;

-- 본인 것만 조회/추가/삭제
DROP POLICY IF EXISTS "job_favorites_select_own" ON job_favorites;
CREATE POLICY "job_favorites_select_own" ON job_favorites
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "job_favorites_insert_own" ON job_favorites;
CREATE POLICY "job_favorites_insert_own" ON job_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "job_favorites_delete_own" ON job_favorites;
CREATE POLICY "job_favorites_delete_own" ON job_favorites
  FOR DELETE USING (auth.uid() = user_id);
