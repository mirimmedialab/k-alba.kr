"use client";

/**
 * /employer/kakao-join/done
 * 카카오 간편가입 + botUserKey 연결 완료 후 안내 화면.
 */
export default function KakaoJoinDonePage() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "32px 16px 48px" }}>
      <div style={{ width: "100%", maxWidth: 380, background: "#fff", borderRadius: 20, padding: "32px 22px", boxShadow: "0 6px 24px rgba(0,0,0,0.06)", textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>🎉</div>
        <h1 style={{ fontSize: 21, fontWeight: 800, color: "#16243F", margin: "0 0 10px" }}>가입 완료!</h1>
        <p style={{ fontSize: 15, color: "#334155", lineHeight: 1.8, margin: "0 0 22px" }}>
          이제 카카오톡으로 돌아가<br />
          <b style={{ color: "#1D4ED8" }}>‘공고 등록’</b>을 한 번 더 눌러주세요.<br />
          이어서 바로 등록을 도와드릴게요!
        </p>
        <div style={{ background: "#EFF6FF", borderRadius: 12, padding: "13px 16px", fontSize: 13.5, color: "#1E3A8A", lineHeight: 1.7 }}>
          이 창은 닫으셔도 돼요.<br />카카오톡 채팅방으로 돌아가면 됩니다.
        </div>
      </div>
    </div>
  );
}
