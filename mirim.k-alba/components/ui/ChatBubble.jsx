"use client";
import { T, L, TYPE } from "@/lib/theme";
import KIcon from "./KIcon";

/**
 * ChatBubble 컴포넌트들 (BI v2 Section 7.2)
 *
 * KakaoChatModal 안에서 사용하는 메시지 말풍선 + 카드 + 빠른답장 버튼.
 *
 * 5가지 응답 패턴 (BI v2 Section 7.2 참조):
 *   - 패턴 1: 봇 인사 → <ChatBubble variant="bot">
 *   - 패턴 2: 빠른답장 → <ChatBubble variant="bot"> + <QuickReplies>
 *   - 패턴 3: 텍스트 입력 → 사용자 측에서 typing
 *   - 패턴 4: 정보 카드 → <ChatCard>
 *   - 패턴 5: 외부 링크 → <ChatBubble variant="bot"> + 액션 버튼
 *   - 패턴 6: 결과/완료 → <ChatBubble variant="bot">
 *
 * @example
 *   // 봇 메시지
 *   <ChatBubble variant="bot">
 *     안녕하세요! 알비예요
 *     무엇을 도와드릴까요?
 *   </ChatBubble>
 *
 *   <QuickReplies
 *     options={["알바 찾기", "공고 등록", "시간제취업"]}
 *     onSelect={(v) => handleSelect(v)}
 *   />
 *
 *   // 사용자 메시지
 *   <ChatBubble variant="user">알바 찾고 있어요</ChatBubble>
 *
 *   // 알바 카드 (캐러셀)
 *   <ChatCard
 *     visa="E-9"
 *     location="강남구"
 *     title="카페 바리스타"
 *     subtitle="블루보틀 강남점"
 *     wage={12000}
 *     primaryAction={{ label: "지원하기", onClick: ... }}
 *     secondaryAction={{ label: "자세히", onClick: ... }}
 *   />
 */


// ════════════════════════════════════════════════════════════════════
// ChatBubble — 봇/사용자 메시지
// ════════════════════════════════════════════════════════════════════

/**
 * @param {object} props
 * @param {("bot"|"user")} [props.variant="bot"]
 * @param {React.ReactNode} props.children - 메시지 내용
 * @param {string} [props.timestamp] - 우측 시각 (예: "오후 3:42")
 * @param {boolean} [props.showAvatar=true] - 봇 아바타 표시 (variant=bot일 때만)
 * @param {boolean} [props.read] - 읽음 표시 (variant=user일 때)
 * @param {object} [props.style]
 * @param {string} [props.className]
 */
export default function ChatBubble({
  variant = "bot",
  children,
  timestamp,
  showAvatar = true,
  read,
  style,
  className,
}) {
  if (variant === "bot") {
    return (
      <div
        className={className}
        style={{
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
          maxWidth: "85%",
          ...style,
        }}
      >
        {showAvatar ? (
          <KIcon variant="kakao" size="sm" />
        ) : (
          <div style={{ width: 36, flexShrink: 0 }} />
        )}

        <div
          style={{
            background: T.paper,
            borderRadius: "4px 16px 16px 16px",
            padding: "10px 14px",
            fontSize: 13,
            lineHeight: 1.6,
            color: T.ink,
            fontFamily: TYPE.family,
            wordBreak: "keep-all",
            overflowWrap: "break-word",
          }}
        >
          {children}
        </div>

        {timestamp && (
          <div style={{ fontSize: 10, color: T.ink3, alignSelf: "flex-end", marginBottom: 2 }}>
            {timestamp}
          </div>
        )}
      </div>
    );
  }

  // 사용자 메시지
  return (
    <div
      className={className}
      style={{
        display: "flex",
        gap: 6,
        alignItems: "flex-end",
        justifyContent: "flex-end",
        maxWidth: "85%",
        marginLeft: "auto",
        ...style,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
        {read !== undefined && (
          <span style={{ fontSize: 9, color: read ? T.ink3 : T.coral }}>
            {read ? "읽음" : "1"}
          </span>
        )}
        {timestamp && <div style={{ fontSize: 10, color: T.ink3 }}>{timestamp}</div>}
      </div>

      <div
        style={{
          background: T.kakaoYellowMsg,
          borderRadius: "16px 4px 16px 16px",
          padding: "10px 14px",
          fontSize: 13,
          lineHeight: 1.6,
          color: T.ink,
          fontFamily: TYPE.family,
          wordBreak: "keep-all",
          overflowWrap: "break-word",
        }}
      >
        {children}
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════
// QuickReplies — 빠른답장 버튼들 (3~5개)
// ════════════════════════════════════════════════════════════════════

/**
 * @param {object} props
 * @param {Array<string|{label: string, value?: any, icon?: React.ReactNode}>} props.options
 * @param {function} props.onSelect - (value) => void
 * @param {boolean} [props.indented=true] - 봇 아바타 너비만큼 들여쓰기
 */
export function QuickReplies({ options = [], onSelect, indented = true, style, className }) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        marginLeft: indented ? 44 : 0,
        ...style,
      }}
    >
      {options.map((opt, i) => {
        const label = typeof opt === "string" ? opt : opt.label;
        const value = typeof opt === "string" ? opt : (opt.value ?? opt.label);
        const icon = typeof opt === "string" ? null : opt.icon;

        return (
          <button
            key={i}
            onClick={() => onSelect?.(value)}
            style={{
              background: T.paper,
              border: `1.5px solid ${T.kakaoYellow}`,
              color: T.ink,
              padding: "7px 12px",
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: TYPE.family,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = T.kakaoYellow;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = T.paper;
            }}
          >
            {icon && <span>{icon}</span>}
            {label}
          </button>
        );
      })}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════
// ChatCard — 알바 카드, 공고 카드 등 정보 카드
// ════════════════════════════════════════════════════════════════════

/**
 * @param {object} props
 * @param {string} [props.visa] - E-9, D-2 등 (있으면 좌상단 비자 배지)
 * @param {string} [props.location]
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {number} [props.wage] - 시급 (있으면 강조)
 * @param {{label: string, onClick: function}} [props.primaryAction]
 * @param {{label: string, onClick: function}} [props.secondaryAction]
 * @param {boolean} [props.indented=true]
 */
export function ChatCard({
  visa,
  location,
  title,
  subtitle,
  wage,
  primaryAction,
  secondaryAction,
  indented = true,
  style,
  className,
}) {
  // 비자별 색상 매핑 (간단)
  const visaColors = {
    "E-9": T.coral, "E9": T.coral,
    "D-2": T.mint, "D2": T.mint,
    "D-4": "#4ECDC4", "D4": "#4ECDC4",
    "F-2": T.gold, "F2": T.gold,
    "F-4": "#9333EA", "F4": "#9333EA",
    "F-5": T.navy, "F5": T.navy,
    "H-2": "#F59E0B", "H2": "#F59E0B",
  };
  const visaColor = visaColors[visa] || T.coral;

  return (
    <div
      className={className}
      style={{
        background: T.paper,
        borderRadius: 12,
        padding: 12,
        marginLeft: indented ? 44 : 0,
        fontFamily: TYPE.family,
        ...style,
      }}
    >
      {(visa || location) && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          {visa && (
            <span
              style={{
                background: visaColor,
                color: T.paper,
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              {visa}
            </span>
          )}
          {location && (
            <span style={{ fontSize: 9, color: T.ink3 }}>{location}</span>
          )}
        </div>
      )}

      <div style={{ fontWeight: 700, fontSize: 13, color: T.ink, marginBottom: 4 }}>
        {title}
      </div>

      {subtitle && (
        <div style={{ fontSize: 11, color: T.ink3, marginBottom: 8 }}>
          {subtitle}
        </div>
      )}

      {wage !== undefined && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 10 }}>
          <span
            style={{
              fontWeight: 800,
              fontSize: 16,
              color: T.coral,
              letterSpacing: "-0.02em",
              fontFamily: TYPE.family,
            }}
          >
            {wage.toLocaleString()}
          </span>
          <span style={{ fontSize: 10, color: T.ink3 }}>원/시간</span>
        </div>
      )}

      {(primaryAction || secondaryAction) && (
        <div style={{ display: "flex", gap: 6 }}>
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              style={{
                flex: 1,
                background: T.cream,
                border: `0.5px solid ${T.border}`,
                color: T.ink,
                padding: "7px 8px",
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              {secondaryAction.label}
            </button>
          )}
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              style={{
                flex: 1,
                background: T.coral,
                border: "none",
                color: T.paper,
                padding: "7px 8px",
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              {primaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════
// ChatTypingIndicator — 봇이 입력 중 표시 (... 점멸)
// ════════════════════════════════════════════════════════════════════

export function ChatTypingIndicator({ style, className }) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-end",
        ...style,
      }}
    >
      <KIcon variant="kakao" size="sm" />
      <div
        style={{
          background: T.paper,
          borderRadius: "4px 16px 16px 16px",
          padding: "12px 16px",
          display: "flex",
          gap: 4,
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: T.ink3,
              animation: `k-typing 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes k-typing {
          0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
          30% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════
// ChatContainer — 카톡 채팅창 배경 (KakaoChatModal 안에 wrapping용)
// ════════════════════════════════════════════════════════════════════

/**
 * 챗봇 시뮬레이터/모달 안에서 사용하는 카톡 회색 배경.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - ChatBubble들
 */
export function ChatContainer({ children, style, className }) {
  return (
    <div
      className={className}
      style={{
        background: T.kakaoChatBg,
        padding: 16,
        borderRadius: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        fontFamily: TYPE.family,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
