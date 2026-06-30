-- 가입 유입경로(acquisition) 추적용 컬럼
-- 가입 시점에만 1회 기록(첫 방문 first-touch 값). 모두 nullable → 기존 행/시드 영향 없음.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_channel   text,  -- 분류값: kakao_channel|naver|google|sns|referral|school|app|direct|etc|커스텀utm
  ADD COLUMN IF NOT EXISTS utm_source       text,
  ADD COLUMN IF NOT EXISTS utm_medium       text,
  ADD COLUMN IF NOT EXISTS utm_campaign     text,
  ADD COLUMN IF NOT EXISTS signup_referrer  text,  -- document.referrer
  ADD COLUMN IF NOT EXISTS landing_path     text,  -- 최초 도착 경로
  ADD COLUMN IF NOT EXISTS signup_platform  text,  -- app|web
  ADD COLUMN IF NOT EXISTS ref_code         text;  -- ?ref= (지인추천/학교 코드)

CREATE INDEX IF NOT EXISTS idx_profiles_signup_channel ON public.profiles (signup_channel);
