-- K-ALBA 스키마 마이그레이션: jobs.visa_types 문자열 → 배열
-- 실행일: 2026-04-20 작성
-- 실행 위치: Supabase SQL Editor
-- 
-- 배경:
--   post-job 페이지는 a.visa(쉼표 문자열, 예: "D-2, E-9")를 저장하고,
--   jobs/* 페이지는 job.visa.map(배열 메서드)로 사용함.
--   필드명과 타입이 모두 불일치하여, 실제 DB 데이터 로드 시 비자 태그가 표시 안됨.
--   MVP 초기인 지금 바로잡는 게 좋음.
--
-- ⚠️ 주의:
--   - 프로덕션 적용 전에 반드시 DB 백업
--   - Supabase 대시보드: Database > Backups > Create backup
--   - 이 마이그레이션은 idempotent하지 않음 (1번만 실행)
--   - 실행 후에는 post-job/page.jsx의 저장 로직 수정도 반드시 함께 배포

-- ============================================
-- STEP 1: 백업 테이블 생성 (롤백 대비)
-- ============================================
CREATE TABLE IF NOT EXISTS jobs_backup_20260420 AS
SELECT id, visa_types FROM jobs;

-- ============================================
-- STEP 2: visa_types 컬럼을 TEXT → TEXT[]로 변환
-- ============================================
-- 기존 문자열을 쉼표로 split하여 배열로 변환
-- "D-2, E-9, F-2" → {"D-2", "E-9", "F-2"}
ALTER TABLE jobs
  ALTER COLUMN visa_types TYPE TEXT[] USING
    CASE
      WHEN visa_types IS NULL OR visa_types = '' THEN NULL
      ELSE string_to_array(
        regexp_replace(visa_types, '\s*,\s*', ',', 'g'),  -- 공백 제거
        ','
      )
    END;

-- ============================================
-- STEP 3: 검증 쿼리
-- ============================================
-- 아래 쿼리로 변환 결과를 확인하세요
-- SELECT id, title, visa_types, array_length(visa_types, 1) AS visa_count
-- FROM jobs
-- WHERE visa_types IS NOT NULL
-- LIMIT 20;

-- ============================================
-- ROLLBACK (문제 생기면 실행)
-- ============================================
-- ALTER TABLE jobs
--   ALTER COLUMN visa_types TYPE TEXT USING
--     array_to_string(visa_types, ', ');
-- 
-- 또는 백업에서 복원:
-- UPDATE jobs j
-- SET visa_types = b.visa_types
-- FROM jobs_backup_20260420 b
-- WHERE j.id = b.id;

-- ============================================
-- ⚠️ 이 SQL 실행 후 반드시 함께 배포해야 할 코드 수정:
-- ============================================
-- 
-- src/app/post-job/page.jsx 196줄 근처:
-- 
-- BEFORE:
--   visa_types: a.visa,  // "D-2, E-9" 문자열
-- 
-- AFTER:
--   visa_types: Array.isArray(a.visa) 
--     ? a.visa 
--     : String(a.visa || "").split(",").map(s => s.trim()).filter(Boolean),
-- 
-- 
-- src/app/jobs/[id]/page.jsx, jobs/page.jsx 등에서
-- (job.visa || []) 부분은 (job.visa_types || []) 로 변경 권장
