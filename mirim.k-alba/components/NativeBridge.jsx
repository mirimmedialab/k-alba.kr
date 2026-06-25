"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

/**
 * NativeBridge — 네이티브 앱(Capacitor)에서만 동작하는 브리지.
 * 웹에서는 아무것도 하지 않음(레이아웃/동작 영향 없음).
 *
 *  1) 상태바가 웹뷰 위에 겹치지 않도록 (시계·배터리 영역 침범 방지)
 *  2) 스플래시: 웹 화면이 준비되면 숨김
 *  3) OAuth 딥링크 복귀: Custom Tab 인증 후 kr.co.mirimmedialab.kalba://auth/callback 으로
 *     돌아오면 같은 웹뷰에서 code→세션 교환 (PKCE verifier가 이 웹뷰에 있어 성공)
 */
function isNativePlatform() {
  if (typeof window === "undefined") return false;
  return window.Capacitor?.isNativePlatform?.() === true;
}

export default function NativeBridge() {
  useEffect(() => {
    if (!isNativePlatform()) return;

    let appListener = null;

    (async () => {
      // 1) 상태바: 웹뷰 위 오버레이 해제 → 콘텐츠가 상태바 아래에서 시작
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        try { await StatusBar.setOverlaysWebView({ overlay: false }); } catch (_) {}
        try { await StatusBar.setStyle({ style: Style.Dark }); } catch (_) {}
        try { await StatusBar.setBackgroundColor({ color: "#0A1628" }); } catch (_) {}
      } catch (_) {}

      // 2) 스플래시 숨김 (이 컴포넌트가 마운트됐다 = 웹 준비됨)
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        try { await SplashScreen.hide(); } catch (_) {}
      } catch (_) {}

      // 3) OAuth 딥링크 복귀 핸들러
      try {
        const { App } = await import("@capacitor/app");
        appListener = await App.addListener("appUrlOpen", async ({ url }) => {
          if (!url || url.indexOf("auth/callback") === -1) return;

          // 인증용 Custom Tab 닫기
          try {
            const { Browser } = await import("@capacitor/browser");
            await Browser.close();
          } catch (_) {}

          try {
            const u = new URL(url);
            if (u.searchParams.get("error_description") || u.searchParams.get("error")) {
              window.location.href = "/login?reason=oauth_error";
              return;
            }
            const code = u.searchParams.get("code");
            if (code && supabase) {
              const { error } = await supabase.auth.exchangeCodeForSession(code);
              if (error) {
                window.location.href = "/login?reason=oauth_error";
                return;
              }
            }
            // 기존 콜백 페이지로 이동 → user_type/약관/비자 분기 로직 재사용 (이제 세션 존재)
            window.location.href = "/auth/callback";
          } catch (_) {
            window.location.href = "/login?reason=oauth_error";
          }
        });
      } catch (_) {}
    })();

    return () => {
      try { appListener?.remove?.(); } catch (_) {}
    };
  }, []);

  return null;
}
