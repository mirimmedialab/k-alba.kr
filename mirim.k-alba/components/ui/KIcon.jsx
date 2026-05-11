"use client";
import { T, TYPE, ICON_SIZES } from "@/lib/theme";

/**
 * K 아이콘 컴포넌트 (BI v2 Section 0.2)
 *
 * 정사각형 박스 안의 K 한 글자. 앱 아이콘, 챗봇 아바타, 파비콘 등 사용.
 * 박스 모서리는 BI v2 가이드 (96px=22, 64px=14, 48px=11, ...) 자동 적용.
 *
 * @param {object} props
 * @param {("standard"|"kakao"|"coral")} [props.variant="standard"] - 색상 변형
 *   - standard: 네이비 박스 + 코랄 K — 앱 아이콘, 일반 UI
 *   - kakao: 카카오 노랑 박스 + 네이비 K — 챗봇 아바타 (알비)
 *   - coral: 코랄 박스 + 흰 K — 마케팅, 강조
 * @param {("xl"|"lg"|"md"|"sm"|"xs"|"xxs"|"fav")} [props.size="md"] - 사이즈
 *   - xl(96), lg(64), md(48), sm(36), xs(24), xxs(20), fav(16)
 * @param {object} [props.style] - 추가 스타일
 * @param {string} [props.className] - 추가 클래스
 *
 * @example
 *   <KIcon size="xl" />                       // 96px 앱 아이콘
 *   <KIcon variant="kakao" size="sm" />       // 36px 챗봇 메시지 아바타
 *   <KIcon variant="coral" size="lg" />       // 64px 마케팅 배너
 */
export default function KIcon({
  variant = "standard",
  size = "md",
  style,
  className,
}) {
  const sizeConfig = ICON_SIZES[size] || ICON_SIZES.md;

  const colors = {
    standard: { bg: T.navy, fg: T.coral },
    kakao: { bg: T.kakaoYellow, fg: T.navy },
    coral: { bg: T.coral, fg: T.paper },
  }[variant];

  return (
    <div
      className={className}
      style={{
        width: sizeConfig.box,
        height: sizeConfig.box,
        background: colors.bg,
        color: colors.fg,
        borderRadius: sizeConfig.radius,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: TYPE.family,
        fontWeight: 800,
        fontSize: sizeConfig.font,
        letterSpacing: "-0.04em",
        lineHeight: 1,
        flexShrink: 0,
        ...style,
      }}
    >
      K
    </div>
  );
}
