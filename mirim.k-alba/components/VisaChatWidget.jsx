"use client";
// ─── 비자 챗봇 플로팅 위젯 ───
// K-ALBA 운영 엣지 함수(visa-chatbot, 7개 언어)를 호출하는 채팅 위젯.
// 언어는 localStorage "k-alba-locale" (i18n과 동일 키) → 브라우저 언어 → ko 순으로 결정.
// 카카오 플로팅 버튼(bottom 48) 위에 배치. (2026-07-20)
import { useState, useRef, useEffect } from "react";

const FN_URL =
  "https://uqgqqsescalotabaivee.supabase.co/functions/v1/visa-chatbot";
// K-ALBA 운영 프로젝트 publishable anon key (클라이언트 공개용 키)
const FN_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxZ3Fxc2VzY2Fsb3RhYmFpdmVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMjkzODAsImV4cCI6MjA5MTcwNTM4MH0.OedUy05i70sLh4uw88RHNWDgY11m059fjOjk0N_Bni4";

const LANGS = ["ko", "en", "vi", "zh", "ja", "uz", "mn"];
// 응답 quick_replies 중 '자세히 보기' / '다른 비자 물어보기' 라벨 (visa-chatbot UI 사전과 동일)
const DETAIL_LABELS = ["자세히 보기", "See details", "Xem chi tiết", "查看详情", "詳細を見る", "Batafsil", "Дэлгэрэнгүй"];
const OTHER_LABELS = ["다른 비자 물어보기", "Ask another visa", "Hỏi visa khác", "咨询其他签证", "他のビザを聴く", "Boshqa viza so'rash", "Өөр виз асуух"];

const TITLE = {
  ko: "비자 도우미", en: "Visa Helper", vi: "Trợ lý visa", zh: "签证助手",
  ja: "ビザアシスタント", uz: "Viza yordamchisi", mn: "Визний туслах",
};
const PLACEHOLDER = {
  ko: "예: D-2 편의점 알바 돼요?", en: "e.g. Can I work at a cafe on D-2?",
  vi: "VD: Visa D-2 làm thêm được không?", zh: "例: D-2可以打工吗?",
  ja: "例: D-2でバイトできますか?", uz: "Masalan: D-2 bilan ishlasam bo'ladimi?",
  mn: "Жишээ: D-2 визээр ажиллаж болох уу?",
};

function getLang() {
  if (typeof window === "undefined") return "ko";
  const saved = localStorage.getItem("k-alba-locale");
  if (saved && LANGS.includes(saved)) return saved;
  const browser = navigator.language?.slice(0, 2);
  return LANGS.includes(browser) ? browser : "ko";
}

export function VisaChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // {role:'user'|'bot', text, quickReplies?}
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const lastVisaCode = useRef(null);
  const scrollRef = useRef(null);
  const lang = getLang();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const callBot = async (payload) => {
    setLoading(true);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: FN_KEY,
          Authorization: `Bearer ${FN_KEY}`,
        },
        body: JSON.stringify({ ...payload, lang }),
      });
      const data = await res.json();
      if (data.visa_code) lastVisaCode.current = data.visa_code;
      setMessages((p) => [...p, { role: "bot", text: data.answer || "…", quickReplies: data.quick_replies || [] }]);
    } catch (_e) {
      setMessages((p) => [...p, { role: "bot", text: "⚠️ 일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.", quickReplies: [] }]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    if (messages.length === 0) callBot({ message: "" }); // 인사말 + 추천 질문
  };

  const send = (text) => {
    const v = String(text || "").trim();
    if (!v || loading) return;
    setMessages((p) => [...p, { role: "user", text: v }]);
    setInput("");
    if (DETAIL_LABELS.includes(v) && lastVisaCode.current) {
      callBot({ action: "detail", visa_code: lastVisaCode.current });
    } else if (OTHER_LABELS.includes(v)) {
      callBot({ message: "help" });
    } else {
      callBot({ message: v });
    }
  };

  const S = {
    fab: {
      position: "fixed", bottom: 122, right: 38, zIndex: 1000,
      width: 56, height: 56, borderRadius: "50%", border: "none", cursor: "pointer",
      background: "#1B2A4A", color: "#fff", fontSize: 24,
      boxShadow: "0 10px 30px rgba(0,0,0,.18)",
      display: "flex", alignItems: "center", justifyContent: "center",
    },
    panel: {
      position: "fixed", bottom: 122, right: 20, zIndex: 1001,
      width: "min(370px, calc(100vw - 32px))", height: "min(540px, calc(100vh - 160px))",
      background: "#fff", borderRadius: 18, boxShadow: "0 20px 60px rgba(0,0,0,.25)",
      display: "flex", flexDirection: "column", overflow: "hidden",
      fontFamily: "inherit",
    },
    header: {
      background: "#1B2A4A", color: "#fff", padding: "14px 16px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      fontWeight: 700, fontSize: 15,
    },
    body: { flex: 1, overflowY: "auto", padding: 14, background: "#F4F6FA" },
    bubbleBot: {
      background: "#fff", borderRadius: "4px 14px 14px 14px", padding: "10px 13px",
      fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-wrap", maxWidth: "85%",
      marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,.06)", color: "#1B2A4A",
    },
    bubbleUser: {
      background: "#1B2A4A", color: "#fff", borderRadius: "14px 4px 14px 14px",
      padding: "10px 13px", fontSize: 13.5, lineHeight: 1.55, maxWidth: "85%",
      marginBottom: 8, marginLeft: "auto", whiteSpace: "pre-wrap",
    },
    chip: {
      border: "1.5px solid #1B2A4A", background: "#fff", color: "#1B2A4A",
      borderRadius: 999, padding: "6px 12px", fontSize: 12.5, fontWeight: 600,
      cursor: "pointer", marginRight: 6, marginBottom: 6, fontFamily: "inherit",
    },
    inputRow: { display: "flex", gap: 8, padding: 12, borderTop: "1px solid #E5E9F0", background: "#fff" },
    input: {
      flex: 1, border: "1.5px solid #E5E9F0", borderRadius: 10, padding: "10px 12px",
      fontSize: 13.5, outline: "none", fontFamily: "inherit", minWidth: 0,
    },
    sendBtn: {
      border: "none", background: "#FF6B4A", color: "#fff", borderRadius: 10,
      padding: "0 16px", fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit",
    },
  };

  return (
    <>
      {!open && (
        <button style={S.fab} onClick={handleOpen} aria-label="비자 도우미 열기" title={TITLE[lang]}>
          🛂
        </button>
      )}
      {open && (
        <div style={S.panel}>
          <div style={S.header}>
            <span>🛂 {TITLE[lang]}</span>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", padding: 4 }}
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
          <div style={S.body} ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i}>
                <div style={m.role === "user" ? S.bubbleUser : S.bubbleBot}>{m.text}</div>
                {m.role === "bot" && i === messages.length - 1 && !loading && (m.quickReplies || []).length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    {m.quickReplies.map((q) => (
                      <button key={q} style={S.chip} onClick={() => send(q)}>{q}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && <div style={{ ...S.bubbleBot, color: "#8A93A5" }}>···</div>}
          </div>
          <div style={S.inputRow}>
            <input
              style={S.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
              placeholder={PLACEHOLDER[lang]}
            />
            <button style={S.sendBtn} onClick={() => send(input)}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}

export default VisaChatWidget;
