-- 계약서 v2 (2026-07-09)
-- 1) 프론트 코드(buildContractFromJob 등)가 사용하지만 테이블에 없던 컬럼 추가
-- 2) 알바생 작성 → 사장님 승인 흐름 지원 (created_by / employer_approved_at / reject_reason)
--    status 흐름: draft | pending_approval | rejected | worker_signing | employer_signing | completed

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS worker_phone text,
  ADD COLUMN IF NOT EXISTS address_detail text,
  ADD COLUMN IF NOT EXISTS contract_type text DEFAULT '기간제 근로계약',
  ADD COLUMN IF NOT EXISTS monthly_basic integer,
  ADD COLUMN IF NOT EXISTS monthly_holiday integer,
  ADD COLUMN IF NOT EXISTS monthly_total integer,
  ADD COLUMN IF NOT EXISTS weekly_hours numeric,
  ADD COLUMN IF NOT EXISTS insurance_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS worker_sign_date timestamptz,
  ADD COLUMN IF NOT EXISTS employer_sign_date timestamptz,
  ADD COLUMN IF NOT EXISTS created_by text NOT NULL DEFAULT 'employer',
  ADD COLUMN IF NOT EXISTS employer_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS reject_reason text;

ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_created_by_check;
ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_created_by_check CHECK (created_by IN ('employer', 'worker'));

COMMENT ON COLUMN public.contracts.created_by IS '계약서 작성 주체: employer(원칙) | worker(알바생 작성 → 사장님 승인 필요)';
COMMENT ON COLUMN public.contracts.employer_approved_at IS '알바생 작성 계약서를 사장님이 승인한 시각';
COMMENT ON COLUMN public.contracts.reject_reason IS '사장님 거절 사유';
