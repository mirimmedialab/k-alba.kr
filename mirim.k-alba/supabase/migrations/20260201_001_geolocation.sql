-- ════════════════════════════════════════════════════════════
-- K-ALBA 위치 기반 서비스 마이그레이션
-- 실행일: 2026-04-24 작성
-- 실행 위치: Supabase Dashboard > SQL Editor
-- ════════════════════════════════════════════════════════════
--
-- 이 마이그레이션은 3단계로 나뉨:
--   STEP 1: PostGIS 확장 활성화
--   STEP 2: jobs 테이블 위치 필드 추가
--   STEP 3: profiles 테이블 거주지 필드 추가
--   STEP 4: 거리 기반 공고 조회 RPC 함수
--
-- ⚠️ 실행 전 반드시 Supabase > Database > Backups > Create Backup
-- ⚠️ 기존 레코드는 latitude/longitude가 NULL인 상태로 남음
--    → 별도 스크립트로 백필(backfill) 필요

-- ════════════════════════════════════════════════════════════
-- STEP 1: PostGIS 확장 활성화
-- ════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS postgis;

-- ════════════════════════════════════════════════════════════
-- STEP 1.5: 선행 마이그레이션 확인 (visa_types는 TEXT[] 이어야 함)
-- ════════════════════════════════════════════════════════════
DO $$
DECLARE
  visa_col_type TEXT;
BEGIN
  SELECT data_type INTO visa_col_type
  FROM information_schema.columns
  WHERE table_name = 'jobs' AND column_name = 'visa_types';

  IF visa_col_type = 'text' THEN
    RAISE EXCEPTION '⚠️ migration-visa-types.sql을 먼저 실행해 주세요. visa_types가 아직 TEXT입니다.';
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════
-- STEP 2: jobs 테이블 위치 필드 추가
-- ════════════════════════════════════════════════════════════
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS latitude          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude         DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geog              GEOGRAPHY(POINT, 4326),
  ADD COLUMN IF NOT EXISTS address_road      TEXT,
  ADD COLUMN IF NOT EXISTS address_jibun     TEXT,
  ADD COLUMN IF NOT EXISTS sido              TEXT,
  ADD COLUMN IF NOT EXISTS sigungu           TEXT,
  ADD COLUMN IF NOT EXISTS dong              TEXT,
  ADD COLUMN IF NOT EXISTS transit_info      JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS provides_housing  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS provides_shuttle  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS nearest_station   TEXT,
  ADD COLUMN IF NOT EXISTS walk_to_station_min INTEGER;

COMMENT ON COLUMN jobs.geog IS 'PostGIS geography point from latitude/longitude (auto-updated by trigger)';
COMMENT ON COLUMN jobs.transit_info IS 'JSONB: { subway: [...], bus: [...], last_subway, last_bus, shuttle_schedule, parking }';
COMMENT ON COLUMN jobs.provides_housing IS '숙식 제공 (E-9/E-8 비자 매칭 가중치)';
COMMENT ON COLUMN jobs.provides_shuttle IS '통근버스 제공';

-- geog 컬럼은 latitude/longitude에서 자동 생성
CREATE OR REPLACE FUNCTION update_job_geog()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geog = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.geog = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jobs_geog ON jobs;
CREATE TRIGGER trg_jobs_geog
  BEFORE INSERT OR UPDATE OF latitude, longitude ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_job_geog();

-- 공간 인덱스 (거리 쿼리 성능 핵심)
CREATE INDEX IF NOT EXISTS idx_jobs_geog      ON jobs USING GIST(geog);
CREATE INDEX IF NOT EXISTS idx_jobs_sigungu   ON jobs(sigungu);
CREATE INDEX IF NOT EXISTS idx_jobs_sido      ON jobs(sido);

-- ════════════════════════════════════════════════════════════
-- STEP 3: profiles 테이블 거주지 필드 추가
-- ════════════════════════════════════════════════════════════
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS home_latitude     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS home_longitude    DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS home_geog         GEOGRAPHY(POINT, 4326),
  ADD COLUMN IF NOT EXISTS home_address_road TEXT,
  ADD COLUMN IF NOT EXISTS home_sido         TEXT,
  ADD COLUMN IF NOT EXISTS home_sigungu      TEXT,
  ADD COLUMN IF NOT EXISTS home_dong         TEXT,
  ADD COLUMN IF NOT EXISTS search_radius_km  INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS transport_modes   TEXT[] DEFAULT ARRAY['transit','walk'],
  ADD COLUMN IF NOT EXISTS max_commute_min   INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS location_opted_in BOOLEAN DEFAULT false;

COMMENT ON COLUMN profiles.search_radius_km IS '구직자 선호 반경 (기본 10km)';
COMMENT ON COLUMN profiles.transport_modes IS '이동 가능 수단 배열: transit(대중교통), walk(도보), bike(자전거), car(차)';
COMMENT ON COLUMN profiles.max_commute_min IS '최대 허용 통근 시간 (분)';
COMMENT ON COLUMN profiles.location_opted_in IS '위치 기반 서비스 사용 동의 여부';

CREATE OR REPLACE FUNCTION update_profile_home_geog()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.home_latitude IS NOT NULL AND NEW.home_longitude IS NOT NULL THEN
    NEW.home_geog = ST_SetSRID(ST_MakePoint(NEW.home_longitude, NEW.home_latitude), 4326)::geography;
  ELSE
    NEW.home_geog = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_home_geog ON profiles;
CREATE TRIGGER trg_profiles_home_geog
  BEFORE INSERT OR UPDATE OF home_latitude, home_longitude ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_profile_home_geog();

CREATE INDEX IF NOT EXISTS idx_profiles_home_geog ON profiles USING GIST(home_geog);

-- ════════════════════════════════════════════════════════════
-- STEP 4: 거리 기반 공고 조회 RPC 함수
-- ════════════════════════════════════════════════════════════
-- 사용법 (클라이언트):
--   const { data, error } = await supabase.rpc('jobs_nearby', {
--     user_lat: 37.5326,
--     user_lng: 127.0246,
--     radius_km: 5,
--     visa_filter: ['D-2', 'F-2'],
--     limit_count: 30
--   });
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION jobs_nearby(
  user_lat       DOUBLE PRECISION,
  user_lng       DOUBLE PRECISION,
  radius_km      DOUBLE PRECISION DEFAULT 10,
  visa_filter    TEXT[] DEFAULT NULL,
  limit_count    INT DEFAULT 50
)
RETURNS TABLE (
  id                 BIGINT,
  title              TEXT,
  company_name       TEXT,
  address            TEXT,
  sigungu            TEXT,
  job_type           TEXT,
  pay_type           TEXT,
  pay_amount         INT,
  visa_types         TEXT[],
  latitude           DOUBLE PRECISION,
  longitude          DOUBLE PRECISION,
  distance_m         DOUBLE PRECISION,
  distance_km        NUMERIC,
  provides_housing   BOOLEAN,
  provides_shuttle   BOOLEAN,
  nearest_station    TEXT,
  walk_to_station_min INTEGER,
  transit_info       JSONB,
  created_at         TIMESTAMPTZ
) AS $$
  SELECT
    j.id,
    j.title,
    p.company_name,          -- profiles에서 join
    j.address,
    j.sigungu,
    j.job_type,
    j.pay_type,
    j.pay_amount,
    -- visa_types는 migration-visa-types.sql 에서 TEXT[]로 변환됨
    j.visa_types,
    j.latitude,
    j.longitude,
    ST_Distance(
      j.geog,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) AS distance_m,
    ROUND(
      (ST_Distance(
        j.geog,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
      ) / 1000)::numeric,
      2
    ) AS distance_km,
    j.provides_housing,
    j.provides_shuttle,
    j.nearest_station,
    j.walk_to_station_min,
    j.transit_info,
    j.created_at
  FROM jobs j
  LEFT JOIN profiles p ON p.id = j.employer_id
  WHERE
    j.geog IS NOT NULL
    AND j.status = 'active'
    AND ST_DWithin(
      j.geog,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
    AND (visa_filter IS NULL OR j.visa_types && visa_filter)
  ORDER BY
    j.geog <-> ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
  LIMIT limit_count;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION jobs_nearby IS '사용자 좌표 기준 반경 내 공고를 가까운 순으로 반환';

-- ════════════════════════════════════════════════════════════
-- STEP 5: 시군구 단위 공고 통계 (사장님 대시보드용)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION jobs_stats_by_region(region_sigungu TEXT)
RETURNS TABLE (
  total_active     BIGINT,
  avg_pay_hourly   NUMERIC,
  top_job_types    TEXT[]
) AS $$
  SELECT
    COUNT(*) FILTER (WHERE status = 'active')          AS total_active,
    ROUND(AVG(pay_amount) FILTER (WHERE pay_type = '시급'), 0) AS avg_pay_hourly,
    ARRAY(
      SELECT job_type FROM jobs
      WHERE sigungu = region_sigungu AND status = 'active'
      GROUP BY job_type
      ORDER BY COUNT(*) DESC
      LIMIT 3
    ) AS top_job_types
  FROM jobs
  WHERE sigungu = region_sigungu;
$$ LANGUAGE SQL STABLE;

-- ════════════════════════════════════════════════════════════
-- 검증 쿼리 (실행 후 확인용)
-- ════════════════════════════════════════════════════════════
-- 1. 확장 활성화 확인
-- SELECT postgis_version();
--
-- 2. 컬럼 추가 확인
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'jobs' AND column_name IN ('latitude','longitude','geog','sigungu');
--
-- 3. 인덱스 확인
-- SELECT indexname FROM pg_indexes WHERE tablename = 'jobs' AND indexname LIKE 'idx_%geog%';
--
-- 4. 테스트 좌표로 RPC 호출 (강남역 기준)
-- SELECT * FROM jobs_nearby(37.4979, 127.0276, 5, NULL, 10);
