-- 고용24(work24) 외부 동기화를 위한 jobs 컬럼 추가
-- sync-worknet cron 이 수집한 외부 공고를 jobs 테이블에 정상 적재하기 위해
-- 기존 스키마에 없던 컬럼을 추가한다.
--   raw                    : 외부 소스 원본 응답 26필드 전체 보관 (JSONB)
--   expires_at             : 공고 마감일시 (cleanup-expired-jobs cron 에서 사용)
--   apply_url              : 외부 지원 링크 (워크넷 채용정보 상세 URL)
--   employer_external_name : 외부 공고 회사명 (employer_id 없는 수집 공고용)

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS raw JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS apply_url TEXT,
  ADD COLUMN IF NOT EXISTS employer_external_name TEXT;

-- (source_type, source_id) 조회/업서트 성능용 인덱스
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs (source_type, source_id);

COMMENT ON COLUMN jobs.raw IS '외부 소스(고용24 등) 원본 응답 보관 (JSONB). 매핑하지 않은 필드도 전부 포함.';
COMMENT ON COLUMN jobs.expires_at IS '공고 마감일시 (외부 소스 closeDt 등). 만료 자동정리(cleanup cron)에서 사용.';
COMMENT ON COLUMN jobs.apply_url IS '외부 지원 링크 (워크넷 채용정보 상세 URL 등).';
COMMENT ON COLUMN jobs.employer_external_name IS '외부 수집 공고 회사명 (employer_id 없는 외부 공고용).';
