-- ⚠️ 프론트 신버전(위치 필드 profile_private 전환) 배포 확인 후에 실행하세요.
-- 실행 전 체크: profiles_sensitive_write_log가 하루 이상 깨끗하고, 배포 번들에 PRIVATE_FIELDS 확장이 포함됐는지.
-- Claude에게 "정리 마이그레이션 실행해줘"라고 요청하면 검증 후 적용해 드립니다.

-- 1) profiles의 정밀 위치·주소 값 제거 (profile_private에 사본 확인된 값만)
UPDATE public.profiles s SET
  home_latitude       = CASE WHEN p.home_latitude       IS NOT NULL THEN NULL ELSE s.home_latitude END,
  home_longitude      = CASE WHEN p.home_longitude      IS NOT NULL THEN NULL ELSE s.home_longitude END,
  home_geog           = CASE WHEN p.home_geog           IS NOT NULL THEN NULL ELSE s.home_geog END,
  home_address_road   = CASE WHEN p.home_address_road   IS NOT NULL THEN NULL ELSE s.home_address_road END,
  home_address_detail = CASE WHEN p.home_address_detail IS NOT NULL THEN NULL ELSE s.home_address_detail END,
  address_korea       = CASE WHEN p.address_korea       IS NOT NULL THEN NULL ELSE s.address_korea END,
  address_korea_phone = CASE WHEN p.address_korea_phone IS NOT NULL THEN NULL ELSE s.address_korea_phone END,
  address_home_country= CASE WHEN p.address_home_country IS NOT NULL THEN NULL ELSE s.address_home_country END,
  address_home_phone  = CASE WHEN p.address_home_phone  IS NOT NULL THEN NULL ELSE s.address_home_phone END
FROM public.profile_private p
WHERE p.id = s.id;

-- 2) (선택) 민감 6종 + 위치 컬럼 최종 drop — 모든 앱(웹/안드로이드) 전환 확인 후
-- ALTER TABLE public.profiles
--   DROP COLUMN alien_reg_number, DROP COLUMN passport_number,
--   DROP COLUMN passport_issue_date, DROP COLUMN passport_expiry_date,
--   DROP COLUMN birth_date, DROP COLUMN bank_account_for_refund,
--   DROP COLUMN home_latitude, DROP COLUMN home_longitude, DROP COLUMN home_geog,
--   DROP COLUMN home_address_road, DROP COLUMN home_address_detail,
--   DROP COLUMN address_korea, DROP COLUMN address_korea_phone,
--   DROP COLUMN address_home_country, DROP COLUMN address_home_phone;
-- DROP TRIGGER IF EXISTS trg_profiles_sensitive_guard ON public.profiles;
-- DROP TRIGGER IF EXISTS trg_profiles_home_geog ON public.profiles;
