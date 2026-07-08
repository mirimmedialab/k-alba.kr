-- 공고 연락처 컬럼 추가
--
-- 배경: 지원자(알바생)가 사장님에게 직접 연락할 수 있도록, 공고에 연락 수단을 저장한다.
--   실제 '지원하기' 기능이 아직 없어, 알바생이 지원 버튼을 누르면 이 연락처를 팝업으로 보여준다.
--   등록 시 3개 중 최소 1개는 필수(폼/챗봇에서 검증).
--
-- 기존: 카카오 챗봇은 jobs.raw.contact_phone(JSON)에만 저장했음. 이제 전용 컬럼으로 구조화.
--
-- 흐름(CLAUDE.md 9-1): develop 먼저 적용 → 검증 → main 머지 시 실DB 반영.

alter table public.jobs
  add column if not exists contact_phone  text,  -- 전화번호(유선)
  add column if not exists contact_mobile text,  -- 휴대번호
  add column if not exists contact_email  text;  -- 이메일
