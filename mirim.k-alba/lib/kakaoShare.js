"use client";
// 카카오톡 공유 (JS SDK v2)
// - NEXT_PUBLIC_KAKAO_JS_KEY (없으면 NEXT_PUBLIC_KAKAO_MAP_JS_KEY 재사용)
// - SDK 로드/초기화 실패 시 navigator.share → 클립보드 복사로 폴백

const SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";

let sdkPromise = null;

export function loadKakaoSdk() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.Kakao?.isInitialized?.()) return Promise.resolve(window.Kakao);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve) => {
    const KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY;
    if (!KEY) {
      console.warn("[kakaoShare] Kakao JS key not set");
      resolve(null);
      return;
    }
    const init = () => {
      try {
        if (window.Kakao && !window.Kakao.isInitialized()) window.Kakao.init(KEY);
        resolve(window.Kakao || null);
      } catch (e) {
        console.warn("[kakaoShare] init failed:", e);
        resolve(null);
      }
    };
    if (window.Kakao) {
      init();
      return;
    }
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.async = true;
    s.onload = init;
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return sdkPromise;
}

/**
 * 근로계약서를 카카오톡으로 공유
 * @returns {"kakao"|"share"|"clipboard"|null} 사용된 공유 방법
 */
export async function shareContractKakao(contract, url) {
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const title = "📝 K-ALBA 근로계약서";
  const desc = [
    contract?.company_name && `🏪 ${contract.company_name}`,
    contract?.worker_name && `👤 ${contract.worker_name}`,
    contract?.pay_type && contract?.pay_amount && `💰 ${contract.pay_type} ₩${Number(contract.pay_amount).toLocaleString()}`,
    contract?.contract_start && `📅 ${contract.contract_start} ~ ${contract.contract_end || ""}`,
  ]
    .filter(Boolean)
    .join("\n");

  // 1) 카카오톡 공유
  try {
    const Kakao = await loadKakaoSdk();
    if (Kakao?.Share) {
      Kakao.Share.sendDefault({
        objectType: "text",
        text: `${title}\n\n${desc}\n\n계약 내용을 확인하고 전자서명해 주세요.`,
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        buttonTitle: "계약서 확인하기",
      });
      return "kakao";
    }
  } catch (e) {
    console.warn("[kakaoShare] Kakao share failed:", e);
  }

  // 2) 기기 공유 시트 (모바일)
  try {
    if (navigator.share) {
      await navigator.share({ title, text: desc, url: shareUrl });
      return "share";
    }
  } catch (e) {
    if (e?.name === "AbortError") return null; // 사용자가 닫음
  }

  // 3) 클립보드 복사
  try {
    await navigator.clipboard.writeText(shareUrl);
    return "clipboard";
  } catch (e) {
    return null;
  }
}
