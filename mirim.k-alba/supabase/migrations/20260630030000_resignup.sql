-- #1 탈퇴 후 재가입(정책 A: 재활성화) 지원 컬럼
--   reactivated_at   : 마지막 재활성화 시각 (관리자 확인용)
--   resignup_count   : 재가입 횟수 (0=최초가입, 1+=재가입자 → 관리자 표시)
--   data_reset_at    : 이 시각 이후 데이터만 사용자에게 노출(이전 데이터는 DB 보관하되 숨김)
-- 정책: 사용자에겐 "새 계정(이전 데이터 삭제)"으로 보이게 하고, 데이터 보관 사실은 노출하지 않는다.
--       기존 지원내역/찜/계약서 등은 삭제하지 않고 data_reset_at 경계로 화면에서만 숨긴다.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reactivated_at  timestamptz,
  ADD COLUMN IF NOT EXISTS resignup_count  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_reset_at   timestamptz;
