"use client";
import { useState, useRef } from "react";
import { T, L, TYPE, SEMANTIC } from "@/lib/theme";

/**
 * EmailField — 아이디 + 도메인 선택/직접입력 통합 이메일 입력
 *
 * 한국 사이트에서 흔한 패턴: [아이디] @ [도메인 input] + [도메인 select ▼]
 *   - select에서 프리셋 도메인을 고르면 도메인 input이 자동으로 채워지고 잠김(읽기전용)
 *   - "직접 입력"을 고르면 도메인 input이 활성화되고 비워져 직접 타이핑
 * 부모에는 항상 완성된 이메일 문자열(`아이디@도메인`)을 onChange로 전달한다.
 * (참조 패턴: 네이버/다음 회원가입의 이메일 도메인 select)
 *
 * @param {string} value 전체 이메일 문자열
 * @param {(email:string)=>void} onChange
 * @param {string} [label="이메일"]
 * @param {boolean} [required]
 * @param {string} [error] 에러 메시지(있으면 빨간 보더 + 메시지)
 * @param {string} [hint] 도움말
 */

export const EMAIL_DOMAINS = [
  "naver.com",
  "gmail.com",
  "daum.net",
  "hanmail.net",
  "nate.com",
  "kakao.com",
  "outlook.com",
  "icloud.com",
  "hotmail.com",
];

/** 이메일 형식 검증 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function splitEmail(value) {
  const s = String(value || "");
  const at = s.indexOf("@");
  if (at < 0) return { local: s, domain: "" };
  return { local: s.slice(0, at), domain: s.slice(at + 1) };
}

export default function EmailField({
  value = "",
  onChange,
  label = "이메일",
  required = false,
  error,
  hint,
}) {
  const init = splitEmail(value);
  const [local, setLocal] = useState(init.local);
  const [domain, setDomain] = useState(init.domain);
  // select 값: 프리셋 도메인이면 그 값, 아니면 "" (직접 입력)
  const [selectVal, setSelectVal] = useState(
    EMAIL_DOMAINS.includes(init.domain) ? init.domain : ""
  );
  const domainRef = useRef(null);

  const locked = selectVal !== ""; // 프리셋 선택 시 도메인 input 잠금

  const emit = (l, d) => {
    onChange?.(d ? `${l}@${d}` : l);
  };

  const onLocalChange = (e) => {
    const v = e.target.value.replace(/[@\s]/g, "");
    setLocal(v);
    emit(v, domain);
  };

  const onDomainChange = (e) => {
    const v = e.target.value.replace(/[@\s]/g, "");
    setDomain(v);
    emit(local, v);
  };

  const onSelectChange = (e) => {
    const v = e.target.value;
    setSelectVal(v);
    if (v === "") {
      // 직접 입력 → 비우고 포커스
      setDomain("");
      emit(local, "");
      setTimeout(() => domainRef.current?.focus(), 0);
    } else {
      setDomain(v);
      emit(local, v);
    }
  };

  const borderColor = error ? SEMANTIC.error.color : T.borderStrong;
  const fieldStyle = {
    flex: 1,
    minWidth: 0,
    padding: "12px 14px",
    fontSize: 15,
    fontFamily: TYPE.family,
    border: `1px solid ${borderColor}`,
    borderRadius: L.rMd,
    outline: "none",
    color: T.ink,
    background: T.paper,
    boxSizing: "border-box",
  };

  return (
    <div style={{ width: "100%" }}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: T.ink,
            marginBottom: 6,
            letterSpacing: "-0.01em",
          }}
        >
          {label}
          {required && <span style={{ color: T.error, marginLeft: 4 }}>*</span>}
        </label>
      )}

      {/* [아이디] @ [도메인] */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="text"
          inputMode="email"
          autoComplete="email"
          value={local}
          onChange={onLocalChange}
          placeholder="이메일"
          style={fieldStyle}
        />
        <span style={{ fontSize: 15, color: T.ink2, flexShrink: 0 }}>@</span>
        <input
          ref={domainRef}
          type="text"
          value={domain}
          onChange={onDomainChange}
          disabled={locked}
          placeholder="직접 입력"
          style={{
            ...fieldStyle,
            background: locked ? T.cream : T.paper,
            color: locked ? T.ink2 : T.ink,
            cursor: locked ? "not-allowed" : "text",
          }}
        />
      </div>

      {/* 도메인 선택 */}
      <select
        value={selectVal}
        onChange={onSelectChange}
        style={{
          width: "100%",
          marginTop: 8,
          padding: "12px 14px",
          fontSize: 15,
          fontFamily: TYPE.family,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: L.rMd,
          outline: "none",
          color: T.ink,
          background: T.paper,
          boxSizing: "border-box",
          cursor: "pointer",
        }}
      >
        <option value="">직접 입력</option>
        {EMAIL_DOMAINS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      {(error || hint) && (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: error ? SEMANTIC.error.color : T.ink3,
            lineHeight: 1.5,
          }}
        >
          {error || hint}
        </div>
      )}
    </div>
  );
}
