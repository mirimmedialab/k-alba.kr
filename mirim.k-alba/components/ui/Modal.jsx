"use client";
import { useEffect } from "react";
import { T, L, TYPE } from "@/lib/theme";

/**
 * Modal 컴포넌트 (BI v2 Section 8.1)
 *
 * 데스크톱: 가운데 모달
 * 모바일: 하단 바텀시트
 *
 * 자동 분기: window.innerWidth < 640 → 바텀시트
 * 강제 지정 가능: variant prop
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {function} props.onClose
 * @param {string} [props.title]
 * @param {string} [props.description]
 * @param {React.ReactNode} props.children - 본문
 * @param {React.ReactNode} [props.footer] - 하단 액션 버튼들
 * @param {("auto"|"modal"|"sheet")} [props.variant="auto"]
 *   - auto: 화면 폭에 따라 자동 (데스크톱=modal, 모바일=sheet)
 *   - modal: 항상 가운데 모달
 *   - sheet: 항상 바텀시트
 * @param {("sm"|"md"|"lg"|"xl")} [props.size="md"] - 모달 크기
 * @param {boolean} [props.closeOnBackdrop=true] - 배경 클릭 시 닫기
 * @param {boolean} [props.showCloseButton=true]
 * @param {object} [props.style]
 * @param {string} [props.className]
 *
 * @example
 *   <Modal open={open} onClose={() => setOpen(false)} title="공고 등록" size="lg">
 *     <FormContent />
 *     <Footer>
 *       <Button variant="secondary">취소</Button>
 *       <Button variant="primary">등록</Button>
 *     </Footer>
 *   </Modal>
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = "auto",
  size = "md",
  closeOnBackdrop = true,
  showCloseButton = true,
  style,
  className,
}) {
  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handler);
    // body scroll 잠금
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  // ────────── 사이즈 (modal 변형) ──────────
  const modalSizes = {
    sm: 360,
    md: 480,
    lg: 600,
    xl: 800,
  };

  // 자동 분기 — 모바일 폭에서 바텀시트
  const useSheet = variant === "sheet" || (variant === "auto" && typeof window !== "undefined" && window.innerWidth < 640);

  // 닫기 버튼 (X)
  const CloseButton = () => (
    <button
      onClick={onClose}
      aria-label="닫기"
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: T.cream,
        color: T.ink2,
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        fontWeight: 600,
        zIndex: 1,
      }}
    >
      ×
    </button>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeOnBackdrop ? onClose : undefined}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 22, 40, 0.45)",
          backdropFilter: "blur(2px)",
          zIndex: L.zModal,
          animation: "k-modal-bg 0.2s ease-out",
        }}
      />

      {/* 모달/시트 */}
      {useSheet ? (
        // ────────── 바텀시트 (모바일) ──────────
        <div
          className={className}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "k-modal-title" : undefined}
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: T.paper,
            borderRadius: "20px 20px 0 0",
            zIndex: L.zModal + 1,
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            fontFamily: TYPE.family,
            animation: "k-sheet-up 0.25s ease-out",
            boxShadow: L.shadowXl,
            ...style,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 핸들바 */}
          <div style={{ padding: "12px 0 8px", display: "flex", justifyContent: "center" }}>
            <div
              style={{
                width: 36,
                height: 4,
                background: T.borderStrong,
                borderRadius: 2,
              }}
            />
          </div>

          {showCloseButton && <CloseButton />}

          {(title || description) && (
            <div style={{ padding: "12px 24px 16px" }}>
              {title && (
                <h2
                  id="k-modal-title"
                  style={{
                    ...TYPE.h2Style,
                    fontSize: 20,
                    color: T.ink,
                    marginBottom: description ? 4 : 0,
                  }}
                >
                  {title}
                </h2>
              )}
              {description && (
                <p style={{ fontSize: 13, color: T.ink3, lineHeight: 1.6 }}>
                  {description}
                </p>
              )}
            </div>
          )}

          <div style={{ padding: "0 24px 24px", overflowY: "auto", flex: 1 }}>
            {children}
          </div>

          {footer && (
            <div
              style={{
                padding: "16px 24px",
                borderTop: L.border,
                background: T.paper,
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              {footer}
            </div>
          )}
        </div>
      ) : (
        // ────────── 데스크톱 모달 ──────────
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: L.zModal + 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            pointerEvents: "none",
          }}
        >
          <div
            className={className}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "k-modal-title" : undefined}
            style={{
              background: T.paper,
              borderRadius: 16,
              boxShadow: L.shadowXl,
              width: "100%",
              maxWidth: modalSizes[size],
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              fontFamily: TYPE.family,
              position: "relative",
              animation: "k-modal-zoom 0.2s ease-out",
              pointerEvents: "auto",
              ...style,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {showCloseButton && <CloseButton />}

            {(title || description) && (
              <div style={{ padding: "24px 28px 12px" }}>
                {title && (
                  <h2
                    id="k-modal-title"
                    style={{
                      ...TYPE.h2Style,
                      fontSize: 20,
                      color: T.ink,
                      marginBottom: description ? 4 : 0,
                      paddingRight: 32,
                    }}
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p style={{ fontSize: 13, color: T.ink3, lineHeight: 1.6 }}>
                    {description}
                  </p>
                )}
              </div>
            )}

            <div style={{ padding: "12px 28px 24px", overflowY: "auto", flex: 1 }}>
              {children}
            </div>

            {footer && (
              <div
                style={{
                  padding: "16px 28px",
                  borderTop: L.border,
                  display: "flex",
                  gap: 12,
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                }}
              >
                {footer}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes k-modal-bg {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes k-modal-zoom {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes k-sheet-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
