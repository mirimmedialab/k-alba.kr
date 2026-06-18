-- ============================================================
-- 백업: staff_misconduct_reports (2026-06-18 어드민에서 제거하며 DROP)
-- 드롭 시점 데이터 0행. 복구가 필요하면 아래를 실행하면 동일 구조로 재생성됨.
-- (정책 INSERT의 WITH CHECK 식은 원본 추정치이므로 필요 시 조정)
-- ============================================================
CREATE TABLE public.staff_misconduct_reports (
  id               uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter_id      uuid NOT NULL,
  staff_id         uuid,
  application_id   uuid,
  category         text NOT NULL,
  description      text NOT NULL,
  evidence_urls    text[],
  status           text DEFAULT 'submitted'::text,
  resolved_at      timestamptz,
  resolution_notes text,
  created_at       timestamptz DEFAULT now(),
  CONSTRAINT staff_misconduct_reports_pkey PRIMARY KEY (id),
  CONSTRAINT staff_misconduct_reports_reporter_id_fkey   FOREIGN KEY (reporter_id)    REFERENCES auth.users(id),
  CONSTRAINT staff_misconduct_reports_staff_id_fkey      FOREIGN KEY (staff_id)       REFERENCES public.university_staff(id),
  CONSTRAINT staff_misconduct_reports_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.partwork_applications(id)
);

CREATE INDEX idx_report_status ON public.staff_misconduct_reports USING btree (status, created_at DESC);

ALTER TABLE public.staff_misconduct_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can submit reports" ON public.staff_misconduct_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Students view own reports" ON public.staff_misconduct_reports
  FOR SELECT USING (auth.uid() = reporter_id);
