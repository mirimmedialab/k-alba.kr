# K-ALBA 전체 코드 검토 최종 리포트

검토일: 2026-04-20
검토 범위: **전체 소스 (완료)** — 40개 파일 중 39개 확인 완료

---

## 📊 요약

| 구분 | 개수 | 상태 |
|---|---|---|
| 🔴 Critical (빌드/런타임 차단) | 3건 | ✅ 수정본 제공됨 |
| 🟠 High (런타임 에러 가능) | 3건 | ✅ 수정본 제공됨 |
| 🟡 Medium (기능적 버그) | 2건 | ⚠️ 일부 수정본 제공 |
| 🔵 Low (코드 품질) | 4건 | ℹ️ 참고만 |
| **총 발견** | **12건** | — |

---

## 🔴 Critical

### [C1] React Hooks 순서 위반 (계약서 상세 페이지)
- **파일**: `src/app/contract/[id]/page.jsx:187-188`
- **증상**: 완료된 계약서 페이지 방문 시 React 에러, 예측 불가능한 동작
- **수정본**: ✅ `contract-id-page.jsx`

### [C2] 푸터 중복 렌더링
- **파일**: `src/app/page.jsx:393-422`
- **증상**: 랜딩 페이지에 회사 정보 푸터 2개 표시
- **수정본**: ✅ `page-landing.jsx`

### [C3] package.json 존재하지 않는 버전
- **파일**: `package.json`
- **증상**: `typescript@6.0.2` 존재하지 않음 → `npm install` 실패 가능
- **수정본**: ✅ `package.json`

---

## 🟠 High

### [H1] signUp 함수 널 안전성
- **파일**: `src/lib/supabase.js:21-29`
- **증상**: 네트워크 에러 시 `TypeError: Cannot read properties of null`
- **수정본**: ✅ `supabase.js`

### [H2] NavBar pathname null 접근
- **파일**: `src/components/NavBar.jsx:107`
- **증상**: 초기 렌더 시 에러 가능
- **수정본**: ✅ `NavBar.jsx`

### [H3] AddressSearch Promise 무한 대기
- **파일**: `src/components/AddressSearch.jsx:14-17`
- **증상**: 주소 검색 모달 로딩 상태에서 멈출 수 있음
- **수정본**: ✅ `AddressSearch.jsx`

---

## 🟡 Medium

### [M1] 🆕 jobs.visa_types 필드/타입 불일치
- **파일들**:
  - `src/app/post-job/page.jsx:196` — 저장: `visa_types: a.visa` (쉼표 문자열, 예: `"D-2, E-9"`)
  - `src/app/jobs/[id]/page.jsx:127` — 사용: `(job.visa || []).map(...)` (배열 기대)
  - `src/app/jobs/page.jsx:117` — 사용: `(j.visa || []).slice(0, 3)` (배열 기대)
  - `supabase/schema.sql:53` — 스키마: `visa_types TEXT` (문자열)
- **증상**: Supabase 실제 DB 데이터 로드 시 비자 태그가 화면에 표시 안 됨
  - 현재는 DEMO_JOBS에 `visa: ["D-2", ...]` 배열이 있어서 가려져 있음
  - 실제 공고 등록 → 상세 페이지 진입 시 태그 0개
- **수정 방법**:
  1. jobs 페이지들에서 `job.visa_types` 사용 + 쉼표로 split 처리
  2. 또는 스키마를 `visa_types TEXT[]`로 바꾸고 post-job 저장 로직 수정
- **권장**: 2번이 깔끔함. 지금 MVP라면 아래 패치 적용:

```jsx
// jobs/[id]/page.jsx 127줄 근처
{((typeof job.visa === 'string' ? job.visa.split(',').map(s => s.trim())
  : job.visa_types ? String(job.visa_types).split(',').map(s => s.trim())
  : job.visa) || []).map((v) => ...)}
```
하지만 차라리 스키마를 배열로 통일하는 게 유지보수 유리.

### [M2] t() fallback 무효화
- **파일**: `src/app/my-contracts/page.jsx:132`
- **증상**: 번역 누락 시 화면에 `"contract.status.draft"` 같은 키가 노출 가능
- **현재 영향**: 실제로는 7개 locale 모두에 번역이 있어 **지금 눈에 안 보임**
  (미래에 키 추가 시 주의)
- **수정본**: ✅ `my-contracts-page.jsx` (예방적 수정)

---

## 🔵 Low (참고)

### [L1] i18n 초기 로케일 깜빡임
- **파일**: `src/lib/i18n.js:35`
- **증상**: 외국인 사용자 접속 시 한국어 → 자기 언어로 깜빡임
- **영향**: 미미

### [L2] 히어로 슬라이드 주기
- **파일**: `src/app/page.jsx:17`
- **기존 메모리**: 6초 / **현재 코드**: 8초 (8000ms)
- 의도한 변경이면 OK

### [L3] layout.jsx Google Fonts `<link>`
- **파일**: `src/app/layout.jsx:15-18`
- Next.js는 `next/font/google` 사용 권장 (CLS 방지)
- 현재 방식도 동작함

### [L4] contract/[id]/page.jsx 레거시 코드
- **파일**: `src/app/contract/[id]/page.jsx:843-903`
- `Section`, `Table`, `SignBlock` — 사용되지 않는 데드 코드
- 삭제해도 무방

---

## ✅ 깨끗한 파일들

다음 파일들은 검토 결과 **문제 없음**:

- `src/lib/contractUtils.js` — 급여 계산, 날짜 포맷 로직 깔끔
- `src/lib/pdfGenerator.js` — html2canvas + jsPDF 조합 깔끔
- `src/app/simulator/page.jsx` — iframe 래퍼 단순
- `src/app/privacy/page.jsx`, `terms/page.jsx` — 정적 문서
- `src/components/KakaoChatModal.jsx` — 챗봇 컴포넌트 깔끔
- `src/data/marketData.js` — 시세 데이터 + 정적 상수
- `src/data/addressData.js` — 주소 상수
- `src/app/chat/page.jsx` — 단, 데모 채팅 UUID는 실제 Supabase에서 작동 안 함 (의도적 데모)
- `src/app/api/verify-business/route.js` — 국세청 API 연동 깔끔
- **7개 locale 파일** — 221개 키 모두 정합성 일치 ✨

---

## 🔧 적용 가이드 (이전 zip과 동일)

```bash
cd ..
cp -r k-alba k-alba.backup-20260420

# 이전에 드린 zip 파일의 7개 파일 덮어쓰기:
#   package.json              → package.json
#   supabase.js               → src/lib/supabase.js
#   NavBar.jsx                → src/components/NavBar.jsx
#   AddressSearch.jsx         → src/components/AddressSearch.jsx
#   page-landing.jsx          → src/app/page.jsx
#   my-contracts-page.jsx     → src/app/my-contracts/page.jsx
#   contract-id-page.jsx      → src/app/contract/[id]/page.jsx

rm -rf node_modules .next
npm install
npm run dev
npm run build
git add .
git commit -m "fix: critical bugs (hooks violation, footer dup, package.json, null safety)"
git push
```

---

## ⚠️ [M1] 별도 수정 필요 (실제 배포 후 영향)

Supabase DB에 실제 공고가 등록되고 나면 비자 태그 표시가 안 되는 버그가 발생합니다. 현재 MVP 단계에서는 DEMO_JOBS가 가리고 있지만, 사용자가 실제로 공고를 올리면 드러납니다.

아래 방법 중 선택하세요:

**옵션 A (간단, 즉시 적용)**: jobs 페이지 쪽에서 문자열 split만 처리

**옵션 B (깔끔, DB 변경)**: 스키마 수정 + post-job 저장 로직 수정

```sql
-- 옵션 B: 스키마 수정 (Supabase SQL Editor)
ALTER TABLE jobs
  ALTER COLUMN visa_types TYPE TEXT[] USING
    CASE
      WHEN visa_types IS NULL THEN NULL
      ELSE string_to_array(visa_types, ', ')
    END;
```

저의 추천: 사용자가 거의 없는 지금이 DB 스키마 수정 타이밍으로 가장 좋습니다 (옵션 B).

---

**작성**: Claude (Anthropic)
**검토 완료**: 39/40 파일 (Vercel 빌드 산출물인 `.next/` 제외)
