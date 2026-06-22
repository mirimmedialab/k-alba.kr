-- =====================================================================
-- K-ALBA 테스트(branching) 시드 데이터
-- ---------------------------------------------------------------------
-- Supabase Branching 의 브랜치 DB 는 "스키마만" 복제되고 데이터는 0건으로
-- 시작합니다. 이 파일은 브랜치 생성/재생성 시 자동 실행되어, 테스트 화면이
-- 바로 채워지도록 더미 데이터를 넣습니다.
--
-- ⚠️ 실서버(production)에는 절대 적용하지 마세요. (테스트 브랜치 전용)
-- 모든 INSERT 는 ON CONFLICT DO NOTHING 으로 멱등(여러 번 실행해도 안전)합니다.
--
-- 테스트 계정 (이메일/비밀번호 로그인):
--   사장님 : test-employer@k-alba.test  / testpass123
--   알바생 : test-worker@k-alba.test    / testpass123
-- =====================================================================

create extension if not exists pgcrypto;

-- ───────────────────────── 1. 테스트 인증 사용자 ─────────────────────────
-- auth.users + auth.identities 를 직접 넣어 이메일/비번 로그인이 동작하게 함.
insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'test-employer@k-alba.test',
   crypt('testpass123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"테스트 사장님"}',
   now(), now()),
  ('00000000-0000-0000-0000-000000000000',
   '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'test-worker@k-alba.test',
   crypt('testpass123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"테스트 알바생"}',
   now(), now())
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
) values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111',
   '{"sub":"11111111-1111-1111-1111-111111111111","email":"test-employer@k-alba.test","email_verified":true}',
   'email', '11111111-1111-1111-1111-111111111111', now(), now(), now()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222',
   '{"sub":"22222222-2222-2222-2222-222222222222","email":"test-worker@k-alba.test","email_verified":true}',
   'email', '22222222-2222-2222-2222-222222222222', now(), now(), now())
on conflict (provider, provider_id) do nothing;

-- ───────────────────────── 2. 프로필 ─────────────────────────
insert into profiles (
  id, email, name, phone, user_type,
  company_name, business_number, business_address, verified,
  visa, country, organization, address, korean_level
) values
  ('11111111-1111-1111-1111-111111111111', 'test-employer@k-alba.test', '테스트 사장님',
   '010-0000-0001', 'employer',
   '미림카페', '123-45-67890', '서울 강남구 테헤란로 1', true,
   null, null, null, null, null),
  ('22222222-2222-2222-2222-222222222222', 'test-worker@k-alba.test', '테스트 알바생',
   '010-0000-0002', 'worker',
   null, null, null, false,
   'D-2', '베트남', '미림대학교', '서울 마포구 월드컵북로 1', 'intermediate')
on conflict (id) do nothing;

-- ───────────────────────── 3. 공고 (서울 곳곳 좌표 포함) ─────────────────────────
-- 위경도가 있어 목록/지도/상세 모두 채워진 상태로 테스트 가능.
insert into jobs (
  employer_id, title, job_type, work_type, pay_type, pay_amount,
  address, address_detail, work_hours, work_days, korean_level,
  visa_types, headcount, benefits, description,
  status, latitude, longitude
) values
  ('11111111-1111-1111-1111-111111111111', '강남 카페 홀 서빙 알바', 'cafe', 'part_time', 'hourly', 11000,
   '서울 강남구 테헤란로 152', '2층', '10:00~18:00', '월,화,수,목,금', 'intermediate',
   'D-2,D-4,F-2', '2', '식대 제공, 교통비 지원', '강남역 인근 카페에서 홀 서빙 알바를 구합니다. 외국인 환영.',
   'active', 37.500625, 127.036457),
  ('11111111-1111-1111-1111-111111111111', '홍대 편의점 야간 알바', 'convenience', 'part_time', 'hourly', 12000,
   '서울 마포구 양화로 160', '1층', '22:00~08:00', '토,일', 'beginner',
   'D-2,F-2,H-2', '1', '야간수당, 식대', '홍대입구역 편의점 야간 근무자 모집. 한국어 기초 가능자.',
   'active', 37.556785, 126.923550),
  ('11111111-1111-1111-1111-111111111111', '구로 물류센터 상하차', 'factory', 'short_term', 'daily', 130000,
   '서울 구로구 디지털로 300', null, '08:00~17:00', '월~토', 'beginner',
   'E-9,H-2,F-2', '5', '중식 제공, 일당 즉시지급', '물류센터 상하차 단기 근무자 모집. 체력 좋은 분.',
   'active', 37.485013, 126.901484),
  ('11111111-1111-1111-1111-111111111111', '잠실 식당 주방 보조', 'restaurant', 'full_time', 'monthly', 2400000,
   '서울 송파구 올림픽로 300', '지하 1층', '11:00~21:00', '주 5일 (협의)', 'intermediate',
   'F-2,F-4,F-5', '2', '4대보험, 기숙사 제공', '잠실 한식당 주방 보조 정직원 채용. 장기근무 우대.',
   'active', 37.513272, 127.100406),
  ('11111111-1111-1111-1111-111111111111', '성수 카페 베이커리 보조', 'cafe', 'part_time', 'hourly', 11500,
   '서울 성동구 아차산로 100', null, '07:00~13:00', '수,목,금,토', 'intermediate',
   'D-2,D-4,F-2', '1', '베이커리 제품 제공', '성수동 베이커리 카페 오전 보조. 제빵 배우고 싶은 분 환영.',
   'active', 37.544577, 127.055966),
  ('11111111-1111-1111-1111-111111111111', '여의도 사무실 청소', 'cleaning', 'part_time', 'hourly', 12500,
   '서울 영등포구 여의대로 24', '15층', '06:00~09:00', '월~금', 'beginner',
   'H-2,F-2,F-4', '3', '교통비, 조식', '여의도 오피스 빌딩 새벽 청소 인력 모집.',
   'active', 37.525651, 126.925410)
on conflict do nothing;
