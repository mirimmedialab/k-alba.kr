"use client";
import { useState, useRef } from "react";
import { T } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

/**
 * FileUpload — PartWork 서류 업로드 컴포넌트
 *
 * Props:
 *   docType: "contract" | "enrollment" | "grade" | "topik_cert" | "passport" | "arc" | "transcript" | "attendance"
 *   label: 표시 이름
 *   subtitle: 보조 설명
 *   icon: 이모지 아이콘
 *   required: 필수 여부
 *   applicationId?: 이미 제출된 신청서 ID (수정 모드)
 *   onChange(result): 업로드 완료 시 호출
 *     result: { storage_path, file_url, file_name }
 *   initialFile?: 기존 파일 { name, url }
 *
 * UI 상태:
 *   idle → picking → uploading → uploaded
 *   실패 시 error 상태
 */
export default function FileUpload({
  docType,
  label,
  subtitle = "",
  icon = "📎",
  required = false,
  applicationId = null,
  onChange,
  initialFile = null,
}) {
  const inputRef = useRef(null);
  const cameraRef = useRef(null);
  const [state, setState] = useState(initialFile ? "uploaded" : "idle");
  const [file, setFile] = useState(initialFile);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const handlePickFile = () => {
    if (state === "uploading") return;
    inputRef.current?.click();
  };

  const handlePickCamera = () => {
    if (state === "uploading") return;
    cameraRef.current?.click();
  };

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setError(null);

    // 클라이언트 검증
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(f.type)) {
      setError("JPG, PNG, WEBP, PDF 파일만 업로드 가능합니다.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("파일 크기는 10MB 이하여야 합니다.");
      return;
    }

    setState("uploading");
    setProgress(20);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        setError("로그인이 필요합니다.");
        setState("idle");
        return;
      }

      setProgress(40);

      const formData = new FormData();
      formData.append("file", f);
      formData.append("doc_type", docType);
      if (applicationId) formData.append("application_id", applicationId);

      setProgress(60);

      const res = await fetch("/api/partwork/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      setProgress(90);

      const data = await res.json();

      if (!data.ok) {
        setError(data.error || "업로드 실패");
        setState("idle");
        return;
      }

      setProgress(100);
      const newFile = {
        name: data.file_name,
        url: data.file_url,
        storage_path: data.storage_path,
        size: data.size,
      };
      setFile(newFile);
      setState("uploaded");
      onChange?.(newFile);
    } catch (err) {
      setError(err.message || "네트워크 오류");
      setState("idle");
    }

    // input 초기화 (같은 파일 재선택 가능)
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = () => {
    setFile(null);
    setState("idle");
    setProgress(0);
    setError(null);
    onChange?.(null);
  };

  const isImage = file?.name && /\.(jpe?g|png|webp)$/i.test(file.name);

  return (
    <div style={{
      padding: 14,
      background: "#FFF",
      border: `1.5px solid ${
        state === "uploaded" ? "#6EE7B7"
        : state === "uploading" ? "#93C5FD"
        : error ? "#FCA5A5"
        : "#E4E2DE"
      }`,
      borderRadius: 10,
      marginBottom: 10,
      transition: "all 0.2s",
    }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={handleFile}
        style={{ display: "none" }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{ display: "none" }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          fontSize: 24,
          width: 44,
          height: 44,
          borderRadius: 8,
          background: state === "uploaded" ? "#D1FAE5" : "#F5F5F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          {state === "uploaded" ? "✓" : state === "uploading" ? "⏳" : icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#111" }}>
              {label}
            </span>
            {required && (
              <span style={{
                fontSize: 9,
                color: "#E03030",
                fontWeight: 700,
                padding: "1px 5px",
                background: "#FEE2E2",
                borderRadius: 3,
              }}>
                필수
              </span>
            )}
          </div>

          {state === "idle" && (
            <div style={{ fontSize: 11, color: "#888", lineHeight: 1.5 }}>
              {subtitle || "사진 찍거나 파일 선택 (JPG/PNG/PDF, 10MB 이하)"}
            </div>
          )}

          {state === "uploading" && (
            <div>
              <div style={{ fontSize: 11, color: "#1A56F0", fontWeight: 600, marginBottom: 4 }}>
                업로드 중... {progress}%
              </div>
              <div style={{
                width: "100%",
                height: 3,
                background: "#DBEAFE",
                borderRadius: 2,
                overflow: "hidden",
              }}>
                <div style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: "#1A56F0",
                  transition: "width 0.3s",
                }} />
              </div>
            </div>
          )}

          {state === "uploaded" && file && (
            <div style={{ fontSize: 11, color: "#065F46", fontWeight: 600, marginTop: 2 }}>
              ✓ {file.name}
              {file.size && (
                <span style={{ color: "#888", fontWeight: 400, marginLeft: 6 }}>
                  ({formatSize(file.size)})
                </span>
              )}
            </div>
          )}

          {error && (
            <div style={{ fontSize: 11, color: "#E03030", fontWeight: 600, marginTop: 2 }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {state === "idle" && (
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button
              type="button"
              onClick={handlePickCamera}
              style={{
                padding: "8px 10px",
                background: "#FFF",
                color: "#111",
                border: "1.5px solid #111",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                flexShrink: 0,
              }}
              title="카메라로 촬영"
            >
              📷 촬영
            </button>
            <button
              type="button"
              onClick={handlePickFile}
              style={{
                padding: "8px 10px",
                background: "#111",
                color: "#FFF",
                border: "1.5px solid #111",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                flexShrink: 0,
              }}
              title="파일에서 선택"
            >
              📁 파일
            </button>
          </div>
        )}

        {state === "uploaded" && (
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {file?.url && (
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "6px 10px",
                  background: "#F5F5F0",
                  color: "#111",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  textDecoration: "none",
                }}
              >
                보기
              </a>
            )}
            <button
              type="button"
              onClick={handleRemove}
              style={{
                padding: "6px 10px",
                background: "#FEE2E2",
                color: "#991B1B",
                border: "none",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              삭제
            </button>
          </div>
        )}
      </div>

      {/* 업로드된 이미지 미리보기 */}
      {state === "uploaded" && isImage && file?.url && (
        <div style={{
          marginTop: 10,
          padding: 8,
          background: "#F5F5F0",
          borderRadius: 6,
        }}>
          <img
            src={file.url}
            alt={file.name}
            style={{
              maxWidth: "100%",
              maxHeight: 200,
              borderRadius: 4,
              display: "block",
              margin: "0 auto",
            }}
          />
        </div>
      )}
    </div>
  );
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
