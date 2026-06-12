"use client";

/**
 * BrandLogo — K-ALBA 워드마크 + 돋보기 심볼 (벡터)
 *
 * 업로드된 PNG(돋보기형 K-ALBA)를 벡터로 재현한 로고.
 * 랜딩 외 모든 페이지(NavBar)에서 사용한다.
 *
 * props:
 *   - size: 워드마크 글자 크기(px). 심볼은 비례 확대. 기본 20.
 *   - color: 로고 색(네이비). 기본 #16243F.
 */
export default function BrandLogo({ size = 20, color = "#16243F" }) {
  const icon = Math.round(size * 1.25);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: Math.round(size * 0.32) }}>
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 64 64"
        fill="none"
        role="img"
        aria-label="K-ALBA"
        style={{ flexShrink: 0 }}
      >
        <circle cx="27" cy="27" r="19" stroke={color} strokeWidth="6" fill="none" />
        <circle cx="27" cy="27" r="11" stroke={color} strokeWidth="3" fill="none" opacity="0.5" />
        <line x1="41" y1="41" x2="55" y2="55" stroke={color} strokeWidth="7" strokeLinecap="round" />
      </svg>
      <span style={{ fontWeight: 800, fontSize: size, letterSpacing: "-0.03em", color, whiteSpace: "nowrap" }}>
        K-ALBA
      </span>
    </span>
  );
}
