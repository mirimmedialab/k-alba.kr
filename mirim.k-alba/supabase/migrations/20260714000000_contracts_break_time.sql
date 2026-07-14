-- 휴게시간 의무 배정 (근로기준법 제54조)
-- 일 4시간 이상 근무 계약: 서명 전 휴게시간을 확정하고 근로자·사장님 양측 확인
alter table public.contracts
  add column if not exists break_start text,
  add column if not exists break_minutes integer,
  add column if not exists worker_break_ok boolean not null default false,
  add column if not exists employer_break_ok boolean not null default false;

comment on column public.contracts.break_start is '휴게 시작 시간 (HH:MM)';
comment on column public.contracts.break_minutes is '휴게시간 (분) — 4h이상 30분, 8h이상 60분';
comment on column public.contracts.worker_break_ok is '근로자 휴게시간 확인 여부';
comment on column public.contracts.employer_break_ok is '사장님 휴게시간 확인 여부';
