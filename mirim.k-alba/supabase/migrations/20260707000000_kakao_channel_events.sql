-- 카카오톡 채널 추가/차단 웹훅 이벤트 로그 (친구수 증감 자체 집계용)
-- 수신: app/api/kakao/channel-webhook (카카오디벨로퍼스 [앱 > 웹훅 > 카카오톡 채널 웹훅]에 URL 등록)
create table if not exists public.kakao_channel_events (
  id bigint generated always as identity primary key,
  event text not null check (event in ('added', 'blocked')),
  user_ref text,                 -- 카카오 전달 사용자 식별자 (app_user_id 또는 open_id)
  id_type text,                  -- 'app_user_id' | 'open_id'
  channel_public_id text,        -- 채널 프로필 ID
  resource_id text unique,       -- X-Kakao-Resource-ID (재전송 중복 방지)
  occurred_at timestamptz not null default now(),  -- 카카오 기준 발생 시각(updated_at)
  created_at timestamptz not null default now()
);

comment on table public.kakao_channel_events is '카카오톡 채널 추가/차단 웹훅 이벤트 로그 (KPI 친구수 집계용)';

create index if not exists kakao_channel_events_occurred_idx
  on public.kakao_channel_events (occurred_at);
create index if not exists kakao_channel_events_event_idx
  on public.kakao_channel_events (event);

-- service_role 전용 (웹훅 서버·KPI 대시보드에서만 접근, 클라이언트 접근 차단)
alter table public.kakao_channel_events enable row level security;
