-- ─────────────────────────────────────────────
-- profiles.preferred_lang 컬럼 추가
-- ─────────────────────────────────────────────
-- 사용자의 선호 언어를 저장하여 다른 기기에서도 자동 적용.
-- LanguageSwitcher에서 변경 시 자동 동기화.
--
-- 지원 언어: ko, en, zh, vi, uz, mn, ja
-- ─────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_lang TEXT DEFAULT 'ko'
  CHECK (preferred_lang IN ('ko', 'en', 'zh', 'vi', 'uz', 'mn', 'ja'));

-- 인덱스 (대시보드에서 언어별 통계 집계 시 사용)
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_lang 
  ON profiles (preferred_lang);

-- ─────────────────────────────────────────────
-- 기본값 채우기 (기존 사용자)
-- ─────────────────────────────────────────────

-- 기존 사용자 중 비자가 외국인인 경우 영어 기본값
-- (실제 운영에서는 가입 시점에 user 본인 입력값 우선)
UPDATE profiles
SET preferred_lang = 'en'
WHERE preferred_lang IS NULL
  AND visa IS NOT NULL
  AND visa NOT IN ('K', 'KR'); -- 한국인은 ko

UPDATE profiles
SET preferred_lang = 'ko'
WHERE preferred_lang IS NULL;

-- ─────────────────────────────────────────────
-- 통계 view (관리자 대시보드용)
-- ─────────────────────────────────────────────

CREATE OR REPLACE VIEW user_language_stats AS
SELECT 
  preferred_lang,
  COUNT(*) as user_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_this_week,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage
FROM profiles
WHERE preferred_lang IS NOT NULL
GROUP BY preferred_lang
ORDER BY user_count DESC;

-- 사용 예: SELECT * FROM user_language_stats;
--   preferred_lang | user_count | new_this_week | percentage
--   ─────────────────────────────────────────────────────────
--   ko             |        850 |            12 |       62.0
--   en             |        180 |             5 |       13.1
--   zh             |        120 |             3 |        8.8
--   vi             |         95 |             2 |        6.9
--   uz             |         55 |             1 |        4.0
--   mn             |         45 |             1 |        3.3
--   ja             |         25 |             0 |        1.8
