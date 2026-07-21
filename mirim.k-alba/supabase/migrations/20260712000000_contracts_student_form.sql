-- 유학생 시간제취업 확인서 정보 (2026-07-12)
-- 챗봇이 수집한 확인서용 추가 정보 저장
-- { alien_reg_no, university, department, semester, industry }
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS student_form jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.contracts.student_form IS '외국인 유학생 시간제취업 확인서 정보 (챗봇 수집: 외국인등록번호·대학·학과·이수학기·업종)';
