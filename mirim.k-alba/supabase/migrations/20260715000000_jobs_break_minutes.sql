-- 채용공고 휴게시간 (근로기준법 제54조)
-- 30 = 30분, 60 = 1시간, 0 = 없음(일 4시간 미만), null = 협의/미입력
alter table public.jobs
  add column if not exists break_minutes integer;

comment on column public.jobs.break_minutes is '휴게시간(분) — 30/60/0, null=협의';
