# K-ALBA 디자인 시스템 완전 통합 가이드

**최종 업데이트**: 2026-04-20
**목표**: 웹 랜딩 페이지(McKinsey 에디토리얼)와 모바일 앱의 **완전한 디자인 일관성**

---

## 📊 이번 작업 요약

사장님의 웹 랜딩 페이지(`k-alba-mckinsey-landing.html`)의 디자인 언어를 모바일 앱 전체에 이식했습니다.

**이번 버전 추가 재디자인 페이지** (3개):
- ✅ `/login` — 로그인
- ✅ `/signup` — 회원가입 (Step 0 역할선택 + Step 1 폼)
- ✅ `/jobs` — 알바 찾기 (구직자 메인)
- ✅ `/my-jobs` — 내 공고 (사장님 메인)

이제 **핵심 사용자 진입 경로 전체**가 웹 랜딩과 일관됩니다:
```
웹 랜딩 → 앱 랜딩 → 로그인/회원가입 → jobs/my-jobs 대시보드
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
모든 단계에서 동일한: 네이비 #0A1628 + 골드 #B8944A + Pretendard + 샤프 4-6px
```

---

## 🎨 디자인 토큰 (최종)

### 팔레트
```css
--n9:  #0A1628  /* Navy — primary CTA 배경, 강조 */
--n7:  #1B365D  /* Navy light */
--ink: #0A1628  /* 본문 텍스트 */
--ink2:#3F5273  /* 2차 텍스트 */
--ink3:#6B7A95  /* 3차 텍스트 (라벨, 메타) */
--p:   #FFFFFF  /* 순백 배경 */
--p2:  #F7F5F0  /* 크림 (섹션 alt) */
--r:   #D9D4C7  /* 베이지 라인 */
--g:   #B8944A  /* 샴페인 골드 — 포인트 */
--gl:  #E8D9B5  /* 골드 라이트 */
--ac:  #C2512A  /* 테라코타 — 강조/경고/숫자 */
--abg: #F5E8E2  /* 테라코타 배경 */
```

### 타이포그래피
- **폰트**: Pretendard (웹 랜딩과 동일)
- **자간**: 본문 `-0.01em`, 타이틀 `-0.025em`, 히어로 `-0.03em`
- **웨이트**: 800 (타이틀), 700 (라벨), 600 (버튼), 400 (본문)
- **줄바꿈**: `word-break: keep-all` (한글 단어 쪼개짐 방지)

### Shape
- **버튼/입력**: `border-radius: 4px` (샤프)
- **카드**: `border-radius: 6px`
- **태그**: `border-radius: 2-4px`
- **보더**: `1px solid #D9D4C7` (얇고 베이지)

### 시그니처 장식
- **골드 상단 라인**: `width: 40px; height: 3px; background: gold`
- **섹션 라벨**: `UPPERCASE · 한글` 형태 (`letter-spacing: 0.08em`)
- **숫자 강조**: 큰 숫자(28~32px) + 작은 설명문
- **Editorial numbering**: `01`, `02`, `03` 정렬 (리스트 왼쪽)

---

## 📦 제공 파일 (14개)

### 🔥 필수 3개 — 이것만 덮어도 앱 전체 색상·폰트 변경
| 파일 | 대상 경로 |
|---|---|
| `globals.css` | `src/app/globals.css` |
| `theme.js` | `src/lib/theme.js` |
| `UI.jsx` | `src/components/UI.jsx` |

### ⚡ 권장 11개 — 주요 화면 완전 재디자인
| 파일 | 대상 경로 | 유형 |
|---|---|---|
| `page-landing.jsx` | `src/app/page.jsx` | 랜딩 (웹과 동일 구조) |
| `NavBar.jsx` | `src/components/NavBar.jsx` | 네비 + 인증 스켈레톤 |
| `Footer.jsx` | `src/components/Footer.jsx` | 네이비 풋터 |
| `Wireframe.jsx` | `src/components/Wireframe.jsx` | 스켈레톤 로더 |
| `login-page.jsx` | `src/app/login/page.jsx` | 🆕 이번에 새로 재디자인 |
| `signup-page.jsx` | `src/app/signup/page.jsx` | 🆕 이번에 새로 재디자인 |
| `jobs-page.jsx` | `src/app/jobs/page.jsx` | 🆕 이번에 새로 재디자인 |
| `my-jobs-page.jsx` | `src/app/my-jobs/page.jsx` | 🆕 이번에 새로 재디자인 |
| `my-contracts-page.jsx` | `src/app/my-contracts/page.jsx` | t() fix + 스켈레톤 |
| `contract-id-page.jsx` | `src/app/contract/[id]/page.jsx` | Hooks 수정 |
| `AddressSearch.jsx` | `src/components/AddressSearch.jsx` | 스크립트 로드 수정 |

### 🔧 수정본 (이전 대화부터)
| 파일 | 수정 내용 |
|---|---|
| `supabase.js` | 널 안전성 |
| `package.json` | TS 6.0.2 제거 |

---

## 🚀 적용 순서

### Phase 1: 기반 (필수, 5분)
```bash
cd ..
cp -r k-alba k-alba.backup-mckinsey

# 이 3개만 먼저 덮어쓰기
cp /path/to/fixes/globals.css  k-alba/src/app/globals.css
cp /path/to/fixes/theme.js     k-alba/src/lib/theme.js
cp /path/to/fixes/UI.jsx       k-alba/src/components/UI.jsx

cd k-alba
rm -rf node_modules .next
npm install
npm run dev
```
→ **앱 전체가 즉시 McKinsey 톤으로 변환**됨. 이모지·레이아웃은 그대로지만 색상·폰트·Shape이 완전히 바뀝니다.

### Phase 2: 공통 레이아웃 (권장)
```bash
cp /path/to/fixes/NavBar.jsx     k-alba/src/components/NavBar.jsx
cp /path/to/fixes/Footer.jsx     k-alba/src/components/Footer.jsx
cp /path/to/fixes/Wireframe.jsx  k-alba/src/components/Wireframe.jsx
cp /path/to/fixes/page-landing.jsx k-alba/src/app/page.jsx
```

### Phase 3: 주요 화면 (강력 권장)
```bash
cp /path/to/fixes/login-page.jsx        k-alba/src/app/login/page.jsx
cp /path/to/fixes/signup-page.jsx       k-alba/src/app/signup/page.jsx
cp /path/to/fixes/jobs-page.jsx         k-alba/src/app/jobs/page.jsx
cp /path/to/fixes/my-jobs-page.jsx      k-alba/src/app/my-jobs/page.jsx
cp /path/to/fixes/my-contracts-page.jsx k-alba/src/app/my-contracts/page.jsx
```

### Phase 4: 버그 수정 (전 작업에서 이어짐)
```bash
cp /path/to/fixes/supabase.js         k-alba/src/lib/supabase.js
cp /path/to/fixes/AddressSearch.jsx   k-alba/src/components/AddressSearch.jsx
cp /path/to/fixes/contract-id-page.jsx k-alba/src/app/contract/[id]/page.jsx
cp /path/to/fixes/package.json        k-alba/package.json
```

### Phase 5: 확인 및 배포
```bash
npm run dev  # 로컬 확인
npm run build  # 빌드 테스트
git add .
git commit -m "feat: McKinsey editorial redesign + web landing integration"
git push
```

---

## ✨ Before / After 주요 비교

### 랜딩 페이지
| | Before | After |
|---|---|---|
| 배경 | 크림 #FFFDFB | 흰색 #FFFFFF + 네이비 #0A1628 히어로 |
| 타이틀 | 그라데이션 민트 | 골드 `em` 강조 `260만 명` |
| CTA | 코랄 둥근 12px | 골드 샤프 4px |
| 시그니처 | (없음) | 3px 골드 상단 라인 |

### 로그인 페이지
| | Before | After |
|---|---|---|
| 구조 | 제목만 | **40x3 골드 라인 + "ACCOUNT · 로그인" 라벨** + 제목 |
| 카카오 버튼 | `#FEE500` + 14px radius | `#FEE500` + 4px radius (카카오 브랜드 유지) |
| 입력 | 2px 보더, 12px radius | 1px 보더, 4px radius |
| Primary | 코랄 | 네이비 #0A1628 (웹 랜딩 CTA와 동일) |

### 회원가입 Step 0 (역할 선택)
| | Before | After |
|---|---|---|
| 카드 | 중앙 이모지 + 제목 | **왼쪽 3px 색 테두리** (구직자 골드, 사장님 테라코타) |
| 제목 영역 | 그냥 H2 | 골드 라인 + `SIGN UP · 회원가입` 라벨 + H1 |
| 역할 구분 | 아이콘 기반 | **컬러 accent로 구분** |

### Jobs 리스트 (구직자 메인)
| | Before | After |
|---|---|---|
| 카드 스타일 | 흰 카드 + 14px radius | **에디토리얼 리스트** (넘버링 01, 02 + 하단 라인) |
| 비자 태그 | 연보라 파스텔 | **네이비 + 골드 텍스트** (에디토리얼 뱃지) |
| 급여 | 민트 #0BD8A2 | 테라코타 #C2512A (숫자 강조) |
| 챗봇 배너 | 카카오 노랑 | 네이비 + 좌측 3px 골드 |

### My-Jobs 대시보드 (사장님 메인)
| | Before | After |
|---|---|---|
| 알림 배너 | 카카오 노랑 | **네이비 + 좌측 3px 골드** (primary) |
| 계약서 배너 | 코랄 그라데이션 | **크림 + 좌측 3px 테라코타** (secondary) |
| 공고 카드 | 카드 쌓기 | **에디토리얼 리스트** (2px 네이비 상단 라인 + 넘버링) |

---

## 💡 에디토리얼 디자인 패턴 치트시트

앞으로 추가 페이지 만드실 때 이 패턴을 재사용하세요:

### 1. 페이지 헤더 (표준)
```jsx
<div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
<div style={{
  fontSize: 11, fontWeight: 700, color: T.ink3,
  letterSpacing: "0.08em", textTransform: "uppercase",
  marginBottom: 8,
}}>
  Section Name · 한글 설명
</div>
<h1 style={{
  fontSize: 28, fontWeight: 800, color: T.ink,
  letterSpacing: "-0.025em", marginBottom: 6, lineHeight: 1.25,
}}>
  페이지 제목
</h1>
<p style={{ color: T.ink2, fontSize: 14, lineHeight: 1.6 }}>
  부제목 설명
</p>
```

### 2. 강조 배너 (primary)
```jsx
<div style={{
  background: T.n9,  // 네이비
  color: T.paper,
  padding: "14px 16px",
  borderRadius: 4,
  borderLeft: `3px solid ${T.gold}`,  // 시그니처
  // ...
}}>
  <div style={{ fontWeight: 700, marginBottom: 2 }}>
    강조 메시지 <span style={{ color: T.gold }}>숫자</span>
  </div>
  <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
    보조 설명
  </div>
</div>
```

### 3. 보조 배너 (secondary)
```jsx
<div style={{
  background: T.cream,
  border: `1px solid ${T.border}`,
  borderLeft: `3px solid ${T.accent}`,  // 테라코타
  color: T.ink,
  // ...
}} />
```

### 4. 리스트 아이템 (에디토리얼)
```jsx
<div style={{
  padding: "18px 0",
  borderBottom: `1px solid ${T.border}`,
  display: "flex",
  gap: 16,
}}>
  <div style={{ minWidth: 24, fontSize: 12, color: T.ink3 }}>
    {String(idx + 1).padStart(2, "0")}
  </div>
  <div style={{ flex: 1 }}>{/* 본문 */}</div>
</div>
```

### 5. 숫자 강조
```jsx
<div style={{
  fontSize: 28, fontWeight: 800,
  color: T.accent,
  letterSpacing: "-0.025em",
  lineHeight: 1,
}}>
  73%
</div>
<div style={{ fontSize: 13, color: T.ink3, marginTop: 4 }}>
  설명 라벨
</div>
```

### 6. 비자/태그 뱃지 (네이비+골드)
```jsx
<span style={{
  padding: "2px 7px",
  borderRadius: 2,
  fontSize: 11,
  fontWeight: 700,
  background: T.n9,
  color: T.gold,
  letterSpacing: "0.02em",
}}>
  D-2
</span>
```

---

## 🎯 남은 페이지 (우선순위 순)

아래 페이지들은 **Phase 1의 자동 매핑**으로도 색상·폰트는 바뀌지만, 완전한 에디토리얼 톤을 원하시면 나중에 재디자인이 필요합니다:

1. **`/applicants`** — 지원자 관리 (사장님이 자주 봄)
2. **`/post-job`** — 공고 등록 (챗봇 UI, 부분 재디자인 필요)
3. **`/jobs/[id]`** — 공고 상세
4. **`/profile`** — 프로필
5. **`/chat`** — 채팅 목록 (카톡 UI는 그대로 유지 권장)
6. **`/my-applications`** — 내 지원
7. **`/contract/new`**, **`/contract/[id]`** — 계약서 (Form/Preview 탭)

"계속" 해주시면 다음 작업 순서로 진행하겠습니다.

---

## ⚠️ 중요 참고

### 카카오톡 브랜드 요소는 유지
- `/post-job`, `/applicants`, `/jobs/[id]`의 **카카오 챗봇 UI**는 카카오 노란색(#FEE500, #FFEB33, #B2C7D9 배경)과 둥근 말풍선 유지
- 이것은 카카오톡 연동 서비스임을 직관적으로 보여주는 **브랜드 시그널**이라서 유지가 맞습니다
- 주변의 페이지 껍데기만 McKinsey 톤으로 정리

### 이미 반영된 버그 수정 (이전 대화)
이번 zip에는 이전 대화의 모든 수정사항이 포함되어 있습니다:
- React Hooks 순서 위반 (contract/[id])
- 푸터 중복 (랜딩)
- package.json TS 6.0.2
- signUp 널 안전성
- NavBar pathname null
- AddressSearch Promise 무한 대기
- t() fallback (my-contracts)

### 테스트 체크리스트
```
[ ] 랜딩 /              → 네이비 히어로 + 골드 라인, "260만 명" em 골드
[ ] /login              → 40x3 골드 라인 + "ACCOUNT · 로그인" 라벨
[ ] /signup (Step 0)    → 카드 좌측 accent (구직자 골드, 사장님 테라코타)
[ ] /signup (Step 1)    → 사업자 인증 블록이 크림 + 좌측 골드 라인
[ ] /jobs               → 에디토리얼 리스트 01, 02 번호 + 비자 태그 네이비+골드
[ ] /my-jobs            → 알림 배너 네이비+골드, 공고 리스트 번호
[ ] Pretendard 폰트     → 모든 페이지에 적용
[ ] 입력/버튼           → border-radius 4px (샤프)
[ ] 전체 화면 밀림      → 스켈레톤으로 안정
```

---

## 📞 다음 단계 제안

1. **지금**: Phase 1~3 적용 후 로컬에서 확인
2. **빌드 OK면**: 바로 프로덕션 배포 (주요 화면 커버)
3. **"계속" 요청 시**: `/applicants`, `/post-job`, 계약서 페이지 재디자인
4. **최종 단계**: 웹 랜딩 페이지를 Next.js로 포팅 → `/about` 또는 SEO용 랜딩으로 편입

---

**작성**: Claude (Anthropic)
