-- 프로필 주소 상세입력(동·호수 등) 컬럼 추가
-- LocationPicker(프로필 거주지 / 업체주소)에서 도로명 검색 후 상세주소를 따로 저장하기 위함.
-- 거주지(worker)·업체주소(employer)가 모두 home_* 컬럼을 공유하므로 단일 컬럼으로 처리.
-- nullable text → 기존 행/시드에 영향 없음.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_address_detail text;
