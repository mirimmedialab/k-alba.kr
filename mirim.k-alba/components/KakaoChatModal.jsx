"use client";
import { useState, useEffect, useRef } from "react";
import { T } from "@/lib/theme";

/**
 * 카카오톡 스타일 챗봇 모달
 *
 * @param {boolean} open - 모달 열림 여부
 * @param {function} onClose - 닫기 콜백
 * @param {string} title - 챗봇 채널 이름 (예: "K-ALBA 알바봇")
 * @param {string} botAvatar - 봇 아바타 (예: "🤖" 또는 "☕")
 * @param {Array} steps - 챗봇 단계 정의 (아래 형식 참조)
 * @param {function} onComplete - 모든 단계 완료 시 호출 (수집된 답변 전달)
 *
 * steps 형식:
 * [
 *   { type: "bot", text: "안녕하세요!" },
 *   { type: "bot", text: "한국어 수준은?", quickReplies: ["초급", "중급", "고급"], key: "korean_level" },
 *   { type: "bot", text: "근무 시작일?", input: { type: "date" }, key: "start_date" },
 *   { type: "bot", text: "사장님께 한 마디?", input: { type: "text", placeholder: "선택사항", optional: true }, key: "message" },
 * ]
 */
export function KakaoChatModal({ open, onClose, title = "K-ALBA 알바봇", botAvatar = "🤖", steps = [], onComplete }) {
  const [messages, setMessages] = useState([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [inputValue, setInputValue] = useState("");
  const [typing, setTyping] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [completed, setCompleted] = useState(false);
  const scrollRef = useRef(null);

  // 모달 오픈 시 초기화
  useEffect(() => {
    if (open) {
      setMessages([]);
      setStepIdx(0);
      setAnswers({});
      setInputValue("");
      setShowInput(false);
      setShowQR(false);
      setCompleted(false);
      // 첫 메시지 출력
      setTimeout(() => processStep(0, {}), 300);
    }
    // eslint-disable-next-line
  }, [open]);

  // 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing, showQR, showInput]);

  const processStep = (idx, currentAnswers) => {
    if (idx >= steps.length) {
      // 완료
      setCompleted(true);
      if (onComplete) {
        setTimeout(() => onComplete(currentAnswers), 600);
      }
      return;
    }

    const step = steps[idx];

    // 봇 메시지 출력 (typing 효과)
    setTyping(true);
    setShowInput(false);
    setShowQR(false);

    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [...prev, { from: "bot", text: typeof step.text === "function" ? step.text(currentAnswers) : step.text }]);

      // 입력 UI 표시
      setTimeout(() => {
        if (step.quickReplies) {
          setShowQR(true);
        } else if (step.input) {
          setShowInput(true);
        } else {
          // 자동으로 다음 단계
          setTimeout(() => processStep(idx + 1, currentAnswers), 600);
        }
      }, 200);
    }, step.delay || 700);
  };

  const handleQR = (label) => {
    const step = steps[stepIdx];
    setMessages((prev) => [...prev, { from: "user", text: label }]);
    setShowQR(false);
    const newAnswers = step.key ? { ...answers, [step.key]: label } : answers;
    setAnswers(newAnswers);
    setTimeout(() => {
      setStepIdx(stepIdx + 1);
      processStep(stepIdx + 1, newAnswers);
    }, 400);
  };

  const handleInputSubmit = () => {
    const step = steps[stepIdx];
    const value = inputValue.trim();
    if (!value && !step.input?.optional) return;

    const displayValue = value || "(생략)";
    setMessages((prev) => [...prev, { from: "user", text: displayValue }]);
    setShowInput(false);
    setInputValue("");
    const newAnswers = step.key ? { ...answers, [step.key]: value } : answers;
    setAnswers(newAnswers);
    setTimeout(() => {
      setStepIdx(stepIdx + 1);
      processStep(stepIdx + 1, newAnswers);
    }, 400);
  };

  if (!open) return null;

  const currentStep = steps[stepIdx];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#B2C7D9",
          borderRadius: 20,
          width: "100%",
          maxWidth: 420,
          height: "min(640px, 90vh)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* 헤더 (카카오톡 스타일) */}
        <div
          style={{
            background: "#A1B7CB",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderBottom: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              color: "#1A1A2E",
              cursor: "pointer",
              padding: 0,
              width: 28,
              height: 28,
            }}
          >
            ←
          </button>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#FEE500",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            {botAvatar}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1A2E" }}>{title}</div>
            <div style={{ fontSize: 11, color: "#1A1A2E", opacity: 0.6 }}>채팅봇 · 응답 중</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 18,
              color: "#1A1A2E",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* 메시지 영역 */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "14px 12px",
          }}
        >
          {messages.map((m, i) => (
            <MessageBubble key={i} message={m} botAvatar={botAvatar} />
          ))}
          {typing && <TypingIndicator botAvatar={botAvatar} />}

          {/* Quick Replies */}
          {showQR && currentStep?.quickReplies && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, paddingLeft: 44 }}>
              {currentStep.quickReplies.map((label) => (
                <button
                  key={label}
                  onClick={() => handleQR(label)}
                  style={{
                    background: "#fff",
                    border: "1.5px solid #FEE500",
                    color: "#1A1A2E",
                    padding: "8px 14px",
                    borderRadius: 100,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#FEE500")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 입력창 */}
        {showInput && currentStep?.input && (
          <div
            style={{
              background: "#fff",
              borderTop: "1px solid rgba(0,0,0,0.08)",
              padding: 12,
              display: "flex",
              gap: 8,
            }}
          >
            <input
              type={currentStep.input.type === "date" ? "date" : currentStep.input.type === "tel" ? "tel" : "text"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInputSubmit()}
              placeholder={currentStep.input.placeholder || "메시지 입력"}
              autoFocus
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1.5px solid #E8E4DB",
                fontSize: 13,
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <button
              onClick={handleInputSubmit}
              style={{
                background: "#FEE500",
                border: "none",
                padding: "10px 16px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                color: "#1A1A2E",
                fontFamily: "inherit",
              }}
            >
              {currentStep.input.optional && !inputValue ? "건너뛰기" : "전송"}
            </button>
          </div>
        )}

        {/* 완료 영역 */}
        {completed && (
          <div
            style={{
              background: "#E8F5E9",
              padding: 14,
              borderTop: "2px solid #00A86B40",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>✅ 완료되었습니다</div>
            <button
              onClick={onClose}
              style={{
                background: "#00A86B",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              확인
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message, botAvatar }) {
  const isBot = message.from === "bot";
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        marginBottom: 10,
        justifyContent: isBot ? "flex-start" : "flex-end",
      }}
    >
      {isBot && (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "#FEE500",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          {botAvatar}
        </div>
      )}
      <div
        style={{
          maxWidth: "75%",
          padding: "10px 14px",
          borderRadius: isBot ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
          background: isBot ? "#fff" : "#FFEB33",
          color: "#1A1A2E",
          fontSize: 13,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        }}
      >
        {message.text}
      </div>
    </div>
  );
}

function TypingIndicator({ botAvatar }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "#FEE500",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        {botAvatar}
      </div>
      <div
        style={{
          background: "#fff",
          padding: "12px 18px",
          borderRadius: "4px 16px 16px 16px",
          display: "flex",
          gap: 4,
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((d) => (
          <div
            key={d}
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: "#8A8580",
              animation: `dotPulse 1.2s ease-in-out ${d * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes dotPulse {
          0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
          30% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
