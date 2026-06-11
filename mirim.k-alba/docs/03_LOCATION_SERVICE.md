# K-ALBA 위치 기반 서비스 설계 문서

**작성일**: 2026-04-24
**목표**: 외국인 사용자에게 **거주지 → 알바 위치 접근성**을 가장 중요한 매칭 기준으로 제공

---

## 🎯 핵심 요구사항

1. **하이브리드 앱 전환** — 네이티브 GPS 권한 사용
2. **위치 기반 공고 추천** — 현재 위치 또는 거주지 기반
3. **거리 + 이동수단 표시** — 도보/대중교통/자전거/차량
4. **외국인 친화적 UX** — 지도/경로 안내가 직관적

---

## 🗺️ 외국인 사용자 특성 분석

이동수단 관점에서 외국인 알바생이 처한 현실:

| 비자 유형 | 주 교통수단 | 제약 |
|---|---|---|
| **E-9** (고용허가제) | 사업주 제공 숙소 / 도보 | 운전 못 함, 대중교통 노선 숙지 안 됨 |
| **E-8** (농업 계절노동) | 농장 숙소 / 트랙터 | 시골, 대중교통 거의 없음 |
| **H-2** (방문취업, 동포) | 지하철/버스 / 자차 | 한국어 가능, 서울권 익숙 |
| **D-2** (유학생) | 지하철 + 자전거 | 학교 근처 반경 5km 이내 선호 |
| **D-4** (연수생) | 도보 + 지하철 | 학원 근처 |
| **F-4** (재외동포) | 다양 (한국 거주 오래됨) | 제약 적음 |
| **F-6** (결혼이민) | 가족 차량 + 대중교통 | 지역 한정 |

**핵심 인사이트**:
- 외국인은 **대중교통 환승이 2번 이상이면 포기**하는 경향
- **"우리 동네 바로 옆"** 공고가 최우선
- 시골 E-9/E-8은 **숙식 제공 여부**가 거리보다 중요
- 야간 알바는 **막차 시간** 확인 필수

---

## 📊 Phase 1: 데이터 레이어 (DB 스키마)

### 1.1 기존 스키마 한계

현재 `jobs` 테이블:
```sql
address TEXT            -- "서울 강남구 테헤란로 152"
address_detail TEXT     -- "3층"
```

→ 문자열만 저장. **좌표 없음, 거리 계산 불가능**.

### 1.2 신규 스키마 (확장)

```sql
-- ═══════════════════════════════════════
-- STEP 1: PostGIS 확장 활성화 (Supabase)
-- ═══════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS postgis;

-- ═══════════════════════════════════════
-- STEP 2: jobs 테이블 위치 필드 추가
-- ═══════════════════════════════════════
ALTER TABLE jobs
  ADD COLUMN latitude   DOUBLE PRECISION,
  ADD COLUMN longitude  DOUBLE PRECISION,
  ADD COLUMN geog       GEOGRAPHY(POINT, 4326),  -- PostGIS 지리 타입
  ADD COLUMN address_road     TEXT,               -- 도로명주소 (검색용)
  ADD COLUMN address_jibun    TEXT,               -- 지번주소 (보조)
  ADD COLUMN sido        TEXT,                    -- 시도 (서울, 경기…)
  ADD COLUMN sigungu     TEXT,                    -- 시군구 (강남구, 수원시…)
  ADD COLUMN dong        TEXT,                    -- 동읍면
  ADD COLUMN transit_info JSONB DEFAULT '{}',     -- 교통 부가정보
  ADD COLUMN provides_housing BOOLEAN DEFAULT false,   -- 숙식 제공 (E-9 등)
  ADD COLUMN provides_shuttle BOOLEAN DEFAULT false,   -- 통근버스 제공
  ADD COLUMN nearest_station TEXT,                     -- 가장 가까운 역
  ADD COLUMN walk_to_station_min INTEGER;              -- 역까지 도보 분

-- transit_info JSONB 구조 예시:
-- {
--   "subway":   [{ "line": "2호선", "station": "강남역", "walk_min": 5 }],
--   "bus":      [{ "route": "146", "stop": "테헤란로", "walk_min": 2 }],
--   "last_bus": "23:30",
--   "last_subway": "24:12",
--   "shuttle_schedule": "06:00, 14:00 (공장 통근버스)",
--   "parking":  true
-- }

-- 공간 인덱스 (이게 있어야 거리 쿼리가 빠름)
CREATE INDEX idx_jobs_geog ON jobs USING GIST(geog);
CREATE INDEX idx_jobs_sigungu ON jobs(sigungu);

-- geog는 latitude/longitude 저장 시 자동 생성되도록 트리거
CREATE OR REPLACE FUNCTION update_job_geog()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geog = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_jobs_geog
  BEFORE INSERT OR UPDATE OF latitude, longitude ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_job_geog();

-- ═══════════════════════════════════════
-- STEP 3: profiles 테이블에도 거주지 좌표
-- ═══════════════════════════════════════
ALTER TABLE profiles
  ADD COLUMN home_latitude   DOUBLE PRECISION,
  ADD COLUMN home_longitude  DOUBLE PRECISION,
  ADD COLUMN home_geog       GEOGRAPHY(POINT, 4326),
  ADD COLUMN home_address_road  TEXT,
  ADD COLUMN home_sigungu    TEXT,
  ADD COLUMN search_radius_km INTEGER DEFAULT 10,  -- 구직자 선호 반경
  ADD COLUMN transport_modes TEXT[] DEFAULT ARRAY['transit','walk'],  -- 이동 가능 수단
  ADD COLUMN max_commute_min INTEGER DEFAULT 60;   -- 최대 허용 통근시간

CREATE INDEX idx_profiles_home_geog ON profiles USING GIST(home_geog);

CREATE TRIGGER trg_profiles_home_geog
  BEFORE INSERT OR UPDATE OF home_latitude, home_longitude ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_profile_home_geog();
-- (update_profile_home_geog은 위 update_job_geog와 동일 구조)
```

### 1.3 기존 데이터 마이그레이션

이미 쌓인 `address` 문자열은 Kakao/Naver Geocoding API로 **백필(backfill)**:

```sql
-- 빈 좌표 공고 식별
SELECT id, address FROM jobs WHERE latitude IS NULL AND address IS NOT NULL;
-- → Node 스크립트로 일괄 지오코딩 후 UPDATE
```

---

## 🔌 Phase 2: 지오코딩 & 거리 계산 API

### 2.1 지오코딩 (주소 → 좌표)

**추천: Kakao Local API** (한국 주소 최적, 월 30만 건 무료)

```
POST https://dapi.kakao.com/v2/local/search/address.json
Headers: Authorization: KakaoAK {REST_API_KEY}
Query:   query=서울 강남구 테헤란로 152

Response:
{
  "documents": [{
    "address_name": "서울 강남구 역삼동 737",
    "road_address": {
      "address_name": "서울 강남구 테헤란로 152",
      "x": "127.036515", "y": "37.500287"
    }
  }]
}
```

**Next.js API route**:
```
/api/geocode/address  (POST: address → lat/lng/sigungu)
/api/geocode/reverse  (POST: lat/lng → address)
```

### 2.2 거리 쿼리 (Supabase RPC)

```sql
-- 사용자 좌표에서 반경 N km 이내 공고를 가까운 순으로
CREATE OR REPLACE FUNCTION jobs_nearby(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 10,
  visa_filter TEXT[] DEFAULT NULL,
  limit_count INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  address TEXT,
  pay_amount INT,
  visa_types TEXT[],
  distance_m DOUBLE PRECISION,
  distance_km DOUBLE PRECISION,
  provides_housing BOOLEAN,
  provides_shuttle BOOLEAN,
  transit_info JSONB
) AS $$
  SELECT
    j.id, j.title, j.address, j.pay_amount, j.visa_types,
    ST_Distance(j.geog,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) AS distance_m,
    ROUND(
      ST_Distance(j.geog,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
      ) / 1000, 2
    ) AS distance_km,
    j.provides_housing,
    j.provides_shuttle,
    j.transit_info
  FROM jobs j
  WHERE
    j.geog IS NOT NULL
    AND ST_DWithin(
      j.geog,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
    AND (visa_filter IS NULL OR j.visa_types && visa_filter)
    AND j.status = 'active'
  ORDER BY j.geog <-> ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
  LIMIT limit_count;
$$ LANGUAGE SQL STABLE;
```

호출 예시:
```javascript
const { data } = await supabase.rpc('jobs_nearby', {
  user_lat: 37.5326,
  user_lng: 127.0246,
  radius_km: 5,
  visa_filter: ['D-2', 'F-2'],
  limit_count: 30
});
```

### 2.3 경로 & 소요시간 (이동수단별)

**공고 상세 페이지에서 "우리 집 → 알바" 경로 표시**

**Kakao Mobility Directions API** (자동차, 무료 월 1만 건) + **T맵 API** (대중교통/도보) 조합:

```javascript
// 경로 요청 — 자동차
GET https://apis-navi.kakaomobility.com/v1/directions
  ?origin=127.1,37.5&destination=127.2,37.6

// 경로 요청 — 대중교통
POST https://apis.openapi.sk.com/tmap/routes/transit
  Body: { startX, startY, endX, endY }

Response (요약):
{
  "driving":  { "duration_sec": 1200, "distance_m": 8400 },
  "transit":  { "duration_sec": 2400, "transfers": 1, "steps": [...] },
  "walking":  { "duration_sec": 5400, "distance_m": 7200 },
  "cycling":  { "duration_sec": 1800, "distance_m": 7500 }
}
```

캐시 전략: 같은 `(origin, destination, mode)`의 결과를 24시간 Redis/DB 캐싱.

---

## 📱 Phase 3: UI/UX 설계

### 3.1 위치 권한 요청 UX

외국인 사용자에게는 **왜 위치가 필요한지** 명확히 설명해야 승낙률이 올라갑니다.

```
┌─────────────────────────────────┐
│   📍                             │
│  내 주변 알바 찾기                  │
│                                 │
│  위치 정보를 허용하면              │
│  • 우리 집에서 가까운 공고를          │
│    먼저 볼 수 있어요                │
│  • 대중교통으로 몇 분 걸리는지        │
│    미리 알 수 있어요                │
│                                 │
│  [나중에]    [위치 허용하기 →]      │
└─────────────────────────────────┘
```

**거절 시 대안**: 프로필의 `home_latitude/longitude`가 있으면 그걸 사용. 둘 다 없으면 "거주 시군구" 드롭다운 기반 중심 좌표 사용.

### 3.2 Jobs 리스트 업그레이드

현재:
```
01  카페 바리스타
    블루보틀 강남점 · 강남구 · 주 20시간        ₩12,000
    [D-2] [F-4] [H-2]                          2일 전
```

위치 기반 후:
```
01  카페 바리스타                    📍 1.2km
    블루보틀 강남점 · 강남구 · 주 20시간        ₩12,000
    [D-2] [F-4] [H-2]
    🚇 강남역 5분 도보 · 버스 146번 2분
    ────────────────────────────────────
                                      2일 전
```

**정렬 옵션 추가**:
- 가까운 순 (기본, 위치 허용 시)
- 최신순
- 급여 높은 순
- 대중교통 편한 순 (transfers 낮은 순)

### 3.3 공고 상세에 지도 + 경로 카드

```
┌─ 공고 상세 ────────────────────┐
│ 카페 바리스타 · 블루보틀 강남점     │
│ 시급 ₩12,000 · 주 20시간         │
│                                 │
│ 📍 서울 강남구 테헤란로 152        │
│ ┌──── [지도] ────┐                │
│ │ 빨간 마커 = 알바 │                │
│ │ 파란 마커 = 우리집│                │
│ └────────────────┘                │
│                                 │
│ 📐 우리 집에서 1.2km               │
│                                 │
│ ═ 이동 방법 ═                   │
│ 🚇 대중교통  25분 · 환승 1회  👍   │
│    강남 → 선릉 → 도보 5분         │
│    [경로 보기]                    │
│ 🚶 도보         18분 · 1.2km       │
│ 🚴 자전거        8분               │
│ 🚗 자동차        12분              │
│                                 │
│ ⏰ 막차 시간                       │
│    지하철 24:12 · 버스 23:30       │
│ 🏠 숙식 제공 · 🚐 통근버스 제공     │
└─────────────────────────────────┘
```

### 3.4 지도 중심 탐색 뷰 (신규 `/jobs/map`)

```
┌─ 지도 뷰 ──────────────────────┐
│ [필터] [반경 5km ▼] [비자 ▼]     │
│                                │
│ ┌────────────────────────────┐ │
│ │ 🗺  Naver/Kakao 지도          │ │
│ │   (클러스터링된 마커들)        │ │
│ │   • • ← 동일 위치 여러 공고   │ │
│ │     📍 = 구직자 위치          │ │
│ └────────────────────────────┘ │
│                                │
│ ─── 이 지역 공고 (28개) ───      │
│ (마커 탭하면 하단에 리스트 표시)   │
└────────────────────────────────┘
```

### 3.5 프로필 거주지 설정

```
┌─ 프로필 > 거주지 ─────────────────┐
│ 현재 거주지 *                     │
│ [주소 검색...] → 좌표 자동 변환   │
│ 예: 서울 강남구 역삼동 123-4        │
│                                 │
│ 선호 알바 반경                    │
│ [●────○────] 5km                 │
│  1km  5km  10km  20km  전국       │
│                                 │
│ 이동 가능 수단 (중복 선택)          │
│ [✓ 대중교통] [✓ 도보]              │
│ [ ] 자전거   [ ] 자차              │
│                                 │
│ 최대 허용 통근시간                 │
│ [○────●────] 60분                │
└─────────────────────────────────┘
```

### 3.6 사장님 공고 등록 UX 업그레이드

```
근무지 주소 *
[주소 검색...]
→ 자동으로 지도에 핀 찍힘
→ 사장님이 드래그로 미세 조정 가능 (골목 안쪽 사업장용)

부가 정보 (외국인 매칭률 UP)
[✓] 숙식 제공 (E-9/E-8 필수)
[ ] 통근버스 제공 → 노선: [____________]
[✓] 대중교통 접근 쉬움 (가까운 역: [강남역])

→ AI 자동 채움: "강남역 도보 5분 · 버스 146번 2분 거리"
```

---

## 📱 Phase 4: 하이브리드 앱 전환

### 4.1 플랫폼 선택 가이드

**추천: Capacitor** (Ionic이 만든 Cordova 후계자)

- Next.js 웹앱 그대로 래핑 가능 (export 후 embed)
- Plugin 생태계 풍부: Geolocation, Permissions, Push
- React Native 대비 **학습 곡선 낮음** (웹 개발자가 바로 가능)
- iOS/Android 동시 빌드

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/geolocation @capacitor/push-notifications
npx cap init
npx cap add ios
npx cap add android
```

### 4.2 네이티브 위치 권한 통합

```javascript
// src/lib/geolocation.js
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export async function getCurrentLocation() {
  // Capacitor 앱 환경
  if (Capacitor.isNativePlatform()) {
    const perm = await Geolocation.checkPermissions();
    if (perm.location !== 'granted') {
      const request = await Geolocation.requestPermissions();
      if (request.location !== 'granted') {
        throw new Error('LOCATION_PERMISSION_DENIED');
      }
    }
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy
    };
  }
  // 웹 환경 (fallback)
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GEOLOCATION_NOT_SUPPORTED'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({
        latitude: p.coords.latitude,
        longitude: p.coords.longitude,
        accuracy: p.coords.accuracy
      }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
```

### 4.3 iOS/Android 권한 메시지

**iOS (`ios/App/App/Info.plist`)**:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>근처 알바 공고를 찾고, 우리 집에서 얼마나 걸리는지 알려드리기 위해 위치 정보가 필요합니다.</string>
```

**Android (`android/app/src/main/AndroidManifest.xml`)**:
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

**7개 언어 번역 필수** (locales에 추가):
- 한국어: "근처 알바 공고를 찾기 위해 위치가 필요해요"
- 영어: "We need your location to find nearby part-time jobs"
- 베트남어, 중국어, 우즈벡어, 몽골어, 일본어 각각

---

## 🎨 Phase 5: 외국인 UX 특화

### 5.1 시각적 거리 감각

숫자(km)보다 **직관적 비유**가 외국인에게 효과적:

```
1.2km → "🚶 걸어서 18분"
5km   → "🚇 지하철로 15분"
20km  → "🚗 자동차로 25분 · 대중교통 환승 2회"
```

### 5.2 "이 시간에 집에 갈 수 있나요?" 체크

야간 알바의 경우:
```
⚠️ 주의: 이 공고는 23:00 ~ 06:00 근무
    당신의 집까지 막차 시간:
    🚇 지하철 강남역 24:12 (마지막 환승 → 집)
    🚌 버스 146번 23:30 (끊김)
    
    💡 심야버스 N15번 00:30, 01:30 있음
    💡 택시 예상 요금 ₩18,000
```

### 5.3 언어 장벽 보완 — 경로의 시각화

```
🚇 지하철 경로 (한국어 어려워도 OK)
  ┌─ 강남역 2호선 (초록) ─┐
  │  5개 역 · 10분         │
  └─ 을지로3가 환승 ──┐    │
                    │    │
                    ▼    ▼
              3호선 (주황)
              2개 역 · 5분
              → 안국역 (도착)
              도보 3분 → 우리 집
```

### 5.4 동네 단위 번들

같은 지역(시군구)에 있는 공고를 묶어서 보여주기:

```
📍 지금 내 위치: 서울 강남구

━━━━━ 🏠 우리 동네 (반경 2km) ━━━━━
5개 공고 · 평균 ₩12,400
[공고 1] [공고 2] [공고 3]
                            [더 보기]

━━━━━ 🚇 옆동네 (반경 5km) ━━━━━
12개 공고 · 평균 ₩11,800
[공고 4] [공고 5] ...
                            [더 보기]

━━━━━ 🌐 같은 시군구 내 ━━━━━
28개 공고
```

---

## 📊 Phase 6: 데이터 백필 계획

### 6.1 우선순위

1. **새 공고** (앞으로 등록) — 등록 시 자동 지오코딩
2. **active 공고** — 현재 노출 중인 것부터 일괄 지오코딩
3. **closed 공고** — 재활용 시에만 지오코딩

### 6.2 지오코딩 배치 스크립트

```javascript
// scripts/backfill-geocodes.js
async function backfill() {
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, address')
    .is('latitude', null)
    .not('address', 'is', null)
    .limit(100);

  for (const job of jobs) {
    try {
      const geo = await kakaoGeocode(job.address);
      if (geo) {
        await supabase
          .from('jobs')
          .update({
            latitude: geo.y,
            longitude: geo.x,
            address_road: geo.road_address,
            sido: geo.sido,
            sigungu: geo.sigungu,
            dong: geo.dong,
          })
          .eq('id', job.id);
      }
    } catch (e) {
      console.error(`Failed job ${job.id}:`, e.message);
    }
    await sleep(200); // Kakao API rate limit 준수
  }
}
```

매일 새벽 05:00 KST 스케줄러에 추가 (기존 WorkNet 동기화 타이밍과 동일).

---

## 📈 Phase 7: 분석 및 매칭 로직 개선

### 7.1 "접근성 점수" 산출

```
접근성 점수 = w1 × (1/거리km) + w2 × (1/환승수) + w3 × (1/통근시간) + w4 × 숙식제공
```

예: E-9 비자는 숙식 제공 가중치(w4) 최대, D-2 유학생은 통근시간(w3) 최대.

### 7.2 자동 추천 엔진

프로필 기반:
```
사용자: D-2 유학생, 홍대 거주, 반경 5km, 도보+지하철
        ↓
추천: 홍대~신촌~합정~상수 권역
      한국어 초급 수용 공고 우선
      밤 12시 막차 가능 공고 필터
```

### 7.3 매칭 알림

새 공고 등록 시:
```
if (job.location DISTANCE user.home_location <= user.search_radius_km
    AND job.visa_types @> user.visa_type
    AND job.korean_level <= user.korean_level) {
  sendKakaoAlimtalk(user, job);
}
```

---

## 🗓️ 구현 로드맵

### 단기 (1-2주)
- [x] 설계 문서 작성
- [ ] Kakao Developers 가입 + API 키 발급
- [ ] `supabase-migration-geolocation.sql` 실행
- [ ] `/api/geocode/*` 라우트 구현
- [ ] 기존 공고 데이터 백필 (1회성 배치)

### 중기 (3-4주)
- [ ] 프로필 페이지에 거주지 설정 UI
- [ ] 공고 등록 시 지오코딩 자동 실행
- [ ] jobs 리스트에 거리 표시 + 가까운 순 정렬
- [ ] 공고 상세에 지도 + 경로 3종 표시

### 장기 (2-3개월)
- [ ] `/jobs/map` 지도 탐색 뷰 구현
- [ ] Capacitor로 iOS/Android 하이브리드 앱 빌드
- [ ] 막차 시간/심야버스 정보 통합
- [ ] 접근성 점수 기반 추천 엔진

### 차기 (확장)
- [ ] 푸시 알림 (근처 신규 공고)
- [ ] 경로 내비게이션 (카카오맵 딥링크)
- [ ] 기상 연동 (비 오는 날 도보 공고 하위 노출)

---

## 🔐 주의사항

1. **개인정보**: 구직자의 정확한 좌표는 사장님에게 노출 금지. 사장님에게는 "시군구 단위" 만 표시
2. **GPS 정확도**: 실내(건물 내) 측정 오차 100m+ 정상. 첫 진입 시 3초 내 못 받으면 fallback
3. **배터리**: 앱 백그라운드에서는 위치 추적 금지. 포그라운드 진입 시에만 갱신
4. **API 비용**: Kakao 무료 티어 초과 시 비용 발생. 캐싱 철저
5. **막차 정보**: 외부 API 의존성 높음. 수동 보완 필요
6. **농촌/시골**: 대중교통 데이터 없음 → 거리 + 숙식 제공 여부만 표시

---

## 📎 참고 자료

- [Kakao Local API](https://developers.kakao.com/docs/latest/ko/local/dev-guide)
- [Kakao Mobility Directions](https://developers.kakaomobility.com/)
- [T맵 API](https://tmapapi.tmapmobility.com/)
- [Supabase + PostGIS](https://supabase.com/docs/guides/database/extensions/postgis)
- [Capacitor](https://capacitorjs.com/docs)
- [Capacitor Geolocation Plugin](https://capacitorjs.com/docs/apis/geolocation)

---

**작성**: Claude (Anthropic)
**상태**: 설계 문서 — 사장님 결정 후 구체 구현 진행
