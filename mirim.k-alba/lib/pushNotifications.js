"use client";

/**
 * K-ALBA 푸시 알림 클라이언트
 *
 * 네이티브 앱 (Capacitor): FCM (Android) / APNs (iOS)
 * 웹: Web Push (향후 PWA 지원 시)
 *
 * 사용 흐름:
 *   1. 앱 첫 실행 시 registerPushNotifications() 호출
 *   2. 사용자가 권한 허용하면 FCM 토큰 발급
 *   3. 토큰을 Supabase `push_tokens` 테이블에 저장
 *   4. 서버에서 근처 새 공고 있을 때 FCM 경유 푸시 발송
 *
 * FCM 서버 키 설정:
 *   - Firebase Console → 프로젝트 설정 → 클라우드 메시징
 *   - Android: google-services.json 다운로드 → android/app/
 *   - iOS: GoogleService-Info.plist 다운로드 → ios/App/App/
 *   - 서버용 키: Vercel 환경변수 FIREBASE_SERVER_KEY
 */

// Capacitor 환경 확인
function isNative() {
  if (typeof window === "undefined") return false;
  const cap = (window).Capacitor;
  return cap?.isNativePlatform?.() === true;
}

async function loadCapacitorPush() {
  if (!isNative()) return null;
  try {
    const mod = await import("@capacitor/push-notifications");
    return mod.PushNotifications;
  } catch {
    return null;
  }
}



/**
 * 푸시 알림 권한 확인
 */
export async function checkPushPermission() {
  if (isNative()) {
    const Push = await loadCapacitorPush();
    if (!Push) return { status: "unavailable" };
    try {
      const perm = await Push.checkPermissions();
      const status =
        perm.receive === "granted" ? "granted" :
        perm.receive === "denied" ? "denied" :
        "prompt";
      return { status };
    } catch {
      return { status: "unavailable" };
    }
  }

  // 웹 환경 - Notification API
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { status: "unavailable" };
  }

  const perm = Notification.permission;
  if (perm === "granted") return { status: "granted" };
  if (perm === "denied") return { status: "denied" };
  return { status: "prompt" };
}

/**
 * 푸시 알림 권한 요청 + 토큰 발급
 *
 * @returns FCM/APNs 토큰 (or null if denied)
 */
export async function registerPushNotifications() {
  if (isNative()) {
    const Push = await loadCapacitorPush();
    if (!Push) return null;

    try {
      const permCheck = await Push.checkPermissions();
      if (permCheck.receive !== "granted") {
        const req = await Push.requestPermissions();
        if (req.receive !== "granted") return null;
      }

      // 등록 (토큰은 비동기로 register 이벤트에서 발급)
      await Push.register();

      // 토큰 이벤트 대기 (Promise 래핑)
      return new Promise<PushToken | null>((resolve) => {
        const timeout = setTimeout(() => resolve(null), 10000);

        Push.addListener("registration", (token) => {
          clearTimeout(timeout);
          const platform = (window).Capacitor?.getPlatform?.() === "ios" ? "ios" : "android";
          resolve({ value: token.value, platform });
        });

        Push.addListener("registrationError", () => {
          clearTimeout(timeout);
          resolve(null);
        });
      });
    } catch (e) {
      console.error("[push] register error:", e);
      return null;
    }
  }

  // 웹은 향후 VAPID 기반 Web Push 구현 시 확장
  if (typeof window !== "undefined" && "Notification" in window) {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return null;
    return { value: "web-notification", platform: "web" };
  }

  return null;
}

/**
 * 푸시 수신 리스너 등록
 * (앱이 실행 중일 때 도착한 알림 처리)
 */
export async function setupPushListeners(handlers = {
  onReceived?: (notification) => void;
  onActionPerformed?: (action) => void;
}) {
  if (!isNative()) return;
  const Push = await loadCapacitorPush();
  if (!Push) return;

  if (handlers.onReceived) {
    Push.addListener("pushNotificationReceived", handlers.onReceived);
  }
  if (handlers.onActionPerformed) {
    Push.addListener("pushNotificationActionPerformed", handlers.onActionPerformed);
  }
}

/**
 * 푸시 토큰을 Supabase에 저장/업데이트
 *
 * 테이블 스키마는 migration-push-notifications.sql 참조
 */
export async function savePushToken(supabase, userId, token: PushToken) {
  if (!supabase || !userId || !token) return;

  try {
    await supabase
      .from("push_tokens")
      .upsert({
        user_id: userId,
        token: token.value,
        platform: token.platform,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,platform",
      });
  } catch (e) {
    console.error("[push] save token failed:", e);
  }
}

/**
 * 권한 요청 + 토큰 저장 원스텝 헬퍼
 * (앱 진입 시 한 번 호출)
 */
export async function initPushNotifications(supabase, userId | null) {
  if (!userId) return;

  // 이미 등록돼 있는지 확인
  const { status } = await checkPushPermission();
  if (status === "denied" || status === "unavailable") return;

  const token = await registerPushNotifications();
  if (token) {
    await savePushToken(supabase, userId, token);
  }
}
