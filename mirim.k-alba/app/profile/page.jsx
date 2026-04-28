"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { Btn, Card, Inp, ChipSelect } from "@/components/UI";
import { AddressSearchField } from "@/components/AddressSearch";
import { getCurrentUser, getProfile, updateProfile, getWorkHistory } from "@/lib/supabase";
import { VISA_OPTIONS, COUNTRIES, KOREAN_LEVELS, WORK_TYPES, JOB_TYPES, REGIONS, BENEFITS } from "@/data/marketData";
import { FormPageSkel } from "@/components/Wireframe";
import LocationPicker from "@/components/LocationPicker";
import { useT } from "@/lib/i18n";

export default function ProfilePage() {
  const router = useRouter();
  const t = useT();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workHistory, setWorkHistory] = useState([]);

  const TRANSPORT_MODES = [
    { v: "transit", l: t("profile.transportTransit") },
    { v: "walk", l: t("profile.transportWalk") },
    { v: "bike", l: t("profile.transportBike") },
    { v: "car", l: t("profile.transportCar") },
  ];

  const [form, setForm] = useState({
    name: "",
    phone: "",
    visa: "",
    country: "",
    organization: "", // 소속 (학교/회사)
    address: "",
    korean_level: "",
    work_types: [],
    regions: [],
    job_types: [],
    home_experience: "",
    korea_experience: "",
    // 사장님
    company_name: "",
    business_number: "",
    business_address: "",
    // 🆕 위치 기반 필드
    home_latitude: null,
    home_longitude: null,
    home_address_road: "",
    home_sido: "",
    home_sigungu: "",
    home_dong: "",
    search_radius_km: 10,
    transport_modes: ["transit", "walk"],
    max_commute_min: 60,
    location_opted_in: false,
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
          name: p.name || "",
          phone: p.phone || "",
          visa: p.visa || "",
          country: p.country || "",
          organization: p.organization || "",
          address: p.address || "",
          korean_level: p.korean_level || "",
          work_types: p.work_types || [],
          regions: p.regions || [],
          job_types: p.job_types || [],
          home_experience: p.home_experience || "",
          korea_experience: p.korea_experience || "",
          company_name: p.company_name || "",
          business_number: p.business_number || "",
          business_address: p.business_address || "",
          // 🆕 위치 기반
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

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateProfile(user.id, form);
    setSaving(false);
    if (!error) {
      setProfile({ ...profile, ...form });
      setEditing(false);
    }
  };

  if (!user) return <FormPageSkel maxWidth={600} fields={5} />;

  // ─── 사장님 프로필 ───
  if (isEmployer) {
    return (
      <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: T.navy }}>💼 {t("profile.employerProfile")}</h2>
          {!editing ? (
            <Btn small onClick={() => setEditing(true)}>{t("common.edit")}</Btn>
          ) : (
            <Btn primary small onClick={handleSave} disabled={saving}>{saving ? t("profile.saving") : t("common.save")}</Btn>
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
              <div><strong>{t("profile.businessNumberLabel")}</strong> {form.business_number || "-"}</div>
              <div><strong>{t("profile.phoneDisplayLabel")}</strong> {form.phone || "-"}</div>
              <div><strong>{t("profile.addressDisplayLabel")}</strong> {form.business_address || "-"}</div>
            </div>
          )}
        </Card>

        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.coral, marginBottom: 12, letterSpacing: 1 }}>{t("profile.verificationStatus")}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 14, background: T.mintL, borderRadius: 10 }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <div>
              <div style={{ fontWeight: 700, color: "#059669" }}>{t("profile.verified")}</div>
              <div style={{ fontSize: 12, color: T.g500 }}>{t("profile.verifiedDesc")}</div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ─── 구직자 프로필 ───
  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: T.navy }}>🌏 {t("profile.myProfile")}</h2>
        {!editing ? (
          <Btn small onClick={() => setEditing(true)}>{t("common.edit")}</Btn>
        ) : (
          <Btn primary small onClick={handleSave} disabled={saving}>{saving ? t("profile.saving") : t("common.save")}</Btn>
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

      {/* 🆕 위치 기반 설정 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: T.ink3,
          marginBottom: 4,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}>
          {t("profile.locationTitle")}
        </div>
        <div style={{ fontSize: 11, color: T.ink3, marginBottom: 14, lineHeight: 1.6 }}>
          {t("profile.locationDesc")}
        </div>

        {editing ? (
          <>
            {/* 거주지 주소 + 지도 */}
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
              <label style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: T.ink,
                marginBottom: 6,
                letterSpacing: "-0.01em",
              }}>
                {t("profile.preferredRadius")}: <span style={{ color: T.accent, fontWeight: 800 }}>{form.search_radius_km}{t("profile.km")}</span>
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[3, 5, 10, 20, 50].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm({ ...form, search_radius_km: r })}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 4,
                      border: `1px solid ${form.search_radius_km === r ? T.n9 : T.border}`,
                      background: form.search_radius_km === r ? T.n9 : T.paper,
                      color: form.search_radius_km === r ? T.gold : T.ink2,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {r}{t("profile.km")}
                  </button>
                ))}
              </div>
            </div>

            {/* 이동 가능 수단 */}
            <ChipSelect
              label={t("profile.transportModes")}
              options={TRANSPORT_MODES.map(m => m.l)}
              selected={(form.transport_modes || []).map(v => TRANSPORT_MODES.find(m => m.v === v)?.l).filter(Boolean)}
              setSelected={(labels) => {
                const values = labels.map(l => TRANSPORT_MODES.find(m => m.l === l)?.v).filter(Boolean);
                setForm({ ...form, transport_modes: values });
              }}
            />

            {/* 최대 통근 시간 */}
            <div style={{ marginBottom: 8 }}>
              <label style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: T.ink,
                marginBottom: 6,
                letterSpacing: "-0.01em",
              }}>
                {t("profile.maxCommuteTime")}: <span style={{ color: T.accent, fontWeight: 800 }}>{form.max_commute_min}{t("profile.min")}</span>
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[30, 45, 60, 90, 120].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm({ ...form, max_commute_min: m })}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 4,
                      border: `1px solid ${form.max_commute_min === m ? T.n9 : T.border}`,
                      background: form.max_commute_min === m ? T.n9 : T.paper,
                      color: form.max_commute_min === m ? T.gold : T.ink2,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
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
          <textarea value={form.home_experience} onChange={(e) => setForm({ ...form, home_experience: e.target.value })} placeholder={t("profile.homeExperiencePlaceholder")} style={{ width: "100%", padding: 12, borderRadius: 10, border: `2px solid ${T.g200}`, fontSize: 13, minHeight: 80, resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
        ) : (
          <p style={{ fontSize: 13, color: T.g700, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{form.home_experience || t("profile.noContent")}</p>
        )}
      </Card>

      {/* 한국 경력 (직접 입력) */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.mint, marginBottom: 12, letterSpacing: 1 }}>{t("profile.koreaExperience")}</div>
        {editing ? (
          <textarea value={form.korea_experience} onChange={(e) => setForm({ ...form, korea_experience: e.target.value })} placeholder={t("profile.koreaExperiencePlaceholder")} style={{ width: "100%", padding: 12, borderRadius: 10, border: `2px solid ${T.g200}`, fontSize: 13, minHeight: 80, resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
        ) : (
          <p style={{ fontSize: 13, color: T.g700, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{form.korea_experience || t("profile.noContent")}</p>
        )}
      </Card>

      {/* K-ALBA 인증 한국 경력 */}
      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.mint, marginBottom: 4, letterSpacing: 1 }}>{t("profile.certifiedExperience")}</div>
        <p style={{ fontSize: 11, color: T.g500, marginBottom: 12 }}>{t("profile.certifiedExperienceDesc")}</p>
        {workHistory.length === 0 ? (
          <div style={{ padding: 16, background: T.g100, borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>📝</div>
            <div style={{ fontSize: 13, color: T.g700, fontWeight: 600, marginBottom: 3 }}>{t("profile.noCertified")}</div>
            <div style={{ fontSize: 11, color: T.g500 }}>{t("profile.noCertifiedDesc")}</div>
          </div>
        ) : (
          workHistory.map((w) => (
            <div key={w.id} style={{ padding: 14, border: `1.5px solid ${T.mint}30`, borderRadius: 10, marginBottom: 8, background: "#FAFFFC" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: T.mintL, color: "#059669" }}>{t("profile.kalbaVerified")}</span>
                <span style={{ fontWeight: 700, color: T.navy, fontSize: 13 }}>{w.job?.title || w.title}</span>
              </div>
              <div style={{ fontSize: 11, color: T.g500, marginBottom: 6 }}>{w.employer?.company_name} · {w.start_date}~{w.end_date}</div>
              {w.rating && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#F59E0B" }}>⭐ {w.rating}</span>
                  <span style={{ fontSize: 11, color: T.g500 }}>{t("profile.employerRating")}</span>
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
    </div>
  );
}
