-- ════════════════════════════════════════════════════════════
-- K-ALBA 기존 테이블 정리 스크립트
-- 작성일: 2026-04-27
--
-- ⚠️ 중요: 이 스크립트는 마이그레이션 폴더에 두지 말고
--           Supabase SQL Editor에서 1회만 수동 실행하세요.
--
-- 목적: 마이그레이션 적용 전, 수동 생성된 5개 테이블을 정리하여
--       마이그레이션 12개를 깨끗한 상태에서 적용하도록 함.
--
-- ⚠️ 주의: 모든 데이터가 삭제됩니다 (현재 0 rows이므로 안전).
-- ════════════════════════════════════════════════════════════

-- 1. 외래키 의존성 순서대로 DROP (CASCADE로 안전하게)
DROP TABLE IF EXISTS work_history CASCADE;
DROP TABLE IF EXISTS messages     CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS jobs         CASCADE;
DROP TABLE IF EXISTS profiles     CASCADE;

-- 2. 혹시 남은 테이블도 정리
DROP TABLE IF EXISTS contracts    CASCADE;

-- 3. 트리거 정리 (있다면)
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- 4. 검증
-- 다음 쿼리로 public 스키마에 테이블이 없는지 확인:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public';
-- → 결과가 비어있어야 함 (또는 supabase 시스템 테이블만 남음)

-- 이 스크립트 실행 후, 마이그레이션 13개를 순서대로 실행하세요:
-- 1. 00000000_000_base_schema.sql
-- 2. 20260101_001_visa_types.sql
-- 3. 20260201_001_geolocation.sql
-- 4. 20260301_001_recommendations.sql
-- 5. 20260315_001_push_notifications.sql
-- 6. 20260401_001_email_outreach.sql
-- 7. 20260410_001_partwork.sql
-- 8. 20260415_001_signatures.sql
-- 9. 20260420_001_partwork_documents.sql
-- 10. 20260423_001_user_profile.sql
-- 11. 20260425_001_staff_portal.sql
-- 12. 20260426_001_staff_verification.sql
-- 13. 20260426_002_immigration_form.sql
