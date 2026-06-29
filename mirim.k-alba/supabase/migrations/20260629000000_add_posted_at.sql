-- 공고 실제 등록일시(posted_at) 추가
-- 목적: "최신순" 정렬·표시를 우리가 크롤링한 시각(created_at)이 아니라
--       실제 등록일시로 하기 위함.
--   - 워크넷(고용24): raw 의 smodifyDtm(수정일시, YYYYMMDDHHmm) → 없으면 regDt(등록일자, YY-MM-DD)
--   - 직접 등록: created_at
-- 시각은 모두 KST(Asia/Seoul) 기준으로 해석해 정확한 instant 로 저장.

alter table public.jobs add column if not exists posted_at timestamptz;

-- 1) 직접 등록 공고: created_at 으로 초기화
update public.jobs
set posted_at = created_at
where posted_at is null
  and coalesce(source_type, 'direct') <> 'worknet';

-- 2) 워크넷 공고: raw 에서 등록/수정 시각 파싱 (KST) → 둘 다 없으면 created_at
update public.jobs
set posted_at = coalesce(
  -- 수정일시 YYYYMMDDHHmm (예: 202606290859)
  case
    when raw->>'smodifyDtm' ~ '^\d{12}$'
    then (to_timestamp(raw->>'smodifyDtm', 'YYYYMMDDHH24MI')::timestamp) at time zone 'Asia/Seoul'
  end,
  -- 등록일자 YY-MM-DD (예: 26-06-29)
  case
    when raw->>'regDt' ~ '^\d{2}-\d{2}-\d{2}$'
    then (to_timestamp('20' || (raw->>'regDt'), 'YYYY-MM-DD')::timestamp) at time zone 'Asia/Seoul'
  end,
  created_at
)
where source_type = 'worknet';

-- 3) 최신순 정렬 인덱스
create index if not exists jobs_posted_at_idx on public.jobs (posted_at desc nulls last);
