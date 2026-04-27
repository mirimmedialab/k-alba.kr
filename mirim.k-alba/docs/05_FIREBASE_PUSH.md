# Firebase Cloud Messaging (FCM) 설정 가이드

K-ALBA 하이브리드 앱의 푸시 알림은 Firebase Cloud Messaging(FCM)을 사용합니다.
Android는 FCM 네이티브, iOS는 FCM이 APNs로 중계합니다.

---

## 🎯 개요

```
새 공고 등록
    ↓
Next.js API (/api/notifications/notify-nearby-job)
    ↓
Supabase: 반경 내 구독자 + 토큰 조회
    ↓
FCM HTTP API 호출
    ↓
  ├─ Android: FCM → 기기
  └─ iOS: FCM → APNs → 기기
    ↓
기기에서 푸시 알림 수신 + Capacitor 리스너가 앱에 전달
```

---

## 📋 1단계: Firebase 프로젝트 생성

### 1.1 프로젝트 만들기

1. https://console.firebase.google.com 접속 → 로그인
2. **프로젝트 추가**
   - 이름: `K-ALBA`
   - 구글 애널리틱스: 해제 (선택, 필요하면 활성화)
3. 생성 완료

### 1.2 앱 등록 (Android + iOS)

프로젝트 개요 → **앱 추가**

**Android 앱 등록**
- 패키지 이름: `kr.co.mirimmedialab.kalba` (Capacitor의 appId와 동일)
- 앱 닉네임: `K-ALBA Android`
- 디버그 서명 인증서 SHA-1: (나중에 추가 가능)
- `google-services.json` 다운로드 → 저장

**iOS 앱 등록**
- 번들 ID: `kr.co.mirimmedialab.kalba`
- 앱 닉네임: `K-ALBA iOS`
- `GoogleService-Info.plist` 다운로드 → 저장

---

## 📋 2단계: Capacitor 프로젝트에 Firebase 설정 파일 배치

### 2.1 Android

```bash
cp /path/to/downloads/google-services.json \
   android/app/google-services.json
```

`android/build.gradle` (프로젝트 수준) 에서 확인:
```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

`android/app/build.gradle` (앱 수준) 맨 아래에 추가:
```gradle
apply plugin: 'com.google.gms.google-services'
```

### 2.2 iOS

```bash
cp /path/to/downloads/GoogleService-Info.plist \
   ios/App/App/GoogleService-Info.plist
```

Xcode에서 열기:
```bash
npx cap open ios
```

Xcode 탐색기에서 `App` 그룹 → 우클릭 → **Add Files to "App"...** → `GoogleService-Info.plist` 선택 → "Copy items if needed" 체크

**APNs 인증 키 설정** (iOS 푸시 필수):
1. Apple Developer → Keys → Create a Key → APNs 체크 → Download `.p8` 파일
2. Firebase Console → 프로젝트 설정 → 클라우드 메시징 → 애플 앱 구성 → APNs 인증 키 업로드

---

## 📋 3단계: Capacitor 설정 업데이트

`capacitor.config.ts` 에 이미 PushNotifications 플러그인이 포함되어 있습니다. 추가 확인:

```typescript
plugins: {
  PushNotifications: {
    presentationOptions: ["badge", "sound", "alert"],
  },
}
```

### 3.1 Capacitor 동기화

```bash
npx cap sync
```

---

## 📋 4단계: 서버 키 확보 (Vercel 환경변수)

Firebase Console → **프로젝트 설정** → **클라우드 메시징**

두 가지 방식 중 하나 선택:

### 방식 A: Legacy HTTP API (간단) — 이번 구현에 사용
- **서버 키** 섹션에서 키 복사
- 주의: Legacy API는 2024년 6월 지원 중단 예정 → 장기 프로덕션은 v1 API 권장

**Vercel 환경변수**:
```
FIREBASE_SERVER_KEY=AAAAxxxxxxx:APA91bHxxxxxxx...
```

### 방식 B: HTTP v1 API (권장, 장기 유지)
- **서비스 계정** 탭 → "새 비공개 키 생성" → JSON 다운로드
- JSON 파일 내용을 base64 인코딩해서 환경변수로 저장

```bash
# base64 인코딩
cat service-account.json | base64 -w 0
```

**Vercel 환경변수**:
```
FIREBASE_SERVICE_ACCOUNT_BASE64=eyJ0eXBlIjoic2Vydmlj...
```

이 경우 `notify-nearby-job-route.ts`에서 HTTP v1 엔드포인트로 수정 필요
(현재 구현은 Legacy HTTP 기반, v1은 OAuth2 인증 추가 필요).

---

## 📋 5단계: iOS 푸시 권한 사전 설정

Xcode에서 프로젝트 열고 **Signing & Capabilities** 탭:

1. **+ Capability** 클릭
2. **Push Notifications** 추가
3. **Background Modes** 추가 → "Remote notifications" 체크

`ios/App/App/Info.plist` 에 이미 있지 않으면 추가:
```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>
```

---

## 📋 6단계: Supabase 마이그레이션 실행

SQL Editor에서 실행:
```
migration-push-notifications.sql
```

검증:
```sql
-- 테이블 확인
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('push_tokens', 'notifications', 'notification_preferences');

-- 함수 확인
SELECT proname FROM pg_proc WHERE proname = 'find_users_to_notify_for_job';
```

---

## 📋 7단계: 테스트

### 7.1 로컬 테스트 (웹)

```bash
npm run dev
```

로그인 후 브라우저 콘솔에서:
```javascript
Notification.requestPermission().then(p => console.log(p));
// "granted" 확인
```

알림은 웹에서는 VAPID 기반 Web Push가 따로 필요하므로, 이 구현은 주로 네이티브 앱용입니다.

### 7.2 실기기 테스트 (Android)

```bash
npm run build
npx cap sync android
npx cap open android
# Android Studio → Run → 실기기에 앱 설치
```

실기기에서 앱 첫 실행 → 알림 권한 팝업 → "허용"
→ Supabase `push_tokens` 테이블에 토큰 저장 확인

### 7.3 수동 푸시 테스트

Firebase Console → Messaging → **첫 번째 캠페인 만들기** → 테스트 메시지
→ 저장된 FCM 토큰 입력 → 전송

### 7.4 엔드투엔드 테스트

1. 사용자 A: 프로필에 거주지 등록 + 푸시 허용
2. 사용자 B (사장님): A의 거주지 반경 10km 내에 공고 등록
3. 사용자 A 기기에 푸시 도착 확인
4. 알림 탭 → 공고 상세로 이동 확인

---

## 🔧 문제 해결

### 토큰이 발급되지 않음
- `google-services.json` / `GoogleService-Info.plist` 배치 확인
- `npx cap sync` 재실행
- Android: `android/app/build.gradle` 에 google-services 플러그인 적용 확인
- iOS: Xcode에서 Signing & Capabilities → Push Notifications 추가 확인

### 푸시가 도착하지 않음 (Android)
- FCM 서버 키 환경변수 확인 (Vercel + Firebase 일치)
- `push_tokens` 테이블에 토큰 저장됐는지 확인
- Firebase Console → 메시지 로그에서 전송 이력 확인

### 푸시가 도착하지 않음 (iOS)
- APNs 인증 키 Firebase에 업로드 확인
- 번들 ID 일치 확인
- 실기기 필수 (시뮬레이터에서는 푸시 안 옴)
- 설정 → K-ALBA → 알림 허용 확인

### 배터리 절약 모드 문제
- Android 제조사(삼성/샤오미 등)의 배터리 최적화에서 K-ALBA 제외 필요
- 사용자에게 "알림이 안 오면 배터리 설정 확인" 가이드 제공

---

## 💰 비용

Firebase Cloud Messaging은 **완전 무료**입니다.
- 메시지 수 무제한
- 토픽 무제한
- 멀티캐스트 무제한

Blaze 플랜(유료)으로 업그레이드 필요하지 않음.

---

## 🔜 추가 기능 (향후)

### 알림 유형 확장
`notifications.type` 필드를 활용한 다양한 알림:
- `new_nearby_job` — 근처 새 공고 (구현됨)
- `application_accepted` — 합격 알림
- `chat_message` — 채팅 수신
- `contract_request` — 계약서 요청
- `work_reminder` — 출근 알림 (근무 시작 1시간 전)

### 토픽 기반 구독
비자 유형별 토픽:
```javascript
Push.subscribe({ topic: "visa_D2" });
```
특정 비자에게만 푸시 가능 (예: E-9 전용 농업 공고).

### 스케줄 푸시
`quiet_hours_start~end` 사이에는 발송 유보하고, 아침에 몰아서 전송.

### 다국어 푸시
사용자 `profile.preferred_language` 기반으로 제목/본문 번역.

---

**작성**: Claude (Anthropic)
**관련 파일**:
- `src/lib/pushNotifications.ts`
- `src/components/NotificationBell.tsx`
- `src/app/api/notifications/notify-nearby-job/route.ts`
- `migration-push-notifications.sql`
