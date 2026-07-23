"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { useT } from "@/lib/i18n";
import { getCurrentUser, getProfile, updateProfile } from "@/lib/supabase";
import LocationPicker from "@/components/LocationPicker";

/**
 * StudentLocationNudge — D-2/D-4 유학생 대상 학교·주소 입력 유도 배너
 *
 * 노출 조건:
 *   - 로그인한 worker + 비자가 D-2/D-4 계열
 *   - 학교명(organization) 또는 거주지 좌표가 비어 있음
 *   - 건너뛰기 3회 미만 (localStorage: kalba_student_loc_nudge_dismiss)
 *
 * 저장:
 *   - 학교명 → profiles.organization (매칭·서류 자동완성에 재사용)
 *   - 주소/좌표 → updateProfile을 통해 정밀 값은 profile_private, 동 단위는 profiles
 *   - location_opted_in = true (주변 공고 알림 대상)
 *
 * 저장 완료 시 onSaved() 호출 — 목록을 '가까운순'으로 전환하는 용도.
 */
const DISMISS_KEY = "kalba_student_loc_nudge_dismiss";
const MAX_DISMISS = 3;

const isStudentVisa = (visa) => {
  const v = String(visa || "").toUpperCase().replace(/\s/g, "");
  return v.includes("D-2") || v.includes("D2") || v.includes("D-4") || v.includes("D4");
};

export default function StudentLocationNudge({ onSaved }) {
  const t = useT();
  const [state, setState] = useState("hidden"); // hidden | banner | form | saving | done
  const [userId, setUserId] = useState(null);
  const [needSchool, setNeedSchool] = useState(false);
  const [needAddress, setNeedAddress] = useState(false);
  const [school, setSchool] = useState("");
  const [loc, setLoc] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let dismissed = 0;
        try { dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0); } catch (_) {}
        if (dismissed >= MAX_DISMISS) return;

        const user = await getCurrentUser();
        if (!user || cancelled) return;
        const profile = await getProfile(user.id);
        if (!profile || cancelled) return;
        if ((profile.user_type || user.user_metadata?.user_type) !== "worker") return;
        if (!isStudentVisa(profile.visa)) return;

        const noSchool = !String(profile.organization || "").trim();
        const noAddress = !(profile.home_latitude && profile.home_longitude);
        if (!noSchool && !noAddress) return;

        setUserId(user.id);
        setNeedSchool(noSchool);
        setNeedAddress(noAddress);
        setSchool(profile.organization || "");
        setState("banner");
      } catch (_) { /* 노출 실패는 조용히 무시 */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const dismiss = () => {
    try {
      const n = Number(localStorage.getItem(DISMISS_KEY) || 0) + 1;
      localStorage.setItem(DISMISS_KEY, String(n));
    } catch (_) {}
    setState("hidden");
  };

  const save = async () => {
    if (state === "saving") return;
    setError(null);
    const updates = { location_opted_in: true };
    if (needSchool && school.trim()) updates.organization = school.trim();
    if (needAddress && loc.latitude && loc.longitude) {
      updates.home_latitude = loc.latitude;
      updates.home_longitude = loc.longitude;
      updates.home_address_road = loc.address_road || "";
      updates.home_address_detail = loc.address_detail || "";
      updates.home_sido = loc.sido || "";
      updates.home_sigungu = loc.sigungu || "";
      updates.home_dong = loc.dong || "";
    }
    const hasSchool = !needSchool || !!school.trim();
    const hasAddress = !needAddress || !!(loc.latitude && loc.longitude);
    if (!hasSchool && !hasAddress) {
      setError(t("nudge.fillOne", null, "학교 또는 주소 중 하나는 입력해 주세요."));
      return;
    }
    setState("saving");
    try {
      const { error: err } = await updateProfile(userId, updates);
      if (err) throw new Error(err.message);
      try { localStorage.setItem(DISMISS_KEY, String(MAX_DISMISS)); } catch (_) {}
      setState("done");
      if (onSaved) onSaved();
      setTimeout(() => setState("hidden"), 2500);
    } catch (e) {
      setError((t("nudge.saveFail", null, "저장에 실패했어요") ) + ": " + e.message);
      setState("form");
    }
  };

  if (state === "hidden") return null;

  const box = {
    border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.green}`,
    borderRadius: 6, background: "#F0F7F2", padding: "12px 14px", marginBottom: 16,
  };

  if (state === "done") {
    return (
      <div style={box}>
        <div style={{ fontSize: 13, color: T.ink, fontWeight: 600 }}>
          {t("nudge.saved", null, "✅ 저장 완료! 가까운 알바부터 보여드릴게요.")}
        </div>
      </div>
    );
  }

  if (state === "banner") {
    return (
      <div style={box}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 3 }}>
              {t("nudge.title", null, "🏠 집·학교 근처 알바를 추천해 드릴게요")}
            </div>
            <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.5 }}>
              {t("nudge.desc", null, "유학생이시네요! 주소와 학교를 알려주시면 가까운 알바를 먼저 보여드리고, 나중에 시간제취업 서류도 자동으로 채워드려요. (30초)")}
            </div>
          </div>
          <button onClick={dismiss} aria-label="close" style={{ background: "none", border: "none", color: T.ink3, fontSize: 15, cursor: "pointer", padding: 0, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={() => setState("form")} style={{
            background: T.green, color: "#fff", border: "none", borderRadius: 4,
            padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>
            {t("nudge.start", null, "30초만에 입력하기")}
          </button>
          <button onClick={dismiss} style={{
            background: "none", border: "none", color: T.ink3, fontSize: 12,
            cursor: "pointer", textDecoration: "underline", fontFamily: "inherit",
          }}>
            {t("nudge.later", null, "다음에 할게요")}
          </button>
        </div>
      </div>
    );
  }

  // form | saving
  return (
    <div style={{ ...box, background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>
          {t("nudge.formTitle", null, "🏠 맞춤 추천 정보 입력")}
        </div>
        <button onClick={dismiss} aria-label="close" style={{ background: "none", border: "none", color: T.ink3, fontSize: 15, cursor: "pointer", padding: 0, lineHeight: 1 }}>✕</button>
      </div>

      {needSchool && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.ink2, marginBottom: 4 }}>
            {t("nudge.school", null, "🎓 학교 이름")}
          </label>
          <input
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder={t("nudge.schoolPh", null, "예: 한국대학교")}
            style={{
              width: "100%", boxSizing: "border-box", padding: "9px 10px", fontSize: 13,
              border: `1px solid ${T.border}`, borderRadius: 4, fontFamily: "inherit",
            }}
          />
        </div>
      )}

      {needAddress && (
        <div style={{ marginBottom: 12 }}>
          <LocationPicker
            value={loc}
            onChange={setLoc}
            label={t("nudge.address", null, "🏠 거주지 주소")}
            helperText={t("nudge.addressHelp", null, "동 단위까지만 공개되고, 상세 주소·위치는 본인만 볼 수 있게 안전하게 보관돼요.")}
            hideMap
          />
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: "#C0392B", marginBottom: 8 }}>{error}</div>}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={save} disabled={state === "saving"} style={{
          background: T.green, color: "#fff", border: "none", borderRadius: 4,
          padding: "8px 16px", fontSize: 12, fontWeight: 700,
          cursor: state === "saving" ? "default" : "pointer", opacity: state === "saving" ? 0.6 : 1, fontFamily: "inherit",
        }}>
          {state === "saving" ? t("nudge.saving", null, "저장 중...") : t("nudge.save", null, "저장하고 가까운 알바 보기")}
        </button>
        <button onClick={dismiss} style={{
          background: "none", border: "none", color: T.ink3, fontSize: 12,
          cursor: "pointer", textDecoration: "underline", fontFamily: "inherit",
        }}>
          {t("nudge.later", null, "다음에 할게요")}
        </button>
      </div>
    </div>
  );
}
