-- 신규 공고 알림 메일 dedup 컬럼
--
-- 배경:
--   사장님이 공고를 등록하면 (1) 동의한 알바생에게 신규공고 알림 메일(광고성),
--   (2) 사장님에게 "공유 완료" 서비스 메일(트랜잭셔널)을 실시간 발송한다.
--   재요청·재배포·야간 등록분 아침 크론 재시도 등으로 같은 공고가 두 번 발송되지
--   않도록, "이 공고 알림을 이미 보냈다"는 시점을 기록한다.
--
-- 처리:
--   IF NOT EXISTS 로 idempotent 하게 추가.
--   - NULL  = 아직 알림 미발송 (크론이 집어감)
--   - 시각  = 발송 완료(또는 발송 시도로 claim) → 재발송 안 함
--
-- 흐름(CLAUDE.md 9-1): develop 에 먼저 적용 → 검증 → main 머지 시 실DB 반영.

alter table public.jobs
  add column if not exists email_notified_at timestamptz;

-- 크론이 "미발송 + 최근 등록 + 활성" 공고를 빠르게 찾도록 부분 인덱스
create index if not exists idx_jobs_email_unnotified
  on public.jobs (created_at)
  where email_notified_at is null;
