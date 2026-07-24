-- 상호 평가 (계약 종료/근무 2개월 시점 알림톡 → 별점+한줄평)
-- ✅ 2026-07-24 적용 완료 (select 정책은 reviewee 열람 허용으로 확장 적용됨)

CREATE TABLE public.reviews (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contract_id BIGINT NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('employer_to_worker','worker_to_employer')),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contract_id, direction)
);
COMMENT ON TABLE public.reviews IS '근로계약 상호 평가 (사장님↔알바생). 공개 정책 확정 전까지 본인 작성분만 조회 가능';

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 작성: 계약 당사자 본인이, 방향·평가대상이 계약과 일치할 때만
CREATE POLICY reviews_insert_party ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_id
        AND (
          (direction = 'worker_to_employer' AND c.worker_id = auth.uid() AND reviewee_id = c.employer_id)
          OR
          (direction = 'employer_to_worker' AND c.employer_id = auth.uid() AND reviewee_id = c.worker_id)
        )
    )
  );

-- 조회: 본인이 작성한 것만 (내부 참고용 — 공개 정책 확정 시 별도 마이그레이션으로 개방)
CREATE POLICY reviews_select_own ON public.reviews FOR SELECT
  USING (auth.uid() = reviewer_id);

-- 알림톡 발송 이력 (cron 중복 발송 방지, service_role 전용 — 정책 없음 = 클라이언트 차단)
CREATE TABLE public.review_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contract_id BIGINT NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('end','midterm')),
  target TEXT NOT NULL CHECK (target IN ('worker','employer')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contract_id, kind, target)
);
COMMENT ON TABLE public.review_requests IS '평가 요청 알림톡 발송 이력 (cron 중복 방지, service_role 전용)';
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_reviews_reviewee ON public.reviews (reviewee_id);
CREATE INDEX idx_review_requests_contract ON public.review_requests (contract_id);
