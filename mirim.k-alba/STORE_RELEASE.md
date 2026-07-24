# K-ALBA 구글 플레이 출시 가이드 (2026-07-24)

앱: Capacitor Android (Server Mode → https://www.k-alba.kr 로드)
applicationId: `kr.co.mirimmedialab.kalba` · versionCode 1 · versionName 1.0 · targetSdk 35 ✅

---

## 1. 출시 체크리스트

### 준비 (1회)
- [ ] Google Play Console 개발자 계정 생성 — https://play.google.com/console ($25 1회)
  - **개인 계정**: D-U-N-S 불필요, 신분·주소 증빙(90일 이내 공공요금 청구서/카드·은행 명세서/임대계약서)으로 본인 확인
  - **조직(법인) 계정**: **D-U-N-S 번호 필수** (한국D&B에서 발급, 표준 무료·최대 30일 소요. 기존 보유 여부 먼저 조회) + 법인 정보·담당자 연락처 검증
- [ ] 업로드 키 생성 (아래 §4) — **키스토어 파일·비밀번호는 절대 분실 금지, 리포에 커밋 금지**
- [ ] Play App Signing 사용 (기본값 — 구글이 서명키 관리)

### 앱 만들기
- [ ] Play Console → 앱 만들기 → 이름 `K-ALBA`, 기본 언어 한국어, 앱(무료)
- [ ] AAB 빌드 & 업로드 (§4)
- [ ] 스토어 등록정보 입력 (§2) — 언어별 번역 추가 (en, vi, zh-CN, ja, uz, mn)
- [ ] 그래픽: 앱 아이콘 512×512, 피처 그래픽 1024×500, 휴대전화 스크린샷 최소 2장(권장 4~8장: 공고 목록·비자 챗봇·계약서·확인서)
- [ ] 개인정보처리방침 URL: `https://www.k-alba.kr/privacy`

### 설문 (앱 콘텐츠)
- [ ] 데이터 안전 (§3 답변 그대로)
- [ ] 콘텐츠 등급: 설문 → 유틸리티/생산성 계열, 폭력·도박 등 전부 '아니오' → 전체이용가 예상
- [ ] 타겟층: 18세 이상 (구인구직 서비스)
- [ ] 광고 포함 여부: 아니오
- [ ] 뉴스 앱: 아니오 / 정부 앱: 아니오
- [ ] 로그인 필요 앱이므로 **심사용 테스트 계정 제공**: qa-worker-test@k-alba.kr / qa-boss-test@k-alba.kr (심사 제출 전에 비밀번호를 새로 설정해 입력)

### 출시
- [ ] 내부 테스트 트랙에 먼저 업로드 → 본인 기기 설치 확인
- [ ] 프로덕션 트랙 → 국가: 대한민국 (+ 필요 시 전체) → 검토 제출 (보통 1~7일)

---

## 2. 스토어 등록정보 (복사용)

### 한국어 (기본)
**앱 이름**: K-ALBA - 외국인 유학생 알바
**짧은 설명(80자)**: 외국인·유학생 알바 매칭! 비자별 취업가능 확인, 7개 언어 지원, 근로계약까지 한 번에
**전체 설명**:
```
K-ALBA(케이알바)는 한국에서 일자리를 찾는 외국인과 유학생을 위한 알바 매칭 플랫폼입니다.

🌏 7개 언어 지원
한국어·English·Tiếng Việt·中文·日本語·Oʻzbek·Монгол — 모국어로 편하게 이용하세요.

🛂 비자별 취업 가능 여부 확인
D-2 유학생부터 F-4 동포까지, 내 비자로 어떤 알바가 가능한지 챗봇에게 바로 물어보세요. 업종별 필요 서류(건강진단결과서 등)까지 알려드립니다.

📍 내 주변 알바 찾기
집·학교 근처의 알바를 거리순으로 추천받고, 지도로 한눈에 확인하세요.

📄 표준근로계약서 전자서명
고용노동부 표준 서식으로 계약서를 작성하고 앱에서 바로 전자서명. 계약 내용은 안전하게 보관됩니다.

🎓 유학생 시간제취업 서류 자동 작성
시간제취업 확인서 등 출입국 서류를 자동으로 채워드려요. 학교 국제처 제출까지 한 번에.

🔒 개인정보 보호
외국인등록번호 등 민감정보는 암호화된 별도 저장소에 본인만 접근 가능하게 보관됩니다.

문의: @kalba 카카오톡 채널
```

### English
**Title**: K-ALBA - Part-time Jobs in Korea
**Short**: Part-time job matching for international students & foreigners in Korea. 7 languages.
**Full**:
```
K-ALBA is a part-time job matching platform for foreigners and international students in Korea.

🌏 7 languages — Korean, English, Vietnamese, Chinese, Japanese, Uzbek, Mongolian.
🛂 Visa checker — Ask the chatbot which jobs your visa (D-2, D-4, F-4...) allows, plus required documents.
📍 Jobs near you — recommendations by distance from your home or school.
📄 E-sign standard labor contracts right in the app.
🎓 Auto-filled part-time work permit documents for international students.
🔒 Your sensitive data (ARC number etc.) is stored securely with owner-only access.
```

### Tiếng Việt
**Title**: K-ALBA - Việc làm thêm tại Hàn Quốc
**Short**: Tìm việc làm thêm cho du học sinh & người nước ngoài tại Hàn. Hỗ trợ 7 ngôn ngữ.
**Full**:
```
K-ALBA là nền tảng kết nối việc làm thêm cho người nước ngoài và du học sinh tại Hàn Quốc.

🌏 7 ngôn ngữ (có tiếng Việt!) · 🛂 Kiểm tra visa được làm việc gì + giấy tờ cần thiết · 📍 Việc gần nhà/trường · 📄 Ký hợp đồng lao động điện tử · 🎓 Tự động điền hồ sơ làm thêm cho du học sinh · 🔒 Bảo mật thông tin cá nhân.
```

### 中文 (简体)
**Title**: K-ALBA - 韩国留学生兼职
**Short**: 外国人·留学生兼职匹配平台，签证可否查询，支持7种语言，电子劳动合同。
**Full**:
```
K-ALBA是面向在韩外国人和留学生的兼职匹配平台。

🌏 支持7种语言（含中文）· 🛂 查询您的签证可做哪些工作及所需材料 · 📍 按距离推荐家/学校附近的兼职 · 📄 标准劳动合同电子签名 · 🎓 留学生打工许可材料自动填写 · 🔒 个人敏感信息安全保管。
```

### 日本語
**Title**: K-ALBA - 韓国留学生バイト
**Short**: 外国人・留学生向けバイトマッチング。ビザ別就労可否、7言語対応、電子労働契約。
**Full**:
```
K-ALBAは韓国在住の外国人・留学生向けのアルバイトマッチングプラットフォームです。

🌏 7言語対応（日本語あり）· 🛂 ビザ別の就労可否と必要書類をチャットボットで確認 · 📍 自宅・学校近くのバイトを距離順で · 📄 標準労働契約書に電子署名 · 🎓 留学生の資格外活動書類を自動作成 · 🔒 個人情報は安全に保管。
```

### Oʻzbek
**Title**: K-ALBA - Koreyada ish topish
**Short**: Chet elliklar va talabalar uchun ish topish. Viza tekshiruvi, 7 til, elektron shartnoma.
**Full**:
```
K-ALBA — Koreyadagi chet elliklar va talabalar uchun yarim stavka ish topish platformasi.

🌏 7 til (oʻzbek tili bor!) · 🛂 Vizangiz qaysi ishlarga ruxsat berishini chatbotdan soʻrang · 📍 Uy/universitet yaqinidagi ishlar · 📄 Mehnat shartnomasini elektron imzolash · 🎓 Talabalar uchun hujjatlarni avtomatik toʻldirish · 🔒 Shaxsiy maʼlumotlar xavfsiz saqlanadi.
```

### Монгол
**Title**: K-ALBA - Солонгост ажил хайх
**Short**: Гадаад иргэд, оюутнуудад цагийн ажил. Визний шалгалт, 7 хэл, цахим гэрээ.
**Full**:
```
K-ALBA — Солонгос дахь гадаад иргэд, оюутнуудад зориулсан цагийн ажлын платформ.

🌏 7 хэл (монгол хэлтэй!) · 🛂 Таны визээр ямар ажил хийж болохыг чатботоос асуу · 📍 Гэр/сургуулийн ойролцоох ажлууд · 📄 Хөдөлмөрийн гэрээнд цахим гарын үсэг · 🎓 Оюутны бичиг баримтыг автоматаар бөглөнө · 🔒 Хувийн мэдээлэл аюулгүй хадгалагдана.
```

---

## 3. 데이터 안전(Data Safety) 섹션 답변

**수집 여부**: 예 / **암호화 전송**: 예(HTTPS) / **삭제 요청 가능**: 예(계정 탈퇴 기능 있음)

| 항목 | 수집 | 공유 | 용도 |
|---|---|---|---|
| 이름 | ✅ | ❌ | 계정 관리, 계약서 작성 |
| 이메일 | ✅ | ❌ | 계정 관리 |
| 전화번호 | ✅ | ❌ | 계약 당사자 연락, 알림톡 |
| 주소 (거주지) | ✅ (선택) | ❌ | 주변 알바 추천 |
| 대략적/정확한 위치 | ✅ (선택, 권한 동의 시) | ❌ | 거리순 추천 |
| 기타 개인정보 (외국인등록번호·여권·비자) | ✅ | ❌ | 취업가능 확인, 출입국 서류 자동 작성 |
| 사진 (신분증·서류 업로드) | ✅ (선택) | ❌ | 시간제취업 서류 검토 |
| 금융정보 | ❌ | ❌ | — |
| 앱 활동/기기 ID | ❌ | ❌ | — (광고·분석 SDK 없음) |

비고(심사 노트에 함께 기재 권장): 민감정보(외국인등록번호 등)는 본인 전용 접근제어(RLS)가 적용된 별도 저장소에 보관되며, 신분증 이미지는 사용자가 기기에서 주민등록번호 뒷자리를 직접 가린(마스킹) 사본만 업로드됩니다.

---

## 4. 빌드·서명 명령 (로컬 PC)

```bash
# 1) 업로드 키 생성 (최초 1회 — 파일과 비밀번호를 안전한 곳에 백업!)
keytool -genkey -v -keystore kalba-upload.keystore -alias kalba \
  -keyalg RSA -keysize 2048 -validity 10000

# 2) android/keystore.properties 생성 (gitignore 대상!)
#    storeFile=../../kalba-upload.keystore
#    storePassword=...
#    keyAlias=kalba
#    keyPassword=...

# 3) AAB 빌드
cd mirim.k-alba
npx cap sync android
cd android && ./gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab 업로드
```

※ `app/build.gradle`에 signingConfig가 아직 없으므로 keystore.properties 방식 서명 블록을 추가해야 합니다 (요청 시 Claude가 작성).

---

## 5. 심사 참고사항

- 로그인 필수 앱 → **테스트 계정** 반드시 제공 (앱 액세스 섹션)
- 웹뷰 기반이지만 위치 권한·전자서명·서류 자동작성 등 앱 고유 기능이 있으므로 "저품질 웹뷰" 지적 가능성 낮음. 스크린샷에 챗봇·계약서·확인서 화면을 포함해 기능성을 보여줄 것
- 2단계(앱스토어)는 아래 §6 참고

---

## 6. 2단계 — 앱스토어 (iOS) 출시 가이드

코드 준비는 완료된 상태:
- `ios/` Capacitor 프로젝트 추가됨 (번들 ID `kr.co.mirimmedialab.kalba`, Server Mode → www.k-alba.kr)
- Info.plist: OAuth 딥링크 URL 스킴 + 위치/카메라/사진 권한 문구 등록됨
- 로그인·가입 화면에 Apple 로그인 버튼 구현됨 (7개 언어) — 환경변수 `NEXT_PUBLIC_APPLE_LOGIN_ENABLED=1` 설정 전까지는 숨김

### 6-1. 준비물
- [ ] **Apple Developer Program** 가입 (연 $99, 법인은 D-U-N-S 필요 — 구글 조직 계정과 동일 번호 사용 가능) — https://developer.apple.com/programs/
- [ ] **Mac + Xcode** (iOS 빌드는 Mac에서만 가능)

### 6-2. Sign in with Apple ↔ Supabase 연동 (Apple Developer 계정 발급 후)
App Store 심사 지침 4.8: 카카오/구글 소셜 로그인이 있는 앱은 Apple 로그인을 반드시 제공해야 함.

1. Apple Developer → Certificates, Identifiers & Profiles:
   - [ ] **App ID** 생성: `kr.co.mirimmedialab.kalba`, "Sign in with Apple" capability 체크
   - [ ] **Services ID** 생성 (예: `kr.co.mirimmedialab.kalba.web`) — 이것이 Supabase의 client_id
     - Return URL: `https://uqgqqsescalotabaivee.supabase.co/auth/v1/callback`
     - Domain: `uqgqqsescalotabaivee.supabase.co`
   - [ ] **Key** 생성: "Sign in with Apple" 체크 → `.p8` 파일 다운로드 (1회만 다운로드 가능, 보관 필수) + Key ID 메모
   - [ ] Team ID 확인 (Membership 페이지)
2. Supabase 대시보드 → Authentication → Providers → Apple:
   - [ ] Enabled 켜기, Services ID / Team ID / Key ID / `.p8` 키 내용 입력
3. Vercel → 환경변수 `NEXT_PUBLIC_APPLE_LOGIN_ENABLED=1` 추가 → 재배포 → 로그인 화면에 Apple 버튼 노출
4. 웹에서 Apple 로그인 동작 확인 (딥링크 복귀는 iOS 실기기에서 확인)

### 6-3. Mac에서 빌드·제출
```bash
git clone https://github.com/mirimmedialab/k-alba.kr.git && cd k-alba.kr/mirim.k-alba
npm install && npx cap sync ios
npx cap open ios   # Xcode 열림
# Xcode: Signing & Capabilities → Team 선택 → "Sign in with Apple" capability 추가
# Product → Archive → Distribute App → App Store Connect
```

### 6-4. App Store Connect
- [ ] https://appstoreconnect.apple.com → 새 앱 (번들 ID 선택, 이름 K-ALBA)
- [ ] 스토어 문구: §2 내용 재사용 (Apple은 짧은 설명 대신 '프로모션 텍스트' 170자)
- [ ] 스크린샷: 6.7" (1290×2796) 필수, 6.5"/5.5" 권장
- [ ] 개인정보 처리방침 URL: https://www.k-alba.kr/privacy
- [ ] 앱 개인정보 보호(privacy nutrition label): §3 표와 동일하게 답변
- [ ] 심사 노트: 테스트 계정 제공 (§1과 동일) + "웹 기반 하이브리드지만 위치 추천·전자서명·서류 자동작성 등 앱 고유 기능 있음" 명시
- [ ] TestFlight 내부 테스트 → 심사 제출 (보통 1~3일)
