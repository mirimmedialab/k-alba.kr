"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import { T } from "@/lib/theme";

/**
 * SignaturePad — Canvas 기반 손글씨 서명 컴포넌트
 *
 * 특징:
 *   - 모바일 터치 + 데스크탑 마우스 + 스타일러스 모두 지원
 *   - 부드러운 곡선 (quadratic Bezier)
 *   - 서명 지우기 / 미리보기 / 저장
 *   - 획수 검증 (너무 짧은 서명 거부, 기본 최소 10개 점)
 *   - PNG base64 반환 (onSave 콜백)
 *   - Retina 디스플레이 대응 (devicePixelRatio)
 *
 * Props:
 *   @param onSave(dataUrl, meta) 서명 완료 시 호출
 *     meta: { strokeCount, duration, width, height }
 *   @param defaultValue 기존 서명 (재사용 시)
 *   @param height 캔버스 높이 (기본 200)
 *   @param label 타이틀 (예: "근로자 서명")
 *   @param disabled 서명 편집 잠금
 */
export default function SignaturePad({
  onSave,
  defaultValue = null,
  height = 200,
  label = "서명",
  sublabel = "",
  disabled = false,
  penColor = "#0A1628",
  minStrokes = 1,
  minPoints = 10,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!defaultValue);
  const [strokeCount, setStrokeCount] = useState(0);
  const [pointCount, setPointCount] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const lastPoint = useRef(null);

  // ─── 캔버스 초기화 (Retina 대응) ───
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = rect.width;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.5;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    // 기존 서명 복원
    if (defaultValue) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, width, height);
      img.src = defaultValue;
    }
  }, [defaultValue, height, penColor]);

  useEffect(() => {
    setupCanvas();
    const onResize = () => setupCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setupCanvas]);

  // ─── 좌표 추출 (터치/마우스 통합) ───
  const getCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // ─── 그리기 시작 ───
  const startDrawing = (e) => {
    if (disabled) return;
    e.preventDefault();
    if (!startedAt) setStartedAt(Date.now());

    const coords = getCoords(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);

    lastPoint.current = coords;
    setIsDrawing(true);
    setStrokeCount((c) => c + 1);
  };

  // ─── 그리기 진행 (부드러운 곡선) ───
  const draw = (e) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();

    const coords = getCoords(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (lastPoint.current) {
      // quadratic Bezier로 부드러운 곡선
      const midX = (lastPoint.current.x + coords.x) / 2;
      const midY = (lastPoint.current.y + coords.y) / 2;
      ctx.quadraticCurveTo(
        lastPoint.current.x,
        lastPoint.current.y,
        midX,
        midY
      );
      ctx.stroke();
    }

    lastPoint.current = coords;
    setPointCount((c) => c + 1);
    setHasSignature(true);
  };

  // ─── 그리기 종료 ───
  const stopDrawing = (e) => {
    if (disabled) return;
    if (e) e.preventDefault();
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.closePath();
    lastPoint.current = null;
  };

  // ─── 지우기 ───
  const clear = () => {
    if (disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = containerRef.current.getBoundingClientRect();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, rect.width, height);
    setHasSignature(false);
    setStrokeCount(0);
    setPointCount(0);
    setStartedAt(null);
  };

  // ─── 저장 (PNG base64 + 메타) ───
  const save = async () => {
    if (!hasSignature || pointCount < minPoints) {
      alert(`서명이 너무 짧습니다. 조금 더 그려주세요.`);
      return;
    }
    if (strokeCount < minStrokes) {
      alert("서명이 유효하지 않습니다.");
      return;
    }

    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL("image/png");
    const duration = startedAt ? Date.now() - startedAt : 0;

    // 해시 생성 (브라우저에서도 작동)
    let hash = null;
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(dataUrl);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      hash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch (e) {
      console.warn("[SignaturePad] hash failed:", e);
    }

    onSave?.(dataUrl, {
      strokeCount,
      pointCount,
      duration,
      width: canvas.width,
      height: canvas.height,
      hash,
    });
  };

  return (
    <div style={{ width: "100%" }}>
      {/* 라벨 */}
      {label && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}>
          <div>
            <div style={{
              fontSize: 13,
              fontWeight: 800,
              color: T.ink,
              letterSpacing: "-0.02em",
            }}>
              {label}
            </div>
            {sublabel && (
              <div style={{ fontSize: 11, color: T.ink3, marginTop: 2 }}>
                {sublabel}
              </div>
            )}
          </div>
          {hasSignature && !disabled && (
            <button
              type="button"
              onClick={clear}
              style={{
                background: "none",
                border: "none",
                color: T.accent,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                padding: "4px 8px",
                fontFamily: "inherit",
              }}
            >
              🔄 다시 그리기
            </button>
          )}
        </div>
      )}

      {/* 캔버스 컨테이너 */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          border: `2px solid ${hasSignature ? T.gold : T.border}`,
          borderRadius: 4,
          background: "#FFFFFF",
          overflow: "hidden",
          touchAction: "none",
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{
            display: "block",
            cursor: disabled ? "not-allowed" : "crosshair",
            opacity: disabled ? 0.5 : 1,
          }}
        />

        {/* 빈 상태 가이드 */}
        {!hasSignature && !disabled && (
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: 13,
            color: T.ink3,
            pointerEvents: "none",
            textAlign: "center",
            lineHeight: 1.6,
          }}>
            👆 이곳을 터치하여<br />서명해 주세요
          </div>
        )}

        {/* 서명선 (바닥) */}
        <div style={{
          position: "absolute",
          left: 20,
          right: 20,
          bottom: 30,
          height: 1,
          background: T.border,
          pointerEvents: "none",
        }} />
      </div>

      {/* 정보 + 저장 버튼 */}
      {!disabled && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 10,
        }}>
          <div style={{ fontSize: 11, color: T.ink3 }}>
            {hasSignature
              ? `획수: ${strokeCount} · 점: ${pointCount}`
              : "손가락이나 마우스로 서명하세요"
            }
          </div>
          {hasSignature && (
            <button
              type="button"
              onClick={save}
              style={{
                padding: "10px 20px",
                background: T.n9,
                color: T.gold,
                border: "none",
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "-0.01em",
              }}
            >
              ✓ 서명 완료
            </button>
          )}
        </div>
      )}

      {/* 법적 고지 */}
      <div style={{
        marginTop: 10,
        padding: 10,
        background: T.cream,
        borderLeft: `3px solid ${T.gold}`,
        borderRadius: "0 4px 4px 0",
        fontSize: 10,
        color: T.ink2,
        lineHeight: 1.6,
      }}>
        <strong>법적 고지:</strong> 본 서명은 전자서명법 제3조에 따라 당사자 간
        합의된 전자서명으로 효력을 갖습니다. 서명 시점의 IP, 기기 정보, 접속 시각이
        감사 로그에 기록됩니다.
      </div>
    </div>
  );
}
