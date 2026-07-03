-- #2 RLS 오류 해결:
-- 가입 시 profiles를 트리거(SECURITY DEFINER, RLS 우회)에서 전부 채운다.
-- → 클라이언트의 profiles.upsert(RLS INSERT 정책에 막혀 "new row violates row-level security policy" 유발)를 제거하기 위함.
-- 기존 트리거는 id/email/name/user_type만 복사했으나, visa·약관동의·유입경로(attribution)까지 user_metadata에서 복사하도록 확장.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  md jsonb := NEW.raw_user_meta_data;
BEGIN
  BEGIN
    INSERT INTO public.profiles (
      id, email, name, user_type, visa,
      agreed_terms_at, agreed_privacy_at, agreed_marketing_at,
      signup_channel, utm_source, utm_medium, utm_campaign,
      signup_referrer, landing_path, signup_platform, ref_code
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(md->>'name', md->>'full_name', split_part(COALESCE(NEW.email, 'user@unknown.com'), '@', 1)),
      COALESCE(md->>'user_type', 'worker'),
      NULLIF(md->>'visa', ''),
      NULLIF(md->>'agreed_terms_at', '')::timestamptz,
      NULLIF(md->>'agreed_privacy_at', '')::timestamptz,
      NULLIF(md->>'agreed_marketing_at', '')::timestamptz,
      NULLIF(md->>'signup_channel', ''),
      NULLIF(md->>'utm_source', ''),
      NULLIF(md->>'utm_medium', ''),
      NULLIF(md->>'utm_campaign', ''),
      NULLIF(md->>'signup_referrer', ''),
      NULLIF(md->>'landing_path', ''),
      NULLIF(md->>'signup_platform', ''),
      NULLIF(md->>'ref_code', '')
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- profiles INSERT 실패해도 auth.users INSERT는 성공시킨다(가입 자체는 진행).
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$function$;
