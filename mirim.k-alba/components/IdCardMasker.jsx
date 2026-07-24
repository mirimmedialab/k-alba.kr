"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { T } from "@/lib/theme";

/**
 * IdCardMasker — 신분증 민감정보 마스킹 편집기
 *
 * 사진(주민등록증/운전면허증)을 화면에 띄우고, 사용자가 드래그로
 * 가릴 영역(주민등록번호 뒷자리 등)을 지정하면 검정 박스를 이미지에
 * 직접 굽는다(canvas). 서버에는 마스킹된 이미지만 업로드되고
 * 원본은 기기를 벗어나지 않는다. EXIF(위치정보 등)도 자동 제거됨.
 *
 * Props:
 *   file: File (image/*)
 *   onDone(blob): 마스킹 완료된 JPEG Blob
 *   onCancel()
 */
const MAX_W = 1200; // 업로드 이미지 최대 폭 (용량·화질 균형)

// 신분증 종류별 민감정보 예상 위치 가이드 (이미지 대비 상대좌표)
// ※ 촬영 각도·여백에 따라 실제 위치는 달라질 수 있어 '대략적 안내'로만 표시
const GUIDES = {
  rrn: {
    label: "주민등록증",
    zones: [{ x: 0.28, y: 0.27, w: 0.30, h: 0.13, name: "주민번호 뒷자리" }],
  },
  license: {
    label: "운전면허증",
    zones: [
      { x: 0.40, y: 0.32, w: 0.32, h: 0.12, name: "주민번호 뒷자리" },
      { x: 0.30, y: 0.15, w: 0.36, h: 0.11, name: "면허번호" },
    ],
  },
};

export default function IdCardMasker({ file, onDone, onCancel }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [rects, setRects] = useState([]);       // 확정된 마스킹 박스 [{x,y,w,h}] (캔버스 좌표)
  const [drag, setDrag] = useState(null);       // 드래그 중 박스
  const [ready, setReady] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [docKind, setDocKind] = useState("rrn"); // rrn: 주민등록증 | license: 운전면허증

  // 이미지 로드 → 캔버스 크기 결정
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setReady(true);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      alert("이미지를 불러올 수 없습니다. 다른 파일을 선택해 주세요.");
      onCancel?.();
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // 렌더링 (이미지 + 확정 박스 + 드래그 중 박스)
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const scale = Math.min(1, MAX_W / img.width);
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    for (const r of rects) ctx.fillRect(r.x, r.y, r.w, r.h);
    // 예상 위치 가이드 (점선 — 실제 업로드 이미지에는 포함되지 않음)
    for (const z of GUIDES[docKind].zones) {
      const gx = z.x * canvas.width, gy = z.y * canvas.height;
      const gw = z.w * canvas.width, gh = z.h * canvas.height;
      ctx.save();
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.strokeRect(gx, gy, gw, gh);
      ctx.setLineDash([]);
      const fs = Math.max(11, canvas.width * 0.022);
      ctx.font = `700 ${fs}px sans-serif`;
      const tw = ctx.measureText(`📍 ${z.name}`).width;
      ctx.fillStyle = "rgba(245,158,11,0.92)";
      ctx.fillRect(gx, Math.max(0, gy - fs - 8), tw + 12, fs + 8);
      ctx.fillStyle = "#fff";
      ctx.fillText(`📍 ${z.name}`, gx + 6, Math.max(fs, gy - 6));
      ctx.restore();
    }
    if (drag) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(drag.x, drag.y, drag.w, drag.h);
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 2;
      ctx.strokeRect(drag.x, drag.y, drag.w, drag.h);
    }
  }, [rects, drag, docKind]);

  useEffect(() => { if (ready) redraw(); }, [ready, redraw]);

  // 포인터 좌표 → 캔버스 좌표
  const toCanvasXY = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = toCanvasXY(e);
    setDrag({ sx: p.x, sy: p.y, x: p.x, y: p.y, w: 0, h: 0 });
  };
  const onPointerMove = (e) => {
    if (!drag) return;
    e.preventDefault();
    const p = toCanvasXY(e);
    setDrag((d) => d && {
      ...d,
      x: Math.min(d.sx, p.x), y: Math.min(d.sy, p.y),
      w: Math.abs(p.x - d.sx), h: Math.abs(p.y - d.sy),
    });
  };
  const onPointerUp = () => {
    if (drag && drag.w > 6 && drag.h > 6) {
      setRects((rs) => [...rs, { x: drag.x, y: drag.y, w: drag.w, h: drag.h }]);
    }
    setDrag(null);
  };

  const handleDone = () => {
    if (rects.length === 0) {
      alert("가릴 영역을 최소 1곳 지정해 주세요.\n(주민등록번호 뒷자리는 반드시 가려야 해요)");
      return;
    }
    if (!confirmed) {
      alert("아래 확인 체크박스에 체크해 주세요.");
      return;
    }
    setDrag(null);
    // drag 오버레이 없는 최종 상태로 다시 그린 뒤 내보내기
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    for (const r of rects) ctx.fillRect(r.x, r.y, r.w, r.h);
    canvas.toBlob((blob) => {
      if (blob) onDone?.(blob);
      else alert("이미지 생성에 실패했습니다. 다시 시도해 주세요.");
    }, "image/jpeg", 0.88);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 14,
    }}>
      <div style={{ background: "#fff", borderRadius: 14, maxWidth: 560, width: "100%", maxHeight: "92vh", overflow: "auto", padding: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: T.ink, marginBottom: 4 }}>
          🪪 신분증 민감정보 가리기
        </div>
        <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.6, marginBottom: 8 }}>
          주황 점선(📍 예상 위치)을 참고해 <strong>주민등록번호 뒷자리(7자리)</strong>를
          드래그로 가려주세요. 사진 각도에 따라 위치가 다를 수 있으니 실제 번호 위에 맞춰주세요.
          <br />
          <span style={{ color: "#059669", fontWeight: 700 }}>🔒 가려진 이미지만 저장되며, 원본은 휴대폰/PC를 벗어나지 않아요.</span>
        </div>

        {/* 신분증 종류 선택 → 가이드 위치 변경 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {Object.entries(GUIDES).map(([k, g]) => (
            <button key={k} onClick={() => setDocKind(k)} style={{
              padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
              fontFamily: "inherit", cursor: "pointer",
              border: `1.5px solid ${docKind === k ? "#F59E0B" : "#E5E5E5"}`,
              background: docKind === k ? "#FEF3C7" : "#FAFAFA",
              color: docKind === k ? "#92400E" : "#666",
            }}>
              {g.label}
            </button>
          ))}
          <button onClick={() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const zs = GUIDES[docKind].zones.map((z) => ({
              x: z.x * canvas.width, y: z.y * canvas.height,
              w: z.w * canvas.width, h: z.h * canvas.height,
            }));
            setRects((rs) => [...rs, ...zs]);
          }} style={{
            marginLeft: "auto", padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
            fontFamily: "inherit", cursor: "pointer", border: "1.5px solid #059669",
            background: "#ECFDF5", color: "#047857",
          }}>
            📍 가이드 위치 바로 가리기
          </button>
        </div>

        {!ready ? (
          <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontSize: 13 }}>이미지 불러오는 중...</div>
        ) : (
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ width: "100%", borderRadius: 8, border: `1px solid ${T.border}`, cursor: "crosshair", touchAction: "none", display: "block" }}
          />
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={() => setRects((rs) => rs.slice(0, -1))} disabled={!rects.length} style={btnGhost}>↩️ 되돌리기</button>
          <button onClick={() => setRects([])} disabled={!rects.length} style={btnGhost}>🗑 전체 지우기</button>
          <span style={{ marginLeft: "auto", fontSize: 11, color: T.ink3, alignSelf: "center" }}>가린 영역 {rects.length}곳</span>
        </div>

        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 12, fontSize: 12, color: T.ink2, cursor: "pointer" }}>
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} style={{ marginTop: 2 }} />
          <span>주민등록번호 뒷자리 등 민감정보를 모두 가렸음을 확인했습니다.</span>
        </label>

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={onCancel} style={{ ...btnGhost, flex: 1, padding: "12px 0" }}>취소</button>
          <button onClick={handleDone} style={{
            flex: 2, padding: "12px 0", background: T.green, color: "#fff", border: "none",
            borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
          }}>
            ✅ 가린 이미지로 업로드
          </button>
        </div>
      </div>
    </div>
  );
}

const btnGhost = {
  background: "#F5F5F5", border: "1px solid #E5E5E5", borderRadius: 6,
  padding: "7px 10px", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit", color: "#444",
};
