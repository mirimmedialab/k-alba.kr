"use client";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { signOut } from "@/lib/supabase";

/**
 * UserChip — 우측 상단 사용자 정보 칩
 *
 * 로그인한 사용자의 이름과 로그아웃 버튼을 표시합니다.
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

  const userName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "사용자";

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        ...style,
      }}
    >
      {/* 이름 표시 */}
      <div
        style={{
          padding: "7px 14px",
          borderRadius: 8,
          background: "rgba(255,255,255,0.95)",
          border: `1px solid ${T.g200}`,
          fontSize: 13,
          fontWeight: 600,
          color: T.navy,
          letterSpacing: "-0.01em",
        }}
      >
        {userName}님
      </div>

      {/* 로그아웃 버튼 */}
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
