"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { ko } from "./locales/ko";
import { en } from "./locales/en";
import { zh } from "./locales/zh";
import { vi } from "./locales/vi";
import { uz } from "./locales/uz";
import { mn } from "./locales/mn";
import { ja } from "./locales/ja";

/**
 * K-ALBA i18n System v2 (Supabase 동기화 추가)
 *
 * 변경점 (v1 → v2):
 *   ✅ 로그인 사용자는 profiles.preferred_lang에 저장
 *   ✅ 다른 기기/세션에서도 동일한 언어로 자동 적용
 *   ✅ localStorage 우선 → Supabase fallback → 브라우저 감지
 *   ✅ 언어 변경 시 비동기로 Supabase 업데이트
 *   ✅ 변수 보간 함수 fmt() 내장 (t() 호출 시 두 번째 인자)
 *
 * 보존:
 *   - I18nContext, I18nProvider, useT, useLocale 인터페이스 동일
 *   - 7개 언어 dict 구조 동일
 *   - 기존 페이지 코드 변경 불필요
 */

export const LOCALES = {
  ko: { name: "한국어", flag: "🇰🇷", dict: ko },
  en: { name: "English", flag: "🇺🇸", dict: en },
  zh: { name: "中文", flag: "🇨🇳", dict: zh },
  vi: { name: "Tiếng Việt", flag: "🇻🇳", dict: vi },
  uz: { name: "O'zbek", flag: "🇺🇿", dict: uz },
  mn: { name: "Монгол", flag: "🇲🇳", dict: mn },
  ja: { name: "日本語", flag: "🇯🇵", dict: ja },
};

const I18nContext = createContext({
  locale: "ko",
  setLocale: () => {},
  t: (k) => k,
});

// 중첩 키 조회: "partwork.status.approved" → dict.partwork.status.approved
function resolveKey(dict, key) {
  const parts = key.split(".");
  let cur = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) cur = cur[p];
    else return null;
  }
  return typeof cur === "string" ? cur : null;
}

// 변수 치환: t("hello {name}", { name: "World" })
function interpolate(template, vars) {
  if (!template || !vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState("ko");
  const [supabaseClient, setSupabaseClient] = useState(null);

  // 초기 언어 결정 (localStorage → 브라우저 → ko)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. localStorage 우선
    const saved = localStorage.getItem("k-alba-locale");
    if (saved && LOCALES[saved]) {
      setLocaleState(saved);
      return;
    }

    // 2. 브라우저 언어 감지
    const browserLang = navigator.language?.slice(0, 2);
    if (browserLang && LOCALES[browserLang]) {
      setLocaleState(browserLang);
      localStorage.setItem("k-alba-locale", browserLang);
    }
  }, []);

  // Supabase 동기화: 로그인 시 사용자 선호 언어 가져오기
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    (async () => {
      try {
        // Supabase 클라이언트 동적 import (SSR 안전)
        const { supabase } = await import("./supabase");
        if (cancelled || !supabase) return;
        setSupabaseClient(supabase);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("preferred_lang")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;

        const userLang = profile?.preferred_lang;
        if (userLang && LOCALES[userLang]) {
          setLocaleState(userLang);
          localStorage.setItem("k-alba-locale", userLang);
        }
      } catch (e) {
        console.warn("[i18n] Supabase 동기화 실패 (무시 가능):", e.message);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const setLocale = (newLocale) => {
    if (!LOCALES[newLocale]) return;
    setLocaleState(newLocale);

    if (typeof window !== "undefined") {
      localStorage.setItem("k-alba-locale", newLocale);
    }

    // Supabase 비동기 업데이트 (사용자 동의 없이 자동 저장)
    if (supabaseClient) {
      (async () => {
        try {
          const { data: { user } } = await supabaseClient.auth.getUser();
          if (!user) return;
          await supabaseClient
            .from("profiles")
            .update({ preferred_lang: newLocale })
            .eq("id", user.id);
        } catch (e) {
          console.warn("[i18n] 선호 언어 저장 실패:", e.message);
        }
      })();
    }
  };

  /**
   * t(key, vars?, fallback?)
   *
   * 사용 예:
   *   t("partwork.title")
   *   t("partwork.weeklyHours", { hours: 20 })           // 변수 보간
   *   t("missing.key", null, "기본값")                   // fallback
   */
  const t = (key, vars, fallback) => {
    const dict = LOCALES[locale]?.dict || ko;
    let val = resolveKey(dict, key);

    // 한국어로 폴백
    if (val === null) {
      val = resolveKey(ko, key);
    }

    if (val === null) {
      return fallback ?? key;
    }

    // 변수 보간 (vars가 객체일 때만)
    if (vars && typeof vars === "object") {
      return interpolate(val, vars);
    }

    return val;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  return useContext(I18nContext).t;
}

export function useLocale() {
  const { locale, setLocale } = useContext(I18nContext);
  return { locale, setLocale };
}

/**
 * 외부에서 변수 보간만 사용하고 싶을 때
 */
export { interpolate };
