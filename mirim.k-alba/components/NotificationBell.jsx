"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { T } from "@/lib/theme";
import { supabase, getCurrentUser } from "@/lib/supabase";
import {
  initPushNotifications,
  setupPushListeners,
  checkPushPermission,
} from "@/lib/pushNotifications";

/**
 * 알림 벨 + 드롭다운
 *
 * 기능:
 *   - 앱 진입 시 푸시 권한 + 토큰 등록
 *   - 미읽음 알림 카운트 배지
 *   - 드롭다운에서 최근 10개 표시
 *   - 딥링크 지원 (알림 탭 → 공고 상세)
 *
 * NavBar에 배치하거나, 페이지 헤더에서 사용
 */
export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState(null);
  const ref = useRef(null);

  // 앱 진입 시 푸시 초기화 (한 번만)
  useEffect(() => {
    let canceled = false;
    (async () => {
      const u = await getCurrentUser();
      if (canceled || !u) return;
      setUserId(u.id);

      // 푸시 권한 + 토큰 등록 (이미 등록돼 있으면 no-op)
      await initPushNotifications(supabase, u.id);

      // 수신 리스너
      setupPushListeners({
        onReceived: (notification) => {
          // 앱 실행 중 도착한 알림 → 로컬 state에 추가
          setNotifications((prev) => [{
            id: Date.now(),
            title: notification.title,
            body: notification.body,
            data: notification.data,
            read: false,
            created_at: new Date().toISOString(),
          }, ...prev]);
          setUnreadCount((c) => c + 1);
        },
        onActionPerformed: (action) => {
          // 알림 탭 시 해당 공고로 이동
          const jobId = action.notification?.data?.job_id;
          if (jobId) {
            window.location.href = `/jobs/${jobId}`;
          }
        },
      });
    })();
    return () => { canceled = true; };
  }, []);

  // 알림 목록 조회
  useEffect(() => {
    if (!userId || !supabase) return;

    const loadNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.read).length);
      }
    };

    loadNotifications();

    // 실시간 구독
    const channel = supabase
      .channel("notifications_" + userId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev.slice(0, 9)]);
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = async () => {
    if (!userId || !supabase) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  if (!userId) return null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "transparent",
          border: "none",
          padding: "8px 10px",
          cursor: "pointer",
          position: "relative",
          fontSize: 20,
          color: "var(--ink2)",
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: 4,
            right: 4,
            background: "var(--ac)",
            color: "var(--p)",
            borderRadius: "50%",
            minWidth: 16,
            height: 16,
            fontSize: 10,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 4px",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "100%",
          right: 0,
          marginTop: 6,
          width: 320,
          maxHeight: 400,
          overflowY: "auto",
          background: "var(--p)",
          border: `1px solid ${T.border}`,
          borderRadius: 6,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          zIndex: 100,
        }}>
          <div style={{
            padding: "10px 14px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>
              알림
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--ac)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                모두 읽음
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{
              padding: "32px 20px",
              textAlign: "center",
              fontSize: 13,
              color: "var(--ink3)",
            }}>
              알림이 없어요
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} onClose={() => setOpen(false)} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function NotificationItem({ notification, onClose }) {
  const jobId = notification.data?.job_id;
  const href = jobId ? `/jobs/${jobId}` : "#";

  const content = (
    <div style={{
      padding: "10px 14px",
      borderBottom: `1px solid ${T.border}`,
      background: notification.read ? T.paper : T.accentBg,
      cursor: "pointer",
      transition: "background 0.15s",
    }}>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        color: "var(--ink)",
        marginBottom: 2,
        letterSpacing: "-0.01em",
      }}>
        {notification.title}
      </div>
      <div style={{ fontSize: 11, color: var(--ink2), lineHeight: 1.4 }}>
        {notification.body}
      </div>
      <div style={{
        fontSize: 10,
        color: "var(--ink3)",
        marginTop: 4,
      }}>
        {new Date(notification.created_at).toLocaleString("ko-KR", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  );

  if (jobId) {
    return (
      <Link href={href} onClick={onClose} style={{ textDecoration: "none", color: "inherit" }}>
        {content}
      </Link>
    );
  }
  return content;
}
