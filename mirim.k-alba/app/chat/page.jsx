"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { Card } from "@/components/UI";
import { getCurrentUser, getMessages, sendMessage, subscribeMessages } from "@/lib/supabase";
import { ChatListSkel } from "@/components/Wireframe";

// 데모 채팅 데이터
const DEMO_CHATS = [
  { id: 1, name: "블루보틀 강남점", avatar: "☕", lastMsg: "내일 면접 오시면 됩니다", time: "14:23", unread: 0 },
  { id: 2, name: "논산 딸기농장", avatar: "🌾", lastMsg: "숙소 안내드렸어요!", time: "어제", unread: 2 },
  { id: 3, name: "이태원 정", avatar: "🍜", lastMsg: "감사합니다 지원 확인했습니다", time: "2일 전", unread: 0 },
];

const DEMO_MESSAGES = [
  { id: 1, from: "other", text: "안녕하세요! 지원해주셔서 감사합니다.", time: "14:15" },
  { id: 2, from: "me", text: "안녕하세요. 언제 면접 가능할까요?", time: "14:18" },
  { id: 3, from: "other", text: "내일 오후 3시 어떠세요? 강남점으로 와주세요.", time: "14:20" },
  { id: 4, from: "me", text: "네, 알겠습니다! 내일 뵙겠습니다", time: "14:22" },
  { id: 5, from: "other", text: "내일 면접 오시면 됩니다", time: "14:23" },
];

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState(DEMO_CHATS);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

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
      // 실제 구현시 Supabase에서 가져옴
      getMessages(user.id, selected.id).then((msgs) => {
        if (msgs.length > 0) {
          setMessages(msgs.map(m => ({
            id: m.id,
            from: m.sender_id === user.id ? "me" : "other",
            text: m.text,
            time: new Date(m.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
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
            time: new Date(payload.new.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
          }]);
        }
      });

      return () => {
        if (sub) sub.unsubscribe();
      };
    }
  }, [selected, user]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selected || !user) return;
    const newMsg = {
      id: Date.now(),
      from: "me",
      text: input.trim(),
      time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
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
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.g200}`, background: "#fff", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: T.g700 }}>←</button>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: T.mintL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{selected.avatar}</div>
          <div>
            <div style={{ fontWeight: 700, color: T.navy }}>{selected.name}</div>
            <div style={{ fontSize: 11, color: T.g500 }}>● 온라인</div>
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
                <div style={{ fontSize: 9, color: T.g500, marginTop: 4, textAlign: m.from === "me" ? "right" : "left" }}>{m.time}</div>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>

        <div style={{ padding: 12, background: "#fff", borderTop: `1px solid ${T.g200}`, display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="메시지 입력..."
            style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: `2px solid ${T.g200}`, fontSize: 14, fontFamily: "inherit", outline: "none" }}
          />
          <button onClick={handleSend} disabled={!input.trim()} style={{ padding: "10px 16px", borderRadius: 12, background: input.trim() ? T.coral : T.g200, color: input.trim() ? "#fff" : T.g500, border: "none", fontWeight: 700, fontSize: 15, cursor: input.trim() ? "pointer" : "default" }}>↑</button>
        </div>
      </div>
    );
  }

  // 채팅 목록
  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: T.navy, marginBottom: 4 }}>채팅</h2>
      <p style={{ color: T.g500, fontSize: 13, marginBottom: 20 }}>{chats.length}개의 대화</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {chats.map((c) => (
          <div key={c.id} onClick={() => setSelected(c)}>
            <Card style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: T.mintL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{c.avatar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: T.g500 }}>{c.time}</div>
                </div>
                <div style={{ fontSize: 12, color: T.g500, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.lastMsg}</div>
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
