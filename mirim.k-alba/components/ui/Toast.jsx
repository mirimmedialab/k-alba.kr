"use client";
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { T, L, TYPE, SEMANTIC } from "@/lib/theme";

/**
 * Toast 컴포넌트 (BI v2 Section 8.1)
 *
 * 사용 흐름:
 *   1. layout.jsx 또는 최상위에 <ToastProvider> 감싸기
 *   2. 자식 컴포넌트에서 useToast() 훅으로 toast.show(...) 호출
 *
 * @example
 *   // app/layout.jsx
 *   <ToastProvider>
 *     {children}
 *   </ToastProvider>
 *
 *   // 어떤 컴포넌트에서든
 *   const toast = useToast();
 *   toast.success("저장되었습니다");
 *   toast.error("저장에 실패했습니다");
 *   toast.warning("기한이 임박했습니다");
 *   toast.info("새 알림이 있어요");
 *
 *   // 또는 더 자세한 옵션
 *   toast.show({
 *     variant: "success",
 *     title: "지원 완료",
 *     message: "결과는 카톡으로 알려드릴게요",
 *     duration: 4000,
 *     action: { label: "확인", onClick: () => {} }
 *   });
 */


// ────────── Context ──────────
const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // 개발 환경에서 Provider 없을 때 경고
    if (typeof window !== "undefined") {
      console.warn("useToast() requires <ToastProvider>. Falling back to console.");
    }
    return {
      show: (opts) => console.log("[toast]", opts),
      success: (m) => console.log("[toast.success]", m),
      error: (m) => console.warn("[toast.error]", m),
      warning: (m) => console.log("[toast.warning]", m),
      info: (m) => console.log("[toast.info]", m),
      dismiss: () => {},
    };
  }
  return ctx;
}


// ────────── Provider ──────────

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {("top-right"|"top-center"|"bottom-right"|"bottom-center")} [props.position="bottom-center"]
 * @param {number} [props.maxToasts=3] - 동시 표시 최대 개수
 */
export function ToastProvider({ children, position = "bottom-center", maxToasts = 3 }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((opts) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = opts.duration ?? 3500;
    const toast = { id, ...opts };

    setToasts((prev) => {
      const next = [...prev, toast];
      // maxToasts 초과 시 가장 오래된 것 제거
      if (next.length > maxToasts) return next.slice(next.length - maxToasts);
      return next;
    });

    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss, maxToasts]);

  const api = {
    show,
    success: (msg, opts) => show({ variant: "success", message: msg, ...opts }),
    error: (msg, opts) => show({ variant: "error", message: msg, ...opts }),
    warning: (msg, opts) => show({ variant: "warning", message: msg, ...opts }),
    info: (msg, opts) => show({ variant: "info", message: msg, ...opts }),
    dismiss,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} position={position} />
    </ToastContext.Provider>
  );
}


// ────────── Container (실제 렌더링) ──────────

function ToastContainer({ toasts, dismiss, position }) {
  // 위치별 스타일
  const posStyles = {
    "top-right": { top: 20, right: 20, alignItems: "flex-end" },
    "top-center": { top: 20, left: "50%", transform: "translateX(-50%)", alignItems: "center" },
    "bottom-right": { bottom: 20, right: 20, alignItems: "flex-end" },
    "bottom-center": { bottom: 20, left: "50%", transform: "translateX(-50%)", alignItems: "center" },
  };

  const isTop = position.startsWith("top");

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="알림"
      style={{
        position: "fixed",
        zIndex: L.zToast,
        display: "flex",
        flexDirection: isTop ? "column" : "column-reverse",
        gap: 8,
        padding: 8,
        pointerEvents: "none",
        ...posStyles[position],
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} onDismiss={() => dismiss(toast.id)} />
      ))}

      <style>{`
        @keyframes k-toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}


// ────────── ToastItem (단일 토스트) ──────────

function ToastItem({ variant = "info", title, message, action, onDismiss }) {
  // 변형별 스타일
  const variantStyles = {
    success: { color: SEMANTIC.success.color, bg: SEMANTIC.success.bg, text: SEMANTIC.success.text, icon: "✓" },
    warning: { color: SEMANTIC.warning.color, bg: SEMANTIC.warning.bg, text: SEMANTIC.warning.text, icon: "⚠" },
    error: { color: SEMANTIC.error.color, bg: SEMANTIC.error.bg, text: SEMANTIC.error.text, icon: "✗" },
    info: { color: SEMANTIC.info.color, bg: SEMANTIC.info.bg, text: SEMANTIC.info.text, icon: "ℹ" },
  };

  const v = variantStyles[variant] || variantStyles.info;

  return (
    <div
      role="status"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "12px 16px",
        background: T.paper,
        borderRadius: 12,
        boxShadow: L.shadowLg,
        borderLeft: `4px solid ${v.color}`,
        minWidth: 280,
        maxWidth: 420,
        fontFamily: TYPE.family,
        animation: "k-toast-in 0.2s ease-out",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: v.bg,
          color: v.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {v.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 2 }}>
            {title}
          </div>
        )}
        {message && (
          <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5, wordBreak: "keep-all" }}>
            {message}
          </div>
        )}
        {action && (
          <button
            onClick={() => {
              action.onClick?.();
              onDismiss();
            }}
            style={{
              marginTop: 8,
              fontSize: 12,
              fontWeight: 700,
              color: v.color,
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {action.label}
          </button>
        )}
      </div>

      <button
        onClick={onDismiss}
        aria-label="닫기"
        style={{
          width: 20,
          height: 20,
          background: "transparent",
          border: "none",
          color: T.ink3,
          cursor: "pointer",
          fontSize: 16,
          lineHeight: 1,
          flexShrink: 0,
          padding: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
