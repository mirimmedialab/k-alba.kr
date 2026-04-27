-- ════════════════════════════════════════════════════════════
-- K-ALBA 접근성 점수 기반 추천 엔진
-- 실행일: 2026-04-24
-- 순서: migration-geolocation.sql 이후 실행
-- ════════════════════════════════════════════════════════════
--
-- 접근성 점수 공식 (0~100점):
--   거리 점수    × 40% (거리 가까울수록 높음, 반경 내 기준)
--   교통 점수    × 20% (역 거리, 숙식 제공 여부)
--   비자 일치    × 20% (내 비자가 공고의 visa_types에 있으면 풀점)
--   한국어 일치  × 10% (내 수준이 공고 요구 이상이면 풀점)
--   숙식 가중치  × 10% (E-9/E-8 비자는 가중치 ↑)
--
-- 사용 예:
--   SELECT * FROM jobs_recommended(
--     user_lat := 37.5326,
--     user_lng := 127.0246,
--     user_visa := 'D-2',
--     user_korean_level := 'intermediate',
--     radius_km := 20
--   );

CREATE OR REPLACE FUNCTION jobs_recommended(
  user_lat            DOUBLE PRECISION,
  user_lng            DOUBLE PRECISION,
  user_visa           TEXT DEFAULT NULL,
  user_korean_level   TEXT DEFAULT NULL,
  user_transport      TEXT[] DEFAULT ARRAY['transit','walk'],
  radius_km           DOUBLE PRECISION DEFAULT 20,
  limit_count         INT DEFAULT 30
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
  korean_level       TEXT,
  latitude           DOUBLE PRECISION,
  longitude          DOUBLE PRECISION,
  distance_m         DOUBLE PRECISION,
  distance_km        NUMERIC,
  provides_housing   BOOLEAN,
  provides_shuttle   BOOLEAN,
  nearest_station    TEXT,
  walk_to_station_min INTEGER,
  transit_info       JSONB,
  created_at         TIMESTAMPTZ,
  score_distance     NUMERIC,
  score_transit      NUMERIC,
  score_visa         NUMERIC,
  score_korean       NUMERIC,
  score_housing      NUMERIC,
  score_total        NUMERIC,
  reason             TEXT
) AS $$
WITH base AS (
  SELECT
    j.*,
    p.company_name AS employer_company,
    ST_Distance(
      j.geog,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) AS distance_meters
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
),
scored AS (
  SELECT
    b.*,
    CASE
      WHEN b.distance_meters <= 1000 THEN 40
      WHEN b.distance_meters >= radius_km * 1000 THEN 0
      ELSE 40 * (1 - (b.distance_meters - 1000) / (radius_km * 1000 - 1000))
    END::NUMERIC AS score_distance_val,

    CASE
      WHEN b.provides_shuttle THEN 20
      WHEN b.walk_to_station_min IS NOT NULL AND b.walk_to_station_min <= 5 THEN 18
      WHEN b.walk_to_station_min IS NOT NULL AND b.walk_to_station_min <= 10 THEN 12
      WHEN b.walk_to_station_min IS NOT NULL AND b.walk_to_station_min <= 15 THEN 8
      ELSE GREATEST(0, 10 - (b.distance_meters / 2000))
    END::NUMERIC AS score_transit_val,

    CASE
      WHEN user_visa IS NULL THEN 10
      WHEN user_visa = ANY(b.visa_types) THEN 20
      ELSE 0
    END::NUMERIC AS score_visa_val,

    CASE
      WHEN user_korean_level IS NULL THEN 5
      WHEN b.korean_level IS NULL OR b.korean_level = '' THEN 10
      WHEN user_korean_level = 'advanced' THEN 10
      WHEN user_korean_level = 'intermediate' AND b.korean_level IN ('beginner', 'intermediate', 'none') THEN 10
      WHEN user_korean_level = 'beginner' AND b.korean_level IN ('beginner', 'none') THEN 10
      WHEN user_korean_level = 'none' AND b.korean_level = 'none' THEN 10
      ELSE 0
    END::NUMERIC AS score_korean_val,

    CASE
      WHEN b.provides_housing AND user_visa IN ('E-9','E-8','H-2') THEN 10
      WHEN b.provides_housing THEN 5
      ELSE 0
    END::NUMERIC AS score_housing_val

  FROM base b
)
SELECT
  s.id,
  s.title,
  s.employer_company AS company_name,
  s.address,
  s.sigungu,
  s.job_type,
  s.pay_type,
  s.pay_amount,
  s.visa_types,
  s.korean_level,
  s.latitude,
  s.longitude,
  s.distance_meters AS distance_m,
  ROUND((s.distance_meters / 1000)::NUMERIC, 2) AS distance_km,
  s.provides_housing,
  s.provides_shuttle,
  s.nearest_station,
  s.walk_to_station_min,
  s.transit_info,
  s.created_at,
  ROUND(s.score_distance_val, 1) AS score_distance,
  ROUND(s.score_transit_val, 1)  AS score_transit,
  ROUND(s.score_visa_val, 1)     AS score_visa,
  ROUND(s.score_korean_val, 1)   AS score_korean,
  ROUND(s.score_housing_val, 1)  AS score_housing,
  ROUND(
    s.score_distance_val + s.score_transit_val +
    s.score_visa_val + s.score_korean_val + s.score_housing_val,
    1
  ) AS score_total,
  TRIM(CONCAT_WS(' · ',
    CASE WHEN s.distance_meters <= 2000 THEN '🏠 집에서 가까움' END,
    CASE WHEN s.provides_housing AND user_visa IN ('E-9','E-8','H-2') THEN '🛏️ 숙식 제공' END,
    CASE WHEN s.provides_shuttle THEN '🚐 통근버스' END,
    CASE WHEN user_visa = ANY(s.visa_types) THEN '✓ 내 비자 가능' END,
    CASE WHEN s.walk_to_station_min IS NOT NULL AND s.walk_to_station_min <= 5 THEN '🚇 역 도보 5분' END
  )) AS reason
FROM scored s
ORDER BY
  (s.score_distance_val + s.score_transit_val +
   s.score_visa_val + s.score_korean_val + s.score_housing_val) DESC,
  s.distance_meters ASC
LIMIT limit_count;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION jobs_recommended IS '접근성 점수 기반 공고 추천 (거리+교통+비자+한국어+숙식 가중 합산)';

-- ═══════════════════════════════════════════════
-- 검증 쿼리
-- ═══════════════════════════════════════════════
-- SELECT id, title, score_total, reason
-- FROM jobs_recommended(37.4979, 127.0276, 'D-2', 'beginner')
-- LIMIT 10;
