import type { CapacitorConfig } from '@capacitor/cli';

/**
 * K-ALBA Capacitor 설정
 *
 * 전략: 하이브리드 중에서도 'Server Mode' 사용
 * - 앱은 Vercel에 배포된 웹을 WebView로 로드
 * - 웹 업데이트 시 앱도 즉시 반영 (앱스토어 재심사 불필요)
 * - 네이티브 기능(GPS, 푸시, 카메라)만 Capacitor 플러그인으로
 *
 * 개발 모드 vs 프로덕션 모드:
 * - 개발: webDir 비우고 server.url 을 localhost로 (핫리로드)
 * - 프로덕션: server.url 을 https://www.k-alba.kr 로
 */
const config: CapacitorConfig = {
  appId: 'kr.co.mirimmedialab.kalba',
  appName: 'K-ALBA',
  // webDir: 빈 폴더도 허용 → Server Mode이므로 실제 내용은 server.url에서 로드됨
  // 'public' 을 사용하면 빌드 없이도 cap sync 가능 (favicon.ico 등 최소 파일 포함)
  webDir: 'public',

  server: {
    // ⚠️ 반드시 "리다이렉트가 일어나지 않는 최종 주소"를 사용한다.
    //    apex(k-alba.kr)는 www로 301 리다이렉트되는데, Capacitor는 server.url 로드 직후
    //    리다이렉트가 발생하면 네이티브 브리지를 다시 주입하지 않아 getPlatform()이 'web'이 된다
    //    (이슈 #7454). 그러면 @capacitor/browser 등이 웹 구현으로 동작해 OAuth가 외부 브라우저로
    //    빠지고 딥링크 복귀가 안 됨. → 처음부터 www 정규 도메인으로 로드해 리다이렉트를 없앤다.
    url: 'https://www.k-alba.kr',
    cleartext: false, // HTTPS 강제
    androidScheme: 'https',

    // 허용 도메인 (앱 내에서 방문 가능한 외부 링크)
    allowNavigation: [
      'k-alba.kr',
      '*.k-alba.kr',
      '*.supabase.co',
      'dapi.kakao.com',
      'apis-navi.kakaomobility.com',
      'apis.openapi.sk.com', // T맵
    ],
  },

  // 네이티브 플러그인 설정
  plugins: {
    Geolocation: {
      // 위치 권한 요청 메시지 (7개 언어 locales와 연동 예정)
      permissions: ['location'],
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      // ⚠️ 반드시 자동 숨김 ON. (false로 두면 hide() 미호출 시 스플래시가 웹뷰를 덮어 앱이 멈춤)
      // 네이티브가 launchShowDuration 후 자동으로 숨기고, 웹 준비 시 NativeBridge가 더 일찍 숨김.
      launchAutoHide: true,
      launchShowDuration: 3000, // 자동 숨김까지 최대 대기(원격 웹 로드 여유). 준비되면 더 빨리 숨겨짐.
      launchFadeOutDuration: 200,
      backgroundColor: '#0A1628', // McKinsey 네이비 — 브랜드 일관성
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK', // 네이비 배경에 흰 글씨
      backgroundColor: '#0A1628',
    },
  },

  // iOS 전용 설정
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    // 기본 뷰 배경색 (SplashScreen 후 로드 시 잠깐 보임)
    backgroundColor: '#0A1628',
  },

  // Android 전용 설정
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true, // 임시: 디버깅용(원인 확인 후 false로 되돌림)
    backgroundColor: '#0A1628',
  },
};

export default config;
