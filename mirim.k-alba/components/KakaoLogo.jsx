"use client";

/**
 * KakaoLogo — 카카오톡 공식 말풍선 심볼 (로그인 버튼용)
 *
 * 노란 카카오 버튼 위에 올리는 기본 색(#191600)을 사용한다.
 *
 * @param {number} [size=18] - 가로/세로 px
 * @param {string} [color="#191600"] - 말풍선 색
 */
export default function KakaoLogo({ size = 18, color = "#191600" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <path
        fill={color}
        d="M128 36C70.56 36 24 72.71 24 118c0 29.28 19.47 54.97 48.75 69.48-1.6 5.5-10.24 35.34-10.58 37.69 0 0-.21 1.76.93 2.43 1.14.68 2.48.15 2.48.15 3.27-.46 37.94-24.81 43.93-29.04 5.85.83 11.86 1.29 18.49 1.29 57.44 0 104-36.71 104-82s-46.56-82-104-82Z"
      />
    </svg>
  );
}
