"use client";
import { T, TYPE, ICON_SIZES } from "@/lib/theme";
import KIcon from "./KIcon";

/**
 * Avatar 컴포넌트 (BI v2 Section 8.1)
 *
 * 사용자 / 회사 / K 아이콘 (챗봇) 통합 아바타.
 *
 * @param {object} props
 * @param {("user"|"company"|"k")} [props.variant="user"]
 *   - user: 사용자 (이미지 또는 이니셜)
 *   - company: 회사 (이미지 또는 첫 글자, 사각형 라운드)
 *   - k: K 아이콘 (KIcon 위임 — Standard/Kakao/Coral)
 * @param {string} [props.src] - 이미지 URL (있으면 이미지 표시)
 * @param {string} [props.name] - 이름 (이미지 없을 때 첫 글자)
 * @param {("xl"|"lg"|"md"|"sm"|"xs"|"xxs")} [props.size="md"] - 사이즈
 * @param {("standard"|"kakao"|"coral")} [props.kVariant="standard"] - K 아이콘 변형 (variant=k일 때)
 * @param {boolean} [props.bordered=false] - 흰색 보더 (다크 배경 위)
 * @param {boolean} [props.online] - 온라인 표시 점
 * @param {object} [props.style]
 * @param {string} [props.className]
 *
 * @example
 *   <Avatar variant="user" name="Linh" />
 *   <Avatar variant="user" src="/profile.jpg" size="lg" online />
 *   <Avatar variant="company" name="블루보틀" />
 *   <Avatar variant="k" kVariant="kakao" size="sm" />   // 챗봇 아바타
 */
export default function Avatar({
  variant = "user",
  src,
  name,
  size = "md",
  kVariant = "standard",
  bordered = false,
  online,
  style,
  className,
}) {
  // K 아이콘은 KIcon에 위임
  if (variant === "k") {
    return <KIcon variant={kVariant} size={size} style={style} className={className} />;
  }

  const sizeConfig = ICON_SIZES[size] || ICON_SIZES.md;

  // 이름 첫 글자 추출 (이미지 없을 때 fallback)
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  // 사용자/회사별 색상 (이름 기반 결정적 색상)
  const colors = [T.coral, T.mint, T.gold, T.navy, "#9333EA", "#4ECDC4"];
  const colorIdx = name
    ? Math.abs(name.charCodeAt(0)) % colors.length
    : 0;
  const bgColor = colors[colorIdx];

  // 회사는 사각형 라운드, 사용자는 원형
  const borderRadius = variant === "company" ? sizeConfig.radius : "50%";

  const baseStyle = {
    width: sizeConfig.box,
    height: sizeConfig.box,
    borderRadius,
    overflow: "hidden",
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: TYPE.family,
    fontWeight: 700,
    fontSize: sizeConfig.font,
    background: bgColor,
    color: T.paper,
    border: bordered ? `2px solid ${T.paper}` : "none",
    position: "relative",
  };

  return (
    <div className={className} style={{ ...baseStyle, ...style }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name || ""}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => {
            // 이미지 로드 실패 시 이니셜로 fallback
            e.target.style.display = "none";
          }}
        />
      ) : (
        initial
      )}

      {online !== undefined && (
        <span
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: sizeConfig.box * 0.25,
            height: sizeConfig.box * 0.25,
            borderRadius: "50%",
            background: online ? T.mint : T.ink3,
            border: `2px solid ${T.paper}`,
            boxSizing: "border-box",
          }}
          aria-label={online ? "온라인" : "오프라인"}
        />
      )}
    </div>
  );
}


/**
 * AvatarGroup — 여러 아바타 겹쳐서 표시
 *
 * @example
 *   <AvatarGroup max={3}>
 *     <Avatar name="Linh" />
 *     <Avatar name="Bayar" />
 *     <Avatar name="Wang" />
 *     <Avatar name="Park" />
 *   </AvatarGroup>
 */
export function AvatarGroup({ children, max = 5, size = "md", style, className }) {
  const items = Array.isArray(children) ? children : [children];
  const visible = items.slice(0, max);
  const overflow = items.length - max;

  const sizeConfig = ICON_SIZES[size] || ICON_SIZES.md;
  const overlap = sizeConfig.box * 0.3;

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        ...style,
      }}
    >
      {visible.map((child, i) => (
        <span
          key={i}
          style={{
            marginLeft: i === 0 ? 0 : -overlap,
            display: "inline-flex",
          }}
        >
          {child}
        </span>
      ))}

      {overflow > 0 && (
        <span
          style={{
            marginLeft: -overlap,
            width: sizeConfig.box,
            height: sizeConfig.box,
            borderRadius: "50%",
            background: T.cream,
            color: T.ink2,
            border: `2px solid ${T.paper}`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: sizeConfig.font * 0.7,
            fontWeight: 700,
            fontFamily: TYPE.family,
            boxSizing: "border-box",
          }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
