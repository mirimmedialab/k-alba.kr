-- ════════════════════════════════════════════════════════════
-- 출입국 통합신청서 자동 작성 시스템
-- 출입국관리법 시행규칙 [별지 제34호서식]
-- 실행일: 2026-04-26
-- 순서: migration-staff-verification.sql 이후 실행
-- ════════════════════════════════════════════════════════════
--
-- 목적: 국제처 담당자 승인(approved) 후 학생이 출입국에 제출할
--      통합신청서를 자동 작성. 기존 정보는 미리 채우고, 누락 정보만
--      사용자가 입력하도록 함.
--
-- 신청 종류:
--   - permit_other_activity (체류자격 외 활동허가) ← 시간제취업 기본
--   - extend_period         (체류기간 연장허가)
--   - reentry_permit        (재입국허가)
--   - change_status         (체류자격 변경허가)
--   - alteration_residence  (체류지 변경신고)
--   - register_change       (등록사항 변경신고)

-- ═══ 1. 신청자 프로필 확장 (profiles 테이블에 통합신청서용 컬럼 추가) ═══
-- 출입국 통합신청서에 필요한 추가 정보를 profiles에 저장 (재사용 가능)
-- 기존 profiles 테이블이 있다면 컬럼만 추가
ALTER TABLE profiles
  -- 영문 이름 (여권 영문)
  ADD COLUMN IF NOT EXISTS surname_en       TEXT,                -- 성 (대문자)
  ADD COLUMN IF NOT EXISTS given_names_en   TEXT,                -- 명 (대문자)
  -- 여권 정보
  ADD COLUMN IF NOT EXISTS passport_number  TEXT,
  ADD COLUMN IF NOT EXISTS passport_issue_date    DATE,
  ADD COLUMN IF NOT EXISTS passport_expiry_date   DATE,
  -- 주소
  ADD COLUMN IF NOT EXISTS address_korea            TEXT,        -- 대한민국 내 주소 (체류지)
  ADD COLUMN IF NOT EXISTS address_korea_phone      TEXT,        -- 한국 거주지 전화 (선택)
  ADD COLUMN IF NOT EXISTS address_home_country     TEXT,        -- 본국 주소
  ADD COLUMN IF NOT EXISTS address_home_phone       TEXT,        -- 본국 전화
  -- 외국인등록번호 (이전 마이그레이션에서 추가됐을 수 있음)
  ADD COLUMN IF NOT EXISTS alien_reg_number        TEXT,
  -- 기타
  ADD COLUMN IF NOT EXISTS occupation              TEXT DEFAULT '학생',
  ADD COLUMN IF NOT EXISTS bank_account_for_refund TEXT;          -- 반환용 계좌 (외국인등록 시)


-- ═══ 2. 통합신청서 테이블 ═══
CREATE TABLE IF NOT EXISTS immigration_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 연결된 시간제취업 신청서 (담당자 승인 완료된 것)
  partwork_application_id UUID REFERENCES partwork_applications(id),

  -- ─── 신청 종류 (출입국관리법 시행규칙 별지 34호의 7가지) ───
  application_type TEXT NOT NULL CHECK (application_type IN (
    'foreign_resident_registration',  -- 외국인 등록
    'permit_other_activity',           -- 체류자격 외 활동허가 ★ 시간제취업 시 기본
    'reissue_card',                    -- 등록증 재발급
    'extend_period',                   -- 체류기간 연장허가
    'change_status',                   -- 체류자격 변경허가
    'grant_status',                    -- 체류자격 부여
    'change_workplace',                -- 근무처 변경·추가허가/신고
    'reentry_permit',                  -- 재입국허가
    'alteration_residence',            -- 체류지 변경신고
    'register_change'                  -- 등록사항 변경신고
  )),
  -- 희망 자격 (체류자격 외 활동허가 / 변경허가 / 부여 시 입력)
  desired_status TEXT,                  -- 예: 'D-2-7' (시간제취업)
  -- 재입국 종류
  reentry_type TEXT CHECK (reentry_type IN ('single', 'multiple') OR reentry_type IS NULL),
  reentry_period INT,                   -- 재입국 신청 기간 (일)

  -- ─── 자동 채움되는 필드 (snapshot — 신청 시점 기준) ───
  -- 인적사항
  surname_en        TEXT,                -- 성 (영문, 대문자)
  given_names_en    TEXT,                -- 명 (영문, 대문자)
  date_of_birth     DATE,
  sex               TEXT CHECK (sex IN ('M', 'F') OR sex IS NULL),
  nationality       TEXT,
  alien_reg_number  TEXT,                -- 외국인등록번호
  -- 여권
  passport_number   TEXT,
  passport_issue_date  DATE,
  passport_expiry_date DATE,
  -- 주소·연락처
  address_korea        TEXT,
  phone_korea          TEXT,             -- 한국 전화 (집)
  cell_phone           TEXT,             -- 휴대전화
  address_home_country TEXT,
  phone_home_country   TEXT,
  email                TEXT,
  -- 재학·근무
  school_status        TEXT CHECK (school_status IN
    ('non_school', 'elementary', 'middle', 'high', 'university') OR school_status IS NULL),
  school_name          TEXT,
  school_phone         TEXT,
  school_type          TEXT CHECK (school_type IN
    ('accredited', 'non_accredited_alternative') OR school_type IS NULL),
  -- 근무처 (변경/추가 시)
  current_workplace_name        TEXT,
  current_workplace_business_no TEXT,
  current_workplace_phone       TEXT,
  new_workplace_name            TEXT,
  new_workplace_business_no     TEXT,
  new_workplace_phone           TEXT,
  -- 기타
  annual_income_10k    INT,              -- 연 소득금액 (만원 단위)
  occupation           TEXT,
  bank_account_refund  TEXT,             -- 반환용 계좌

  -- ─── 행정정보 공동이용 동의 ───
  consent_admin_share_self     BOOLEAN DEFAULT false,  -- 본인
  consent_admin_share_spouse   BOOLEAN DEFAULT false,  -- 배우자
  consent_admin_share_parent   BOOLEAN DEFAULT false,  -- 부모

  -- ─── 신청자 서명 ───
  applicant_signature  TEXT,              -- base64 PNG

  -- ─── 처리 상태 ───
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',             -- 작성 중
    'completed',         -- 작성 완료 (PDF 생성 가능)
    'submitted_to_immigration',  -- 출입국에 제출 (학생이 직접 가져감)
    'approved_by_immigration',   -- 출입국 허가
    'rejected_by_immigration'    -- 출입국 반려
  )),

  -- ─── PDF ───
  pdf_url            TEXT,               -- 생성된 PDF (Supabase Storage)
  pdf_generated_at   TIMESTAMPTZ,

  -- ─── 메타데이터 ───
  application_date   DATE DEFAULT CURRENT_DATE,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_imm_user ON immigration_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_imm_partwork ON immigration_applications(partwork_application_id);
CREATE INDEX IF NOT EXISTS idx_imm_status ON immigration_applications(status, created_at DESC);

COMMENT ON TABLE immigration_applications IS '출입국 통합신청서 (별지 제34호서식)';
COMMENT ON COLUMN immigration_applications.application_type IS '7가지 신청 종류 — 시간제취업 시 permit_other_activity 기본';


-- ═══ 3. RLS 정책 ═══
ALTER TABLE immigration_applications ENABLE ROW LEVEL SECURITY;

-- 학생: 본인 것만 조회/생성/수정
DROP POLICY IF EXISTS "User views own immigration apps" ON immigration_applications;
CREATE POLICY "User views own immigration apps"
  ON immigration_applications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "User creates own immigration apps" ON immigration_applications;
CREATE POLICY "User creates own immigration apps"
  ON immigration_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User updates own immigration apps" ON immigration_applications;
CREATE POLICY "User updates own immigration apps"
  ON immigration_applications FOR UPDATE
  USING (auth.uid() = user_id);


-- ═══ 4. 자동 사전 채움 함수 ═══
-- 시간제취업 신청서가 'approved' 되면 통합신청서 초안을 자동 생성
CREATE OR REPLACE FUNCTION create_immigration_app_from_partwork(
  p_partwork_id BIGINT
) RETURNS UUID AS $$
DECLARE
  v_partwork RECORD;
  v_profile  RECORD;
  v_user     RECORD;
  v_imm_id   UUID;
  v_dob      DATE;
  v_sex      TEXT;
  v_arn_part TEXT;
BEGIN
  -- 시간제취업 신청서 조회 (approved 상태만)
  SELECT * INTO v_partwork
  FROM partwork_applications WHERE id = p_partwork_id AND status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION '승인되지 않은 신청서입니다 (id: %)', p_partwork_id;
  END IF;

  -- 사용자 프로필 조회 (profiles 테이블 사용)
  SELECT * INTO v_profile FROM profiles WHERE id = v_partwork.user_id;
  SELECT * INTO v_user    FROM auth.users    WHERE id = v_partwork.user_id;

  -- 외국인등록번호로 생년월일 + 성별 추출
  -- 형식: YYMMDD-NXXXXXX (N: 1900년대 남=1·여=2, 2000년대 남=3·여=4, 외국인 5/6/7/8)
  IF v_partwork.alien_reg_number IS NOT NULL AND length(v_partwork.alien_reg_number) >= 8 THEN
    v_arn_part := replace(v_partwork.alien_reg_number, '-', '');
    -- 7번째 숫자로 세기·성별 판정
    BEGIN
      IF substring(v_arn_part, 7, 1) IN ('1', '2', '5', '6') THEN
        v_dob := to_date('19' || substring(v_arn_part, 1, 6), 'YYYYMMDD');
      ELSIF substring(v_arn_part, 7, 1) IN ('3', '4', '7', '8') THEN
        v_dob := to_date('20' || substring(v_arn_part, 1, 6), 'YYYYMMDD');
      END IF;

      IF substring(v_arn_part, 7, 1) IN ('1', '3', '5', '7') THEN
        v_sex := 'M';
      ELSIF substring(v_arn_part, 7, 1) IN ('2', '4', '6', '8') THEN
        v_sex := 'F';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- 외국인등록번호 형식 오류는 무시 (사용자가 직접 입력)
      v_dob := NULL;
      v_sex := NULL;
    END;
  END IF;

  -- 통합신청서 초안 생성
  INSERT INTO immigration_applications (
    user_id, partwork_application_id,
    application_type, desired_status,
    -- 기본 인적사항 (자동 채움)
    surname_en, given_names_en, date_of_birth, sex, nationality,
    alien_reg_number, cell_phone, email,
    -- 학교 정보 (시간제취업 신청서에서)
    school_name, school_status, school_type,
    -- 예정 근무처 (시간제취업 신청서의 근무처 = 출입국 통합신청서의 예정 근무처)
    new_workplace_name, new_workplace_business_no,
    -- 직업 + 연 소득
    occupation, annual_income_10k,
    -- 프로필에 저장된 정보 (있으면)
    passport_number, passport_issue_date, passport_expiry_date,
    address_korea, address_home_country, phone_home_country,
    -- 상태
    status
  ) VALUES (
    v_partwork.user_id, p_partwork_id,
    'permit_other_activity', 'D-2-7',  -- 시간제취업 기본값
    -- 영문 이름은 프로필에서 (없으면 NULL → 사용자 입력)
    COALESCE(v_profile.surname_en, NULL),
    COALESCE(v_profile.given_names_en, NULL),
    v_dob, v_sex,
    -- 국적은 비자에서 추정 어려우므로 사용자 입력
    NULL,
    v_partwork.alien_reg_number, v_partwork.phone, v_partwork.email,
    -- 학교
    v_partwork.university_name, 'university', 'accredited',
    -- 근무처 = 시간제취업 신청서의 employer
    v_partwork.employer_name, v_partwork.employer_business_no,
    -- 직업·소득
    '학생',
    -- 연 소득 = 시급 × 주당시간 × 52주 ÷ 10000 (만원 단위)
    GREATEST(0, ROUND((COALESCE(v_partwork.hourly_pay, 0) * COALESCE(v_partwork.weekly_hours, 0) * 52) / 10000.0)::INT),
    -- 프로필 정보
    v_profile.passport_number, v_profile.passport_issue_date, v_profile.passport_expiry_date,
    v_profile.address_korea, v_profile.address_home_country, v_profile.address_home_phone,
    'draft'
  )
  RETURNING id INTO v_imm_id;

  RETURN v_imm_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_immigration_app_from_partwork IS
  '시간제취업 신청서 승인 시 통합신청서 초안 자동 생성';


-- ═══ 5. 자동 트리거: 시간제취업 승인 시 통합신청서 초안 생성 ═══
CREATE OR REPLACE FUNCTION on_partwork_approved_create_imm() RETURNS TRIGGER AS $$
BEGIN
  -- 'approved' 상태로 변경되는 순간에만 작동
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- 이미 통합신청서가 있으면 생성하지 않음 (중복 방지)
    IF NOT EXISTS (
      SELECT 1 FROM immigration_applications
      WHERE partwork_application_id = NEW.id
    ) THEN
      PERFORM create_immigration_app_from_partwork(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_partwork_approved_create_imm ON partwork_applications;
CREATE TRIGGER trg_partwork_approved_create_imm
  AFTER UPDATE OR INSERT ON partwork_applications
  FOR EACH ROW EXECUTE FUNCTION on_partwork_approved_create_imm();


-- ═══ 6. 통합신청서 사용자 입력 필드 메타데이터 (프론트엔드 폼 자동 생성용) ═══
CREATE OR REPLACE VIEW immigration_form_fields AS
SELECT
  field_key,
  category,
  label_ko,
  label_en,
  field_type,
  is_required,
  auto_fill_from,
  display_order
FROM (VALUES
  -- 인적사항
  ('surname_en',       'personal',  '성 (영문)',         'Surname',           'text',     true,  'profile.surname_en',       1),
  ('given_names_en',   'personal',  '명 (영문)',         'Given names',       'text',     true,  'profile.given_names_en',   2),
  ('date_of_birth',    'personal',  '생년월일',          'Date of Birth',     'date',     true,  'arn_decode',               3),
  ('sex',              'personal',  '성별',              'Sex',               'radio',    true,  'arn_decode',               4),
  ('nationality',      'personal',  '국적',              'Nationality',       'text',     true,  NULL,                       5),
  ('alien_reg_number', 'personal',  '외국인등록번호',    'Foreign Reg No.',   'text',     true,  'partwork.alien_reg_number',6),
  -- 여권
  ('passport_number',       'passport', '여권번호',          'Passport No.',          'text', true,  'profile.passport_number',       10),
  ('passport_issue_date',   'passport', '여권 발급일자',     'Passport Issue Date',   'date', true,  'profile.passport_issue_date',   11),
  ('passport_expiry_date',  'passport', '여권 유효기간',     'Passport Expiry Date',  'date', true,  'profile.passport_expiry_date',  12),
  -- 주소·연락처
  ('address_korea',         'address', '대한민국 내 주소',  'Address In Korea',      'text', true,  'profile.address_korea',         20),
  ('phone_korea',           'address', '한국 전화 (집)',     'Telephone No.',         'text', false, NULL,                            21),
  ('cell_phone',            'address', '휴대전화',           'Cell Phone',            'text', true,  'partwork.phone',                22),
  ('address_home_country',  'address', '본국 주소',          'Address In Home Country','text',true,  'profile.address_home_country',  23),
  ('phone_home_country',    'address', '본국 전화',          'Phone No. (Home)',      'text', false, 'profile.address_home_phone',    24),
  ('email',                 'address', '전자우편',           'E-Mail',                'email',true, 'partwork.email',                25),
  -- 학교
  ('school_name',     'school', '학교 이름',           'Name of School',        'text', true, 'partwork.university_name',  30),
  ('school_status',   'school', '재학 여부',           'School Status',         'radio',true, 'fixed:university',          31),
  ('school_type',     'school', '학교 종류',           'Type of School',        'radio',true, 'fixed:accredited',          32),
  -- 근무처 (시간제취업 신청 시 신규 근무처만)
  ('new_workplace_name',         'workplace', '예정 근무처 업체명',     'New Workplace',     'text',true, 'partwork.employer_name',        40),
  ('new_workplace_business_no',  'workplace', '사업자등록번호',         'Business Reg No.',  'text',true, 'partwork.employer_business_no', 41),
  ('new_workplace_phone',        'workplace', '근무처 전화번호',        'Workplace Phone',   'text',false,NULL,                            42),
  -- 기타
  ('occupation',         'misc', '직업',              'Occupation',           'text', true,  'fixed:학생',          50),
  ('annual_income_10k',  'misc', '연 소득금액 (만원)', 'Annual Income (10k won)','number',true,'computed',           51),
  ('bank_account_refund','misc', '반환용 계좌번호',    'Refund Account',       'text', false, NULL,                  52)
) AS t(field_key, category, label_ko, label_en, field_type, is_required, auto_fill_from, display_order);


-- ═══ 검증 쿼리 ═══
-- SELECT * FROM immigration_form_fields ORDER BY display_order;
-- SELECT create_immigration_app_from_partwork(<승인된 신청서 id>);
-- SELECT * FROM immigration_applications WHERE user_id = auth.uid();
