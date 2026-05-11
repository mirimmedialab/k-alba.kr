"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { getCurrentUser, getMessages, sendMessage, subscribeMessages } from "@/lib/supabase";
import { useT, useLocale } from "@/lib/i18n";
import { ChatListSkel } from "@/components/Wireframe";
import { Card } from "@/components/ui";

/**
 * /chat 채팅 (BI v2 + i18n)
 *
 * 페르소나: 양측 (사장님+알바생) — 양측 공통 사용
 * 다국어 지원 이유: 외국인 알바생도 사용
 *
 * i18n 변경점:
 *   - 헤더 제목, 카운트, 입력 placeholder → t()
 *   - 시간 포맷: locale에 따라 toLocaleTimeString의 locale 인자 동적 적용
 *   - "어제" / "X일 전" → t() (DEMO_CHATS의 time도 동적)
 *
 * 보존:
 *   - 카카오톡 채팅 디자인 (#B2C7D9 배경, #FFEB33 말풍선)
 *   - DEMO_CHATS / DEMO_MESSAGES (다국어 시 demo 텍스트는 한국어 그대로 — 데모 데이터)
 *   - subscribeMessages (실시간)
 */

// 시간 포맷 (locale 따라)
const localeMap = {
  ko: "ko-KR", en: "en-US", zh: "zh-CN", vi: "vi-VN",
  uz: "uz-UZ", mn: "mn-MN", ja: "ja-JP",
};

function formatTime(date, locale) {
  const localeStr = localeMap[locale] || "ko-KR";
  return new Date(date).toLocaleTimeString(localeStr, { hour: "2-digit", minute: "2-digit" });
}

// DEMO 데이터 — 시간 라벨은 i18n 동적 처리
const DEMO_CHATS_BASE = [
  { id: 1, name: "블루보틀 강남점", avatar: "☕", lastMsg: "내일 면접 오시면 됩니다", timeKey: "now", unread: 0 },
  { id: 2, name: "논산 딸기농장", avatar: "🌾", lastMsg: "숙소 안내드렸어요!", timeKey: "yesterday", unread: 2 },
  { id: 3, name: "이태원 정", avatar: "🍜", lastMsg: "감사합니다 지원 확인했습니다", timeKey: "daysAgo:2", unread: 0 },
];

const DEMO_MESSAGES = [
  { id: 1, from: "other", text: "안녕하세요! 지원해주셔서 감사합니다.", time: "14:15" },
  { id: 2, from: "me", text: "안녕하세요. 언제 면접 가능할까요?", time: "14:18" },
  { id: 3, from: "other", text: "내일 오후 3시 어떠세요? 강남점으로 와주세요.", time: "14:20" },
  { id: 4, from: "me", text: "네, 알겠습니다! 내일 뵙겠습니다", time: "14:22" },
  { id: 5, from: "other", text: "내일 면접 오시면 됩니다", time: "14:23" },
];

function fmt(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

export default function ChatPage() {
  const router = useRouter();
  const t = useT();
  const { locale } = useLocale();
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  // 시간 라벨을 locale에 따라 변환
  useEffect(() => {
    setChats(DEMO_CHATS_BASE.map((c) => {
      let time;
      if (c.timeKey === "now") time = "14:23";
      else if (c.timeKey === "yesterday") time = t("chat.yesterday");
      else if (c.timeKey.startsWith("daysAgo:")) {
        const n = c.timeKey.split(":")[1];
        time = fmt(t("chat.daysAgo"), { n });
      }
      return { ...c, time };
    }));
  }, [t, locale]);

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);
    });
  }, [router]);

  useEffect(() => {
    if (selected && user) {
      getMessages(user.id, selected.id).then((msgs) => {
        if (msgs.length > 0) {
          setMessages(msgs.map(m => ({
            id: m.id,
            from: m.sender_id === user.id ? "me" : "other",
            text: m.text,
            time: formatTime(m.created_at, locale),
          })));
        } else {
          setMessages(DEMO_MESSAGES);
        }
      });

      const sub = subscribeMessages(user.id, (payload) => {
        if (payload.new && payload.new.sender_id === selected.id) {
          setMessages(prev => [...prev, {
            id: payload.new.id,
            from: "other",
            text: payload.new.text,
            time: formatTime(payload.new.created_at, locale),
          }]);
        }
      });

      return () => {
        if (sub) sub.unsubscribe();
      };
    }
  }, [selected, user, locale]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selected || !user) return;
    const newMsg = {
      id: Date.now(),
      from: "me",
      text: input.trim(),
      time: formatTime(new Date(), locale),
    };
    setMessages([...messages, newMsg]);
    await sendMessage(user.id, selected.id, input.trim());
    setInput("");
  };

  if (!user) return <ChatListSkel rows={3} />;

  // 채팅 상세
  if (selected) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)", maxWidth: 600, margin: "0 auto" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, background: "#fff", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: T.ink2 }}>←</button>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: T.mintL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{selected.avatar}</div>
          <div>
            <div style={{ fontWeight: 700, color: T.navy }}>{selected.name}</div>
            <div style={{ fontSize: 11, color: T.ink3 }}>● {t("chat.online")}</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#B2C7D9" }}>
          {messages.map((m) => (
            <div key={m.id} style={{ display: "flex", justifyContent: m.from === "me" ? "flex-end" : "flex-start", marginBottom: 10 }}>
              <div style={{
                maxWidth: "75%",
                padding: "10px 14px",
                borderRadius: m.from === "me" ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                background: m.from === "me" ? "#FFEB33" : "#fff",
                color: T.navy,
                fontSize: 13,
                lineHeight: 1.6,
              }}>
                {m.text}
                <div style={{ fontSize: 9, color: T.ink3, marginTop: 4, textAlign: m.from === "me" ? "right" : "left" }}>{m.time}</div>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>

        <div style={{ padding: 12, background: "#fff", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={t("chat.inputPlaceholder")}
            style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: `2px solid ${T.border}`, fontSize: 14, fontFamily: "inherit", outline: "none" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            style={{ padding: "10px 16px", borderRadius: 12, background: input.trim() ? T.coral : T.border, color: input.trim() ? "#fff" : T.ink3, border: "none", fontWeight: 700, fontSize: 15, cursor: input.trim() ? "pointer" : "default" }}
          >
            ↑
          </button>
        </div>
      </div>
    );
  }

  // 채팅 목록
  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: T.navy, marginBottom: 4 }}>{t("chat.title")}</h2>
      <p style={{ color: T.ink3, fontSize: 13, marginBottom: 20 }}>
        {fmt(t("chat.conversationsCount"), { count: chats.length })}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {chats.map((c) => (
          <div key={c.id} onClick={() => setSelected(c)}>
            <Card style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: T.mintL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{c.avatar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: T.ink3 }}>{c.time}</div>
                </div>
                <div style={{ fontSize: 12, color: T.ink3, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.lastMsg}</div>
              </div>
              {c.unread > 0 && (
                <div style={{ background: T.coral, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "2px 7px", flexShrink: 0 }}>{c.unread}</div>
              )}
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
