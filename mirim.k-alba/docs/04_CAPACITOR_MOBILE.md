# K-ALBA Capacitor 하이브리드 앱 개발 가이드

**작성일**: 2026-04-24
**대상**: 남기환 대표

이 문서는 K-ALBA를 **iOS/Android 하이브리드 앱**으로 만들어 앱스토어에 배포하는 전체 과정을 안내합니다.

---

## 📋 작업 개요

| 단계 | 내용 | 예상 소요 |
|---|---|---|
| 1 | Capacitor 패키지 설치 | 5분 |
| 2 | iOS/Android 프로젝트 초기화 | 10분 |
| 3 | 위치 서비스 DB 마이그레이션 | 5분 |
| 4 | Kakao Developers 앱 등록 | 20분 |
| 5 | 로컬 개발 환경 테스트 | 30분 |
| 6 | 앱스토어 준비 (아이콘, 권한 메시지) | 1~2시간 |
| 7 | 빌드 & 배포 | 반나절 |

**총 예상**: 하루 (개발 환경 준비 포함)

---

## 📦 이번에 제공한 파일 (10개)

| 파일 | 대상 경로 | 설명 |
|---|---|---|
| `capacitor.config.ts` | 프로젝트 루트 | Capacitor 메인 설정 |
| `package.json` | 프로젝트 루트 | Capacitor 의존성 추가 |
| `next.config.js` | 프로젝트 루트 | Capacitor 호환 |
| `geolocation.ts` | `src/lib/geolocation.ts` | 네이티브/웹 공용 위치 API |
| `useNearbyJobs.js` | `src/lib/useNearbyJobs.js` | 거리 기반 공고 조회 훅 |
| `geocode-route.js` | `src/app/api/geocode/address/route.js` | Kakao 지오코딩 API 프록시 |
| `jobs-page.jsx` | `src/app/jobs/page.jsx` | 거리 정렬이 추가된 공고 목록 |
| `migration-geolocation.sql` | Supabase SQL Editor | PostGIS 스키마 |
| `CAPACITOR_SETUP.md` | 문서 | 이 가이드 |
| `LOCATION_SERVICE_DESIGN.md` | 문서 | 전체 설계 (이전 제공) |

---

## STEP 1: Capacitor 패키지 설치

```bash
cd k-alba

# 기존 package.json 백업 후 새 파일 덮어쓰기
cp package.json package.json.backup
cp /path/to/fixes/package.json ./package.json

# 의존성 설치
rm -rf node_modules .next
npm install
```

설치 확인:
```bash
npx cap --version    # 6.x.x 출력되어야 함
```

---

## STEP 2: iOS/Android 프로젝트 초기화

```bash
# capacitor.config.ts 복사
cp /path/to/fixes/capacitor.config.ts ./capacitor.config.ts

# Next.js 빌드 먼저 (capacitor.config.ts의 webDir='out' 기반)
npm run build

# iOS 프로젝트 추가 (macOS에서만 가능)
npx cap add ios

# Android 프로젝트 추가
npx cap add android

# 변경사항 동기화
npx cap sync
```

실행 후 프로젝트 루트에 다음 폴더가 생깁니다:
- `ios/` — Xcode로 열 수 있는 iOS 프로젝트
- `android/` — Android Studio로 열 수 있는 Android 프로젝트

**주의**: 이 폴더들은 git에 포함해야 합니다 (단, `.gitignore`에 `node_modules`, `DerivedData` 등은 제외).

---

## STEP 3: Supabase DB 마이그레이션

1. Supabase 대시보드 접속
2. **Database → Backups → Create backup** (필수!)
3. **SQL Editor** 열기
4. `migration-geolocation.sql` 내용 붙여넣기 → **Run**
5. 검증:

```sql
-- PostGIS 활성화 확인
SELECT postgis_version();

-- jobs 테이블 컬럼 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'jobs'
  AND column_name IN ('latitude', 'longitude', 'geog', 'sigungu', 'provides_housing');

-- RPC 함수 테스트 (강남역 반경 5km)
SELECT id, title, distance_km
FROM jobs_nearby(37.4979, 127.0276, 5, NULL, 5);
```

---

## STEP 4: Kakao Developers 앱 등록

**무료 API 키 발급** (지오코딩 필수):

1. https://developers.kakao.com → 로그인
2. **내 애플리케이션 → 애플리케이션 추가**
   - 앱 이름: `K-ALBA`
   - 회사: `미림미디어랩 주식회사`
3. 생성된 앱 → **앱 키** 탭
4. **REST API 키** 복사 (예: `a1b2c3d4e5f6...`)
5. **플랫폼** 탭 → **Web 플랫폼 등록**
   - 사이트 도메인: `https://k-alba.kr`
6. **카카오 로그인 → 활성화** (이미 하셨으면 생략)

**Vercel 환경변수 추가**:
```
KAKAO_REST_API_KEY=여기에_복사한_키
```

Vercel Dashboard → Project → Settings → Environment Variables → Add → Redeploy

**로컬 `.env.local`에도 추가**:
```
KAKAO_REST_API_KEY=여기에_복사한_키
```

---

## STEP 5: 앱 파일 배치 및 로컬 테스트

```bash
# 새 파일들 복사
cp /path/to/fixes/geolocation.ts          src/lib/geolocation.ts
cp /path/to/fixes/useNearbyJobs.js        src/lib/useNearbyJobs.js

# API 라우트 (폴더 없으면 생성)
mkdir -p src/app/api/geocode/address
cp /path/to/fixes/geocode-route.js        src/app/api/geocode/address/route.js

# jobs 페이지 덮어쓰기
cp /path/to/fixes/jobs-page.jsx           src/app/jobs/page.jsx

# Next.js 설정
cp /path/to/fixes/next.config.js          next.config.js
```

**웹 먼저 테스트**:
```bash
npm run dev
```
브라우저 → http://localhost:3000/jobs → 위치 권한 팝업 확인

**Capacitor 동기화**:
```bash
npm run build
npx cap sync
```

**iOS 시뮬레이터 실행** (macOS):
```bash
npx cap open ios
# Xcode 열림 → 상단 시뮬레이터 선택 → 재생(▶) 클릭
# 시뮬레이터에서 Features → Location → Apple 로 테스트 위치 설정
```

**Android 에뮬레이터 실행**:
```bash
npx cap open android
# Android Studio 열림 → Run 클릭
# 에뮬레이터 → Extended Controls → Location 으로 테스트 좌표 설정
```

---

## STEP 6: 앱스토어 준비

### 6.1 앱 아이콘 생성

1024x1024 PNG 이미지 준비 후 변환:

```bash
npm install -D @capacitor/assets
npx capacitor-assets generate \
  --iconBackgroundColor '#0A1628' \
  --iconForeground 'resources/icon.png' \
  --splashBackgroundColor '#0A1628'
```

추천: K-ALBA 로고를 **네이비 배경(#0A1628)**에 **골드(#B8944A)** 로고로 — McKinsey 디자인 언어 유지.

### 6.2 iOS 권한 메시지 (Info.plist)

Xcode로 `ios/App/App/Info.plist` 열어서 추가:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>근처 알바 공고를 찾고, 우리 집에서 얼마나 걸리는지 알려드리기 위해 위치 정보가 필요합니다.</string>

<key>NSCameraUsageDescription</key>
<string>사업자등록증이나 프로필 사진을 등록하기 위해 카메라를 사용합니다.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>프로필 사진이나 필요한 서류 이미지를 선택하기 위해 사진 라이브러리에 접근합니다.</string>
```

### 6.3 Android 권한 메시지 (string.xml)

`android/app/src/main/res/values/strings.xml`에 이미 있는 내용 유지, 다국어는 별도 `values-en/`, `values-vi/` 등 폴더 생성.

`AndroidManifest.xml` 권한 확인:
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
```

### 6.4 앱스토어 심사 대비

**iOS App Store**:
- Apple Developer 계정 필요 ($99/년)
- Xcode → Archive → Distribute App → App Store Connect
- 심사 기간: 2~7일

**Google Play Store**:
- Google Play Console 계정 필요 (최초 $25)
- Android Studio → Build → Generate Signed App Bundle
- 심사 기간: 1~3일

---

## STEP 7: 빌드 & 배포

### 7.1 개발 중 (웹 업데이트만)

```bash
# Next.js 웹 수정
npm run dev  # 확인 후

# Vercel에 푸시
git push

# 앱은 자동으로 최신 웹을 로드 (capacitor.config.ts의 server.url 때문)
# 앱 재빌드 불필요!
```

### 7.2 네이티브 기능 추가 시 (플러그인 업데이트 등)

```bash
# 웹 빌드
npm run build

# iOS 재빌드
npm run cap:build:ios
# Xcode → Archive → 앱스토어 제출

# Android 재빌드
npm run cap:build:android
# Android Studio → Build → Bundle → Play Console 제출
```

### 7.3 배포 체크리스트

- [ ] `capacitor.config.ts`의 `server.url`이 실제 프로덕션 URL로 설정
- [ ] `webContentsDebuggingEnabled: false` 확인
- [ ] Kakao REST API 키가 Vercel 환경변수에 등록
- [ ] Supabase DB 마이그레이션 실행
- [ ] 아이콘/스플래시 스크린 생성
- [ ] 위치 권한 메시지 7개 언어로 준비 (Info.plist + strings.xml)
- [ ] 실제 기기에서 GPS 테스트
- [ ] 카카오 로그인이 앱에서도 동작하는지 확인 (redirect URL 주의)

---

## ⚠️ 주의사항

### 1. **Server Mode의 트레이드오프**
- ✅ 장점: 웹 업데이트 즉시 반영, 앱스토어 재심사 불필요
- ⚠️ 단점: 오프라인에서 완전히 동작 안 함 (초기 로드 이후 캐시는 됨)
- 해결: 추후 필요 시 `CapacitorHttp`, Service Worker 등으로 오프라인 지원 추가

### 2. **카카오 로그인의 앱 Redirect URL**
카카오 OAuth는 앱에서 동작 시 `kakao{APP_KEY}://` 커스텀 스킴 필요. 현재 웹 기반이므로 일단 HTTPS로 동작. 추후 **네이티브 카카오 로그인 SDK**로 전환 검토 (`@capacitor-community/kakao-login` 등).

### 3. **Vercel 도메인 vs 앱 내부 WebView**
Vercel에 배포한 `k-alba.kr`을 앱 WebView로 로드 — 결제/로그인 시 CSRF, CORS 설정 주의.

### 4. **위치 권한 거부 후 복구**
사용자가 한 번 거부하면 시스템 설정으로 가서 직접 허용해야 함. 앱 내에 **"설정으로 이동"** 버튼 제공 필요 (차후 UI 개선).

### 5. **외국인 사용자 권한 메시지는 7개 언어로 필수**
iOS는 `Info.plist`의 `InfoPlist.strings` 파일로 다국어 지원:
```
ios/App/App/ko.lproj/InfoPlist.strings
ios/App/App/en.lproj/InfoPlist.strings
ios/App/App/vi.lproj/InfoPlist.strings
...
```

---

## 🔜 다음 단계 (선택)

### 즉시 적용 가능
- [x] 위치 권한 요청 흐름
- [x] 거리 기반 공고 정렬
- [x] `/jobs` 페이지 위치 배너
- [ ] 프로필 페이지에 거주지 설정 UI
- [ ] 공고 상세에 지도 + 경로 표시
- [ ] 사장님 공고 등록 시 자동 지오코딩

### 중기
- [ ] `/jobs/map` 지도 탐색 뷰 (Kakao/Naver Map JS SDK)
- [ ] Kakao Mobility API로 이동수단별 경로 (자동차/대중교통/도보/자전거)
- [ ] 막차 시간 체크 (야간 알바)
- [ ] 푸시 알림 (근처 신규 공고)

### 장기
- [ ] 오프라인 모드 (Service Worker)
- [ ] 네이티브 카카오 로그인 SDK
- [ ] 앱 내 결제 (iOS IAP / Google Play Billing) — 프리미엄 구독용

---

## 💡 참고 링크

- [Capacitor 공식 문서](https://capacitorjs.com/docs)
- [Capacitor Geolocation](https://capacitorjs.com/docs/apis/geolocation)
- [Kakao Local API](https://developers.kakao.com/docs/latest/ko/local/dev-guide)
- [Supabase + PostGIS](https://supabase.com/docs/guides/database/extensions/postgis)
- [Next.js + Capacitor 샘플](https://github.com/ionic-team/capacitor-starter-nextjs)

---

**작성**: Claude (Anthropic)
**문의**: 이 문서에 나온 단계 중 어느 부분이든 막히시면 바로 알려주세요
