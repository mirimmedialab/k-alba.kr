"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { ko } from "./locales/ko";
import { en } from "./locales/en";
import { zh } from "./locales/zh";
import { vi } from "./locales/vi";
import { uz } from "./locales/uz";
import { mn } from "./locales/mn";
import { ja } from "./locales/ja";

export const LOCALES = {
  ko: { name: "한국어", flag: "🇰🇷", dict: ko },
  en: { name: "English", flag: "🇺🇸", dict: en },
  zh: { name: "中文", flag: "🇨🇳", dict: zh },
  vi: { name: "Tiếng Việt", flag: "🇻🇳", dict: vi },
  uz: { name: "O'zbek", flag: "🇺🇿", dict: uz },
  mn: { name: "Монгол", flag: "🇲🇳", dict: mn },
  ja: { name: "日本語", flag: "🇯🇵", dict: ja },
};

const I18nContext = createContext({ locale: "ko", setLocale: () => {}, t: (k) => k });

// key로 중첩 dict 조회 - "address.search" → dict.address.search
function resolveKey(dict, key) {
  const parts = key.split(".");
  let cur = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) cur = cur[p];
    else return null;
  }
  return typeof cur === "string" ? cur : null;
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState("ko");

  // localStorage에서 언어 복원
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("k-alba-locale");
    if (saved && LOCALES[saved]) setLocaleState(saved);
    else {
      // 브라우저 언어 감지
      const browserLang = navigator.language?.slice(0, 2);
      if (browserLang && LOCALES[browserLang]) setLocaleState(browserLang);
    }
  }, []);

  const setLocale = (newLocale) => {
    if (!LOCALES[newLocale]) return;
    setLocaleState(newLocale);
    if (typeof window !== "undefined") {
      localStorage.setItem("k-alba-locale", newLocale);
    }
  };

  const t = (key, fallback) => {
    const dict = LOCALES[locale]?.dict || ko;
    const val = resolveKey(dict, key);
    if (val !== null) return val;
    // 한국어로 폴백
    const koVal = resolveKey(ko, key);
    if (koVal !== null) return koVal;
    return fallback || key;
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
