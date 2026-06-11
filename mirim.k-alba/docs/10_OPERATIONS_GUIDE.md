# 운영팀 빠른 가이드

신규 대학 등록 신청서가 들어왔을 때 처리 절차

---

## 📨 신청 접수 알림 받기

1. K-ALBA 운영팀 이메일(support@k-alba.kr)에 자동 알림 도착
2. Supabase SQL Editor에서 신청서 확인:

```sql
-- 미처리 신청서 조회
SELECT
  id, university_name, applicant_name, applicant_position,
  applicant_email, applicant_office_phone, status, created_at,
  official_letter_url, id_card_url
FROM staff_registrations
WHERE status = 'submitted'
ORDER BY created_at;
```

---

## ✅ 5단계 검증 절차

### ① 도메인 매칭 (자동 검증됨)

```sql
SELECT applicant_email, verified_domain_match
FROM staff_registrations WHERE id = '<신청서-id>';
```
- `verified_domain_match = true` → 자동 통과
- `false` → 학교 도메인 등록 필요 또는 수동 검증

### ② 공문 진위 확인

1. `official_letter_url` 클릭하여 PDF 다운로드
2. 확인 사항:
   - [ ] 학교 책임자 명의 (국제처장/학장/처장 등)
   - [ ] 학교 직인 (인주 색상이 자연스러운지)
   - [ ] 발신 부서 표기
   - [ ] 발신일자 (최근 1개월 이내)
3. 의심스러우면 학교 대표번호로 직접 문의

### ③ 학교 사무실 전화 검증 ★ 가장 중요

1. **학교 홈페이지에서 해당 번호 검색**
   - 학교 대표번호 또는 부서 직통번호와 일치 확인
2. 신청 받은 번호로 직접 전화
3. 학교 안내원 → 부서 → 신청자 본인 연결 확인

```
"안녕하세요, K-ALBA 운영팀입니다.
○○○님 본인 맞으신가요?
국제처 담당자 등록 신청을 확인하기 위해 연락드렸습니다."
```

### ④ 학교 홈페이지 담당자 정보 일치

- 학교 국제처/유학생지원팀 담당자 페이지 확인
- 신청자 이름·직위·이메일·연락처 일치 여부

### ⑤ 직원증 사진 검토

- `id_card_url` 다운로드
- 이름과 사진이 명확한지
- 직원증 양식이 학교 공식 양식인지

---

## 승인 / 거절 처리

### 승인 시

```sql
-- 1. staff_registrations 업데이트
UPDATE staff_registrations SET
  status = 'approved',
  reviewer_id = auth.uid(),
  reviewed_at = now(),
  verified_official_letter = true,
  verified_phone_call = true,
  verified_website_match = true,
  verified_id_card = true
WHERE id = '<신청서-id>';

-- 2. 신청자가 K-ALBA 회원가입을 마쳤는지 확인
SELECT id, email FROM auth.users WHERE email = '<신청자-이메일>';

-- 3. 첫 admin 계정 활성화 (학교별 1명)
INSERT INTO university_staff (
  user_id, university_id, staff_name, staff_position, staff_email,
  staff_phone, department, role, is_active, invitation_status
)
SELECT
  u.id,
  r.university_id,
  r.applicant_name,
  r.applicant_position,
  r.applicant_email,
  r.applicant_office_phone,
  r.department,
  'admin',
  true,
  'accepted'
FROM staff_registrations r
JOIN auth.users u ON u.email = r.applicant_email
WHERE r.id = '<신청서-id>';

-- 4. 대학에 등록일 기록
UPDATE universities SET registered_at = now()
WHERE id = (SELECT university_id FROM staff_registrations WHERE id = '<신청서-id>');

-- 5. 승인 안내 이메일 발송 (수동 또는 별도 API)
```

### 거절 시

```sql
UPDATE staff_registrations SET
  status = 'rejected',
  reviewer_id = auth.uid(),
  reviewed_at = now(),
  rejection_reason = '<거절 사유 — 신청자에게 안내될 내용>'
WHERE id = '<신청서-id>';
```

---

## 일상 모니터링

### 이상 활동 감지

```sql
-- 1시간 내 5건 이상 일괄 처리 (의심)
SELECT * FROM staff_activity_stats WHERE burst_count_week > 0;

-- 새벽 시간 (0~6시) 처리 많은 담당자
SELECT * FROM staff_activity_stats WHERE night_actions_week > 5;

-- 재검증 만료 임박
SELECT * FROM staff_activity_stats
WHERE verification_status IN ('expired', 'due_soon');
```

### 학생 신고 처리

```sql
-- 미처리 신고 조회
SELECT * FROM staff_misconduct_reports
WHERE status = 'submitted'
ORDER BY created_at;
```

---

## 자주 묻는 시나리오

### Q. 학교가 K-ALBA에 처음 등록하려는데 universities 테이블에 없어요
```sql
INSERT INTO universities (name, name_en, type, region, certified, allowed_email_domains)
VALUES ('새대학교', 'New University', '4년제', '서울', false, ARRAY['newu.ac.kr']);
```

### Q. 담당자가 부서 이동 / 퇴사했어요
```sql
UPDATE university_staff SET is_active = false
WHERE id = '<staff-id>';
```

### Q. 같은 사람이 여러 대학을 담당해요
- 각 대학별로 별도 `university_staff` 레코드 생성
- 같은 `user_id`이지만 다른 `university_id`
- UI에서 자동으로 대학 전환 칩 표시됨

### Q. admin이 떠나서 대학 관리자가 없어요
1. 새 admin을 운영팀이 직접 등록 (위 "승인 시" 절차)
2. 또는 같은 대학의 manager를 admin으로 승격:
```sql
UPDATE university_staff SET role = 'admin' WHERE id = '<staff-id>';
```

---

## 주요 SQL 단축 명령

```sql
-- 모든 등록된 대학 + 담당자 수
SELECT u.name, COUNT(s.id) AS staff_count
FROM universities u
LEFT JOIN university_staff s ON s.university_id = u.id AND s.is_active = true
WHERE u.registered_at IS NOT NULL
GROUP BY u.name ORDER BY u.name;

-- 대학별 처리 통계
SELECT * FROM partwork_university_stats ORDER BY pending_count DESC;

-- 처리 안 된 오래된 신청서 (7일 이상)
SELECT * FROM partwork_applications
WHERE status = 'submitted' AND submitted_at < now() - INTERVAL '7 days'
ORDER BY submitted_at;
```

---

문의: support@k-alba.kr · 미림미디어랩(주)
