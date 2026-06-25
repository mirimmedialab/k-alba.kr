"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { Inp, ChipSelect } from "@/components/UI";
import { AddressSearchField } from "@/components/AddressSearch";
import { getCurrentUser, getProfile, updateProfile, getWorkHistory, signOut, supabase } from "@/lib/supabase";
import { VISA_OPTIONS, COUNTRIES, KOREAN_LEVELS, WORK_TYPES, JOB_TYPES, REGIONS, BENEFITS } from "@/data/marketData";
import { FormPageSkel } from "@/components/Wireframe";
import LocationPicker from "@/components/LocationPicker";
import { useT } from "@/lib/i18n";
import { Button, Card, ButtonLoading, PageLoading } from "@/components/ui";
import { useIsDesktop } from "@/lib/useIsDesktop";
import BusinessVerify from "@/components/ui/BusinessVerify";

/**
 * /profile 프로필 (BI v2)
 *
 * 페르소나 분기:
 *   - 사장님(employer): coralDark + 골드
 *   - 구직자(worker): coral + 민트
 *
 * 변경점 (BI v2):
 *   - Btn (UI.jsx) → Button (Step 3-A) — 사장님은 primaryDark, 구직자는 primary
 *   - Card (UI.jsx) → Card (Step 3-A)
 *   - 저장 중 로딩 → ButtonLoading
 *   - T.g500/g700/g100/g200 → T.ink3/ink2/border/borderStrong
 *
 * 보존:
 *   - Inp, ChipSelect (UI.jsx) — options/label 기능 유지
 *   - LocationPicker, AddressSearchField — 위치 컴포넌트
 *   - 양측 페르소나 분기 (사장님/구직자)
 *   - 편집/뷰 모드
 *   - 위치 기반 설정 (반경, 통근 시간)
 *   - K-ALBA 인증 한국 경력
 *   - 다국어 (useT)
 */
export default function ProfilePage() {
  const router = useRouter();
  const t = useT();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workHistory, setWorkHistory] = useState([]);
  const isDesktop = useIsDesktop();

  const TRANSPORT_MODES = [
    { v: "transit", l: t("profile.transportTransit") },
    { v: "walk", l: t("profile.transportWalk") },
    { v: "bike", l: t("profile.transportBike") },
    { v: "car", l: t("profile.transportCar") },
  ];

  const [form, setForm] = useState({
    name: "", phone: "", visa: "", country: "", organization: "", address: "",
    korean_level: "", work_types: [], regions: [], job_types: [],
    home_experience: "", korea_experience: "",
    company_name: "", business_number: "", business_address: "",
    home_latitude: null, home_longitude: null, home_address_road: "",
    home_sido: "", home_sigungu: "", home_dong: "",
    search_radius_km: 10, transport_modes: ["transit", "walk"],
    max_commute_min: 60, location_opted_in: false,
  });

  useEffect(() => {
    getCurrentUser().then(async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);
      const p = await getProfile(u.id);
      if (p) {
        setProfile(p);
        setForm({
          name: p.name || "", phone: p.phone || "", visa: p.visa || "",
          country: p.country || "", organization: p.organization || "",
          address: p.address || "", korean_level: p.korean_level || "",
          work_types: p.work_types || [], regions: p.regions || [],
          job_types: p.job_types || [],
          home_experience: p.home_experience || "",
          korea_experience: p.korea_experience || "",
          company_name: p.company_name || "",
          business_number: p.business_number || "",
          business_address: p.business_address || "",
          home_latitude: p.home_latitude || null,
          home_longitude: p.home_longitude || null,
          home_address_road: p.home_address_road || "",
          home_sido: p.home_sido || "",
          home_sigungu: p.home_sigungu || "",
          home_dong: p.home_dong || "",
          search_radius_km: p.search_radius_km ?? 10,
          transport_modes: p.transport_modes || ["transit", "walk"],
          max_commute_min: p.max_commute_min ?? 60,
          location_opted_in: p.location_opted_in || false,
        });
      }
      const wh = await getWorkHistory(u.id);
      setWorkHistory(wh);
    });
  }, [router]);

  const isEmployer = user?.user_metadata?.user_type === "employer";
  // 데스크탑: 폰 프레임 제거 + 컨테이너 확장(모바일 값은 그대로)
  const pageStyle = { padding: isDesktop ? "40px 28px 64px" : 20, maxWidth: isDesktop ? 820 : 600, margin: "0 auto" };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateProfile(user.id, form);
    setSaving(false);
    if (!error) {
      setProfile({ ...profile, ...form });
      setEditing(false);
    }
  };

  if (!user) return isDesktop ? <PageLoading message={t("common.pleaseWait")} minHeight={400} /> : <FormPageSkel maxWidth={600} fields={5} />;

  // ─── 사장님 프로필 (coralDark) ───
  if (isEmployer) {
    return (
      <div style={pageStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: T.navy }}>💼 {t("profile.myProfile")}</h2>
          {!editing ? (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>{t("common.edit")}</Button>
          ) : (
            <Button variant="primaryDark" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <ButtonLoading text={t("profile.saving")} /> : t("common.save")}
            </Button>
          )}
        </div>

        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.coral, marginBottom: 12, letterSpacing: 1 }}>{t("profile.companyInfo")}</div>
          {editing ? (
            <>
              <Inp label={t("profile.companyName")} value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
              <Inp label={t("profile.ceoName")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Inp label={t("profile.businessNumber")} placeholder={t("profile.businessNumberPlaceholder")} value={form.business_number} onChange={(e) => setForm({ ...form, business_number: e.target.value })} />
              <Inp label={t("profile.phone")} placeholder={t("profile.phonePlaceholder")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <LocationPicker
                label={t("profile.businessAddress")}
                value={{
                  latitude: form.home_latitude,
                  longitude: form.home_longitude,
                  address_road: form.business_address,
                  sido: form.home_sido,
                  sigungu: form.home_sigungu,
                  dong: form.home_dong,
                }}
                onChange={(v) => setForm({
                  ...form,
                  business_address: v.address_road || "",
                  home_latitude: v.latitude,
                  home_longitude: v.longitude,
                  home_sido: v.sido,
                  home_sigungu: v.sigungu,
                  home_dong: v.dong,
                })}
                helperText={t("profile.locationHelperTextBusiness")}
              />
            </>
          ) : (
            <div style={{ lineHeight: 2 }}>
              <div><strong>{t("profile.companyNameLabel")}</strong> {form.company_name || "-"}</div>
              <div><strong>{t("profile.ceoNameLabel")}</strong> {form.name || "-"}</div>
              <div><strong>{t("profile.businessNumberLabel")}</strong> {form.business_number ? String(form.business_number).replace(/-/g, "").replace(/^(\d{3})(\d{2})(\d{5})$/, "$1-$2-$3") : "-"}</div>
              <div><strong>{t("profile.phoneDisplayLabel")}</strong> {form.phone || "-"}</div>
              <div><strong>{t("profile.addressDisplayLabel")}</strong> {form.business_address || "-"}</div>
            </div>
          )}
        </Card>

        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.coral, marginBottom: 12, letterSpacing: 1 }}>{t("profile.verificationStatus")}</div>
          {profile?.verified ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 14, background: T.mintL, borderRadius: 10 }}>
              <span style={{ fontSize: 24 }}>✅</span>
              <div>
                <div style={{ fontWeight: 700, color: "#059669" }}>{t("profile.verified")}</div>
                <div style={{ fontSize: 12, color: T.ink3 }}>{t("profile.verifiedDesc")}</div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 14, background: T.cream, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 24 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, color: T.ink2 }}>{t("profile.notVerified")}</div>
                  <div style={{ fontSize: 12, color: T.ink3 }}>{t("profile.notVerifiedDesc")}</div>
                </div>
              </div>
              <BusinessVerify
                userId={user.id}
                onVerified={({ business_number }) => setProfile({ ...profile, verified: true, business_number })}
              />
            </div>
          )}
        </Card>

        <DangerZone />
      </div>
    );
  }

  // ─── 구직자 프로필 (coral) ───
  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: T.navy }}>🌏 {t("profile.myProfile")}</h2>
        {!editing ? (
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>{t("common.edit")}</Button>
        ) : (
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <ButtonLoading text={t("profile.saving")} /> : t("common.save")}
          </Button>
        )}
      </div>

      {/* 체류 정보 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.mint, marginBottom: 12, letterSpacing: 1 }}>{t("profile.residenceInfo")}</div>
        {editing ? (
          <>
            <Inp label={t("profile.name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Inp label={t("profile.phone")} placeholder={t("profile.phonePlaceholder")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Inp label={t("profile.visa")} options={VISA_OPTIONS} value={form.visa} onChange={(e) => setForm({ ...form, visa: e.target.value })} />
            <Inp label={t("profile.country")} options={COUNTRIES} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            <Inp label={t("profile.organization")} placeholder={t("profile.organizationPlaceholder")} value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
            <AddressSearchField label={t("profile.address")} value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
          </>
        ) : (
          <div style={{ lineHeight: 2 }}>
            <div><strong>{t("profile.nameLabel")}</strong> {form.name || "-"}</div>
            <div><strong>{t("profile.phoneLabel")}</strong> {form.phone || "-"}</div>
            <div><strong>{t("profile.visaLabel")}</strong> {VISA_OPTIONS.find(v => v.v === form.visa)?.l || "-"}</div>
            <div><strong>{t("profile.countryLabel")}</strong> {form.country || "-"}</div>
            <div><strong>{t("profile.organizationLabel")}</strong> {form.organization || "-"}</div>
            <div><strong>{t("profile.addressLabel")}</strong> {form.address || "-"}</div>
          </div>
        )}
      </Card>

      {/* 구직 정보 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.mint, marginBottom: 12, letterSpacing: 1 }}>{t("profile.jobInfo")}</div>
        {editing ? (
          <>
            <Inp label={t("profile.koreanLevel")} options={KOREAN_LEVELS} value={form.korean_level} onChange={(e) => setForm({ ...form, korean_level: e.target.value })} />
            <ChipSelect label={t("profile.workTypes")} options={WORK_TYPES} selected={form.work_types} setSelected={(v) => setForm({ ...form, work_types: v })} />
            <ChipSelect label={t("profile.regions")} options={REGIONS} selected={form.regions} setSelected={(v) => setForm({ ...form, regions: v })} />
            <ChipSelect label={t("profile.jobTypes")} options={JOB_TYPES} selected={form.job_types} setSelected={(v) => setForm({ ...form, job_types: v })} />
          </>
        ) : (
          <div style={{ lineHeight: 2 }}>
            <div><strong>{t("profile.koreanLabel")}</strong> {KOREAN_LEVELS.find(k => k.v === form.korean_level)?.l || "-"}</div>
            <div><strong>{t("profile.workTypesLabel")}</strong> {(form.work_types || []).join(", ") || "-"}</div>
            <div><strong>{t("profile.regionsLabel")}</strong> {(form.regions || []).join(", ") || "-"}</div>
            <div><strong>{t("profile.jobTypesLabel")}</strong> {(form.job_types || []).join(", ") || "-"}</div>
          </div>
        )}
      </Card>

      {/* 위치 기반 설정 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: T.ink3,
          marginBottom: 4, letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          {t("profile.locationTitle")}
        </div>
        <div style={{ fontSize: 11, color: T.ink3, marginBottom: 14, lineHeight: 1.6 }}>
          {t("profile.locationDesc")}
        </div>

        {editing ? (
          <>
            <LocationPicker
              label={t("profile.address")}
              value={{
                latitude: form.home_latitude,
                longitude: form.home_longitude,
                address_road: form.home_address_road,
                sido: form.home_sido,
                sigungu: form.home_sigungu,
                dong: form.home_dong,
              }}
              onChange={(v) => setForm({
                ...form,
                home_latitude: v.latitude,
                home_longitude: v.longitude,
                home_address_road: v.address_road,
                home_sido: v.sido,
                home_sigungu: v.sigungu,
                home_dong: v.dong,
                location_opted_in: true,
              })}
              helperText={t("profile.locationHelperText")}
            />

            {/* 선호 반경 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 6, letterSpacing: "-0.01em" }}>
                {t("profile.preferredRadius")}: <span style={{ color: T.accent, fontWeight: 800 }}>{form.search_radius_km}{t("profile.km")}</span>
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[3, 5, 10, 20, 50].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm({ ...form, search_radius_km: r })}
                    style={{
                      padding: "6px 14px", borderRadius: 4,
                      border: `1px solid ${form.search_radius_km === r ? T.n9 : T.border}`,
                      background: form.search_radius_km === r ? T.n9 : T.paper,
                      color: form.search_radius_km === r ? T.gold : T.ink2,
                      fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {r}{t("profile.km")}
                  </button>
                ))}
              </div>
            </div>

            <ChipSelect
              label={t("profile.transportModes")}
              options={TRANSPORT_MODES.map(m => m.l)}
              selected={(form.transport_modes || []).map(v => TRANSPORT_MODES.find(m => m.v === v)?.l).filter(Boolean)}
              setSelected={(labels) => {
                const values = labels.map(l => TRANSPORT_MODES.find(m => m.l === l)?.v).filter(Boolean);
                setForm({ ...form, transport_modes: values });
              }}
            />

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 6, letterSpacing: "-0.01em" }}>
                {t("profile.maxCommuteTime")}: <span style={{ color: T.accent, fontWeight: 800 }}>{form.max_commute_min}{t("profile.min")}</span>
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[30, 45, 60, 90, 120].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm({ ...form, max_commute_min: m })}
                    style={{
                      padding: "6px 14px", borderRadius: 4,
                      border: `1px solid ${form.max_commute_min === m ? T.n9 : T.border}`,
                      background: form.max_commute_min === m ? T.n9 : T.paper,
                      color: form.max_commute_min === m ? T.gold : T.ink2,
                      fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {m}{t("profile.min")}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ lineHeight: 2 }}>
            {form.home_latitude ? (
              <>
                <div><strong>{t("profile.residenceLabel")}</strong> {form.home_sido} {form.home_sigungu} {form.home_dong || ""}</div>
                <div><strong>{t("profile.preferredRadiusLabel")}</strong> {form.search_radius_km}{t("profile.km")}</div>
                <div><strong>{t("profile.transportModesLabel")}</strong> {(form.transport_modes || []).map(v => TRANSPORT_MODES.find(m => m.v === v)?.l).filter(Boolean).join(", ") || "-"}</div>
                <div><strong>{t("profile.maxCommuteLabel")}</strong> {form.max_commute_min}{t("profile.min")}</div>
              </>
            ) : (
              <div style={{ padding: 12, background: T.cream, borderRadius: 4, fontSize: 12, color: T.ink2 }}>
                {t("profile.locationNotRegistered")}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 자국 경력 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.mint, marginBottom: 12, letterSpacing: 1 }}>{t("profile.homeExperience")}</div>
        {editing ? (
          <textarea value={form.home_experience} onChange={(e) => setForm({ ...form, home_experience: e.target.value })} placeholder={t("profile.homeExperiencePlaceholder")} style={{ width: "100%", padding: 12, borderRadius: 10, border: `2px solid ${T.border}`, fontSize: 13, minHeight: 80, resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
        ) : (
          <p style={{ fontSize: 13, color: T.ink2, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{form.home_experience || t("profile.noContent")}</p>
        )}
      </Card>

      {/* 한국 경력 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.mint, marginBottom: 12, letterSpacing: 1 }}>{t("profile.koreaExperience")}</div>
        {editing ? (
          <textarea value={form.korea_experience} onChange={(e) => setForm({ ...form, korea_experience: e.target.value })} placeholder={t("profile.koreaExperiencePlaceholder")} style={{ width: "100%", padding: 12, borderRadius: 10, border: `2px solid ${T.border}`, fontSize: 13, minHeight: 80, resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
        ) : (
          <p style={{ fontSize: 13, color: T.ink2, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{form.korea_experience || t("profile.noContent")}</p>
        )}
      </Card>

      {/* K-ALBA 인증 한국 경력 */}
      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.mint, marginBottom: 4, letterSpacing: 1 }}>{t("profile.certifiedExperience")}</div>
        <p style={{ fontSize: 11, color: T.ink3, marginBottom: 12 }}>{t("profile.certifiedExperienceDesc")}</p>
        {workHistory.length === 0 ? (
          <div style={{ padding: 16, background: T.cream, borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>📝</div>
            <div style={{ fontSize: 13, color: T.ink2, fontWeight: 600, marginBottom: 3 }}>{t("profile.noCertified")}</div>
            <div style={{ fontSize: 11, color: T.ink3 }}>{t("profile.noCertifiedDesc")}</div>
          </div>
        ) : (
          workHistory.map((w) => (
            <div key={w.id} style={{ padding: 14, border: `1.5px solid ${T.mint}30`, borderRadius: 10, marginBottom: 8, background: "#FAFFFC" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: T.mintL, color: "#059669" }}>{t("profile.kalbaVerified")}</span>
                <span style={{ fontWeight: 700, color: T.navy, fontSize: 13 }}>{w.job?.title || w.title}</span>
              </div>
              <div style={{ fontSize: 11, color: T.ink3, marginBottom: 6 }}>{w.employer?.company_name} · {w.start_date}~{w.end_date}</div>
              {w.rating && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#F59E0B" }}>⭐ {w.rating}</span>
                  <span style={{ fontSize: 11, color: T.ink3 }}>{t("profile.employerRating")}</span>
                </div>
              )}
              {w.tags && w.tags.length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {w.tags.map((t) => (
                    <span key={t} style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "#EEF2FF", color: "#4F46E5" }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </Card>

      <DangerZone />
    </div>
  );
}

function DangerZone() {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState("");
  const [reasonText, setReasonText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const REASONS = [
    ["not_found", t("profile.reasonNotFound")],
    ["no_longer_needed", t("profile.reasonNoLongerNeeded")],
    ["too_hard", t("profile.reasonTooHard")],
    ["privacy", t("profile.reasonPrivacy")],
    ["etc", t("profile.reasonEtc")],
  ];
  const DANGER = "#DC2626";

  const handleLogout = async () => {
    await signOut();
    router.replace("/");
  };

  const handleDeactivate = async () => {
    if (!reasonCode) { setErr(t("profile.withdrawSelectReason")); return; }
    setBusy(true); setErr("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token || "";
      const res = await fetch("/api/account/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reasonCode, reasonText: reasonText.trim() || null }),
      });
      if (res.ok) {
        await signOut();
        router.replace("/account/goodbye");
      } else {
        setBusy(false);
        setErr(t("profile.withdrawFailed"));
      }
    } catch (_) {
      setBusy(false);
      setErr(t("profile.withdrawError"));
    }
  };

  return (
    <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
      <button
        type="button"
        onClick={handleLogout}
        style={{
          width: "100%", padding: "12px", marginBottom: 10,
          background: T.paper, color: T.ink2, border: `1px solid ${T.border}`,
          borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        }}
      >
        {t("profile.logout")}
      </button>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            width: "100%", padding: "12px",
            background: "transparent", color: T.ink3, border: "none",
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            textDecoration: "underline", textUnderlineOffset: "3px",
          }}
        >
          {t("profile.withdraw")}
        </button>
      ) : (
        <div style={{ border: `1px solid ${DANGER}33`, background: "#FEF2F2", borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: DANGER, marginBottom: 6 }}>{t("profile.withdraw")}</div>

          <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, marginBottom: 8 }}>{t("profile.withdrawReasonTitle")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {REASONS.map(([code, label]) => (
              <label key={code} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.ink, cursor: "pointer" }}>
                <input type="radio" name="deactivate-reason" checked={reasonCode === code} onChange={() => setReasonCode(code)} />
                {label}
              </label>
            ))}
          </div>

          {reasonCode === "etc" && (
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder={t("profile.withdrawReasonPlaceholder")}
              style={{ width: "100%", padding: 10, borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, minHeight: 64, resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 10 }}
            />
          )}

          {err && <div style={{ fontSize: 12, color: DANGER, marginBottom: 10 }}>{err}</div>}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => { setOpen(false); setErr(""); }}
              disabled={busy}
              style={{ flex: 1, padding: "11px", background: T.paper, color: T.ink2, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={busy}
              style={{ flex: 1, padding: "11px", background: DANGER, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: busy ? "default" : "pointer", fontFamily: "inherit", opacity: busy ? 0.7 : 1 }}
            >
              {busy ? t("profile.withdrawProcessing") : t("profile.withdrawConfirm")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
