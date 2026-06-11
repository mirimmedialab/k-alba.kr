# 화면 밀림 해결 가이드 — 나머지 페이지 패치

이미 `my-contracts/page.jsx`는 스켈레톤 적용된 전체 파일을 드렸습니다.
아래 7개 페이지는 **각 2줄씩만** 바꾸면 됩니다.

---

## 공통 패턴

**변경 전**:
```jsx
if (loading) return <div style={{ padding: 40, textAlign: "center" }}>로딩 중...</div>;
```

**변경 후**:
```jsx
if (loading) return <SomeSkel ... />;
```

그리고 파일 상단 `import` 추가:
```jsx
import { ListPageSkel, FormPageSkel, ChatListSkel, ContractDetailSkel } from "@/components/Wireframe";
```

---

## 1️⃣ `src/app/my-applications/page.jsx`

**import 추가** (파일 상단):
```jsx
import { ListPageSkel } from "@/components/Wireframe";
```

**32번째 줄 교체**:
```jsx
// BEFORE
if (loading) return <div style={{ padding: 40, textAlign: "center" }}>로딩 중...</div>;

// AFTER
if (loading) return <ListPageSkel maxWidth={600} rows={3} />;
```

---

## 2️⃣ `src/app/my-jobs/page.jsx`

**import 추가**:
```jsx
import { ListPageSkel } from "@/components/Wireframe";
```

**77번째 줄 교체**:
```jsx
// BEFORE
if (loading) return <div style={{ padding: 40, textAlign: "center" }}>로딩 중...</div>;

// AFTER
if (loading) return <ListPageSkel maxWidth={700} showAction rows={3} />;
```

---

## 3️⃣ `src/app/applicants/page.jsx`

**import 추가**:
```jsx
import { ListPageSkel } from "@/components/Wireframe";
```

**143번째 줄 교체**:
```jsx
// BEFORE
if (loading) return <div style={{ padding: 40, textAlign: "center" }}>로딩 중...</div>;

// AFTER
if (loading) return <ListPageSkel maxWidth={700} rows={3} />;
```

---

## 4️⃣ `src/app/profile/page.jsx`

**import 추가**:
```jsx
import { FormPageSkel } from "@/components/Wireframe";
```

**81번째 줄 교체**:
```jsx
// BEFORE
if (!user) return <div style={{ padding: 40, textAlign: "center" }}>로딩 중...</div>;

// AFTER
if (!user) return <FormPageSkel maxWidth={600} fields={5} />;
```

---

## 5️⃣ `src/app/chat/page.jsx`

**import 추가**:
```jsx
import { ChatListSkel } from "@/components/Wireframe";
```

**92번째 줄 교체**:
```jsx
// BEFORE
if (!user) return <div style={{ padding: 40, textAlign: "center" }}>로딩 중...</div>;

// AFTER
if (!user) return <ChatListSkel rows={3} />;
```

---

## 6️⃣ `src/app/contract/new/page.jsx`

**import 추가**:
```jsx
import { FormPageSkel } from "@/components/Wireframe";
```

**73번째 줄 교체**:
```jsx
// BEFORE
if (!user) return <div style={{ padding: 40, textAlign: "center" }}>로딩 중...</div>;

// AFTER
if (!user) return <FormPageSkel maxWidth={600} fields={3} />;
```

---

## 7️⃣ `src/app/contract/[id]/page.jsx`

**주의**: 이 파일은 이미 드린 수정본(`contract-id-page.jsx`)이 있습니다. 그 수정본에 추가로 아래 2줄을 바꿔주세요.

**import 추가**:
```jsx
import { ContractDetailSkel } from "@/components/Wireframe";
```

**157번째 줄 교체**:
```jsx
// BEFORE
if (loading) return <div style={{ padding: 40, textAlign: "center" }}>로딩 중...</div>;

// AFTER
if (loading) return <ContractDetailSkel />;
```

(158~168줄의 `if (!contract) return ...` 블록은 그대로 두세요 — 실제 에러 케이스입니다.)

---

## 📁 적용 파일 요약

| 새 파일 | 경로 |
|---|---|
| `Wireframe.jsx` | `src/components/Wireframe.jsx` |
| `globals.css` | `src/app/globals.css` (덮어쓰기 — shimmer keyframe 추가됨) |
| `NavBar.jsx` | `src/components/NavBar.jsx` (덮어쓰기 — authChecked 추가) |
| `my-contracts-page.jsx` | `src/app/my-contracts/page.jsx` (덮어쓰기) |

| 수동 패치 (2줄씩) |
|---|
| `src/app/my-applications/page.jsx` |
| `src/app/my-jobs/page.jsx` |
| `src/app/applicants/page.jsx` |
| `src/app/profile/page.jsx` |
| `src/app/chat/page.jsx` |
| `src/app/contract/new/page.jsx` |
| `src/app/contract/[id]/page.jsx` |

---

## ✅ 효과

**Before (화면 밀림)**:
```
[페이지 진입]
  ↓
"로딩 중..." (작은 센터 텍스트, 높이 ~40px)
  ↓  (200~500ms 뒤)
실제 콘텐츠 (헤더 + 카드 여러 개, 높이 ~800px)
  ↓
❌ 갑자기 스크롤 · 푸터 위치 이동 · 사용자 혼란
```

**After (화면 안정)**:
```
[페이지 진입]
  ↓
스켈레톤 (최종 콘텐츠와 같은 shape, 같은 높이 ~800px)
  ↓  (200~500ms 뒤)
실제 콘텐츠 (같은 shape · 같은 위치)
  ↓
✅ 레이아웃 변화 없음 · 부드러운 전환
```

**NavBar도 마찬가지**: 로그인/회원가입 버튼 ↔ 네비 링크 교체로 인한 폭 변화 → 스켈레톤으로 고정 폭 유지.

---

## 🧪 테스트 방법

1. 브라우저 DevTools → Network → Throttling을 "Slow 3G"로 설정
2. 로그인 상태로 `/my-contracts`, `/my-jobs`, `/profile` 등 방문
3. 로딩 중 화면이 밀리지 않고 스켈레톤만 표시되는지 확인
4. Throttling 해제 후에도 깜빡임 없이 자연스럽게 전환되는지 확인
