"use client";
import Link from "next/link";
import { T } from "@/lib/theme";

/**
 * /account/goodbye — 회원 탈퇴 완료 안내(작별 화면)
 * 탈퇴(비활성화) 처리 후 이동. 이미 로그아웃된 상태의 공개 페이지.
 */
export default function GoodbyePage() {
  return (
    <div style={{
      minHeight: "70vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "40px 24px",
    }}>
      <div style={{ fontSize: 44, marginBottom: 18 }}>👋</div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: T.ink, letterSpacing: "-0.02em", marginBottom: 14 }}>
        탈퇴가 완료되었어요
      </h1>
      <p style={{ fontSize: 14.5, color: T.ink2, lineHeight: 1.8, maxWidth: 420, marginBottom: 8 }}>
        그동안 K-ALBA를 이용해 주셔서 진심으로 감사했어요.<br />
        더 나은 모습으로 준비하고 있을 테니,<br />
        언젠가 다시 필요하실 때 또 찾아주세요.
      </p>
      <p style={{ fontSize: 12.5, color: T.ink3, lineHeight: 1.7, maxWidth: 420, marginBottom: 28 }}>
        계정 정보는 일정 기간 보관되며, 다시 이용하고 싶으시면 고객센터를 통해 복구하실 수 있어요.
      </p>
      <Link href="/" style={{ textDecoration: "none" }}>
        <span style={{
          display: "inline-block",
          padding: "13px 28px",
          background: T.n9,
          color: T.paper,
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: "-0.01em",
        }}>
          홈으로
        </span>
      </Link>
    </div>
  );
}
