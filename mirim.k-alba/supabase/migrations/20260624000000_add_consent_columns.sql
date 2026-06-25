-- 동의(consent) 컬럼 추가
--
-- 배경:
--   agreed_terms_at / agreed_privacy_at / agreed_marketing_at 컬럼이 과거 실DB에만
--   직접(대시보드/SQL) 추가되어, 마이그레이션·베이스라인에는 들어가 있지 않았다.
--   그 결과 baseline 으로 생성되는 develop 브랜치(테스트DB)에는 이 컬럼들이 누락되어
--   회원가입 시 "Could not find the 'agreed_marketing_at' column of 'profiles'" 오류가 발생.
--
-- 처리:
--   IF NOT EXISTS 로 idempotent 하게 추가한다.
--   - 실DB(uqgqqsescalotabaivee): 이미 존재 → 무영향(no-op)
--   - 테스트DB(develop 브랜치): 신규 추가 → 오류 해소
--
-- 흐름(CLAUDE.md 9-1): develop 에 먼저 적용(브랜치 자동 마이그레이션) → 검증 → main 머지 시 실DB 반영(no-op)

alter table public.profiles
  add column if not exists agreed_terms_at timestamptz,
  add column if not exists agreed_privacy_at timestamptz,
  add column if not exists agreed_marketing_at timestamptz;
