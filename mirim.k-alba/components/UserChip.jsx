"use client";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { signOut } from "@/lib/supabase";

/**
 * UserChip — 우측 상단 사용자 정보 칩
 *
 * 로그아웃 버튼을 표시합니다. (이름 표시는 인사 제목과 중복되어 제거)
 * 랜딩 페이지 HERO 섹션에서 사용됩니다.
 */
export function UserChip({ user, style = {} }) {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push("/");
    // 페이지 새로고침하여 상태 초기화
    router.refresh();
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        ...style,
      }}
    >
      {/* 로그아웃 버튼 (이름 칩은 인사말과 중복되어 제거됨) */}
      <button
        onClick={handleLogout}
        style={{
          padding: "7px 14px",
          borderRadius: 8,
          background: "transparent",
          border: `1px solid rgba(255,255,255,0.4)`,
          fontSize: 12,
          fontWeight: 600,
          color: "rgba(255,255,255,0.9)",
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.1)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.6)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
        }}
      >
        로그아웃
      </button>
    </div>
  );
}
