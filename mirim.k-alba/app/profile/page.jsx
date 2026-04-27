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

const TRANSPORT_MODES = [
  { v: "transit", l: "🚇 대중교통" },
  { v: "walk", l: "🚶 도보" },
  { v: "bike", l: "🚴 자전거" },
  { v: "car", l: "🚗 자동차" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workHistory, setWorkHistory] = useState([]);
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
          <h2 style={{ fontSize: 22, fontWeight: 800, color: T.navy }}>💼 업체 프로필</h2>
          {!editing ? (
            <Btn small onClick={() => setEditing(true)}>수정</Btn>
          ) : (
            <Btn primary small onClick={handleSave} disabled={saving}>{saving ? "저장 중..." : "저장"}</Btn>
          )}
        </div>

        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.coral, marginBottom: 12, letterSpacing: 1 }}>업체 정보</div>
          {editing ? (
            <>
              <Inp label="업체명" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
              <Inp label="대표자명" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Inp label="사업자등록번호" placeholder="000-00-00000" value={form.business_number} onChange={(e) => setForm({ ...form, business_number: e.target.value })} />
              <Inp label="연락처" placeholder="010-0000-0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <LocationPicker
                label="사업장 주소"
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
                helperText="주소 검색 후 지도에서 핀을 드래그해 정확한 매장 위치로 조정해 주세요."
              />
            </>
          ) : (
            <div style={{ lineHeight: 2 }}>
              <div><strong>업체명:</strong> {form.company_name || "-"}</div>
              <div><strong>대표자:</strong> {form.name || "-"}</div>
              <div><strong>사업자번호:</strong> {form.business_number || "-"}</div>
              <div><strong>연락처:</strong> {form.phone || "-"}</div>
              <div><strong>주소:</strong> {form.business_address || "-"}</div>
            </div>
          )}
        </Card>

        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.coral, marginBottom: 12, letterSpacing: 1 }}>인증 상태</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 14, background: T.mintL, borderRadius: 10 }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <div>
              <div style={{ fontWeight: 700, color: "#059669" }}>사업자 인증 완료</div>
              <div style={{ fontSize: 12, color: T.g500 }}>K-ALBA 인증 업체로 표시됩니다</div>
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
        <h2 style={{ fontSize: 22, fontWeight: 800, color: T.navy }}>🌏 내 프로필</h2>
        {!editing ? (
          <Btn small onClick={() => setEditing(true)}>수정</Btn>
        ) : (
          <Btn primary small onClick={handleSave} disabled={saving}>{saving ? "저장 중..." : "저장"}</Btn>
        )}
      </div>

      {/* 체류 정보 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.mint, marginBottom: 12, letterSpacing: 1 }}>체류 정보</div>
        {editing ? (
          <>
            <Inp label="이름" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Inp label="연락처" placeholder="010-0000-0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Inp label="비자 유형" options={VISA_OPTIONS} value={form.visa} onChange={(e) => setForm({ ...form, visa: e.target.value })} />
            <Inp label="국적" options={COUNTRIES} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            <Inp label="소속 (학교/회사명)" placeholder="예: 서울대학교" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
            <AddressSearchField label="현재 거주지" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
          </>
        ) : (
          <div style={{ lineHeight: 2 }}>
            <div><strong>이름:</strong> {form.name || "-"}</div>
            <div><strong>연락처:</strong> {form.phone || "-"}</div>
            <div><strong>비자:</strong> {VISA_OPTIONS.find(v => v.v === form.visa)?.l || "-"}</div>
            <div><strong>국적:</strong> {form.country || "-"}</div>
            <div><strong>소속:</strong> {form.organization || "-"}</div>
            <div><strong>거주지:</strong> {form.address || "-"}</div>
          </div>
        )}
      </Card>

      {/* 구직 정보 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.mint, marginBottom: 12, letterSpacing: 1 }}>구직 정보</div>
        {editing ? (
          <>
            <Inp label="한국어 수준" options={KOREAN_LEVELS} value={form.korean_level} onChange={(e) => setForm({ ...form, korean_level: e.target.value })} />
            <ChipSelect label="원하는 근무 형태" options={WORK_TYPES} selected={form.work_types} setSelected={(v) => setForm({ ...form, work_types: v })} />
            <ChipSelect label="선호 지역" options={REGIONS} selected={form.regions} setSelected={(v) => setForm({ ...form, regions: v })} />
            <ChipSelect label="선호 업종" options={JOB_TYPES} selected={form.job_types} setSelected={(v) => setForm({ ...form, job_types: v })} />
          </>
        ) : (
          <div style={{ lineHeight: 2 }}>
            <div><strong>한국어:</strong> {KOREAN_LEVELS.find(k => k.v === form.korean_level)?.l || "-"}</div>
            <div><strong>근무 형태:</strong> {(form.work_types || []).join(", ") || "-"}</div>
            <div><strong>선호 지역:</strong> {(form.regions || []).join(", ") || "-"}</div>
            <div><strong>선호 업종:</strong> {(form.job_types || []).join(", ") || "-"}</div>
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
          Location · 위치 기반 매칭
        </div>
        <div style={{ fontSize: 11, color: T.ink3, marginBottom: 14, lineHeight: 1.6 }}>
          거주지 주소를 등록하면 가까운 알바를 먼저 볼 수 있어요. 대중교통 소요시간도 자동 계산됩니다.
        </div>

        {editing ? (
          <>
            {/* 거주지 주소 + 지도 */}
            <LocationPicker
              label="현재 거주지"
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
              helperText="정확한 위치가 아니어도 괜찮아요 — 대략적인 위치로 등록하셔도 됩니다."
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
                선호 알바 반경: <span style={{ color: T.accent, fontWeight: 800 }}>{form.search_radius_km}km</span>
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
                    {r}km
                  </button>
                ))}
              </div>
            </div>

            {/* 이동 가능 수단 */}
            <ChipSelect
              label="이동 가능 수단"
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
                최대 허용 통근 시간: <span style={{ color: T.accent, fontWeight: 800 }}>{form.max_commute_min}분</span>
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
                    {m}분
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ lineHeight: 2 }}>
            {form.home_latitude ? (
              <>
                <div><strong>거주지:</strong> {form.home_sido} {form.home_sigungu} {form.home_dong || ""}</div>
                <div><strong>선호 반경:</strong> {form.search_radius_km}km</div>
                <div><strong>이동 수단:</strong> {(form.transport_modes || []).map(v => TRANSPORT_MODES.find(m => m.v === v)?.l).filter(Boolean).join(", ") || "-"}</div>
                <div><strong>최대 통근:</strong> {form.max_commute_min}분</div>
              </>
            ) : (
              <div style={{ padding: 12, background: T.cream, borderRadius: 4, fontSize: 12, color: T.ink2 }}>
                💡 거주지를 등록하면 우리 집 근처 알바를 먼저 볼 수 있어요. [수정] 버튼을 눌러 등록해 주세요.
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 자국 경력 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.mint, marginBottom: 12, letterSpacing: 1 }}>자국 경력 / 기술</div>
        {editing ? (
          <textarea value={form.home_experience} onChange={(e) => setForm({ ...form, home_experience: e.target.value })} placeholder="자국에서의 경력 및 보유 기술을 자유롭게 작성해 주세요" style={{ width: "100%", padding: 12, borderRadius: 10, border: `2px solid ${T.g200}`, fontSize: 13, minHeight: 80, resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
        ) : (
          <p style={{ fontSize: 13, color: T.g700, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{form.home_experience || "작성된 내용이 없습니다"}</p>
        )}
      </Card>

      {/* 한국 경력 (직접 입력) */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.mint, marginBottom: 12, letterSpacing: 1 }}>한국 경력 (직접 입력)</div>
        {editing ? (
          <textarea value={form.korea_experience} onChange={(e) => setForm({ ...form, korea_experience: e.target.value })} placeholder="K-ALBA 외부에서의 한국 경력" style={{ width: "100%", padding: 12, borderRadius: 10, border: `2px solid ${T.g200}`, fontSize: 13, minHeight: 80, resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
        ) : (
          <p style={{ fontSize: 13, color: T.g700, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{form.korea_experience || "작성된 내용이 없습니다"}</p>
        )}
      </Card>

      {/* K-ALBA 인증 한국 경력 */}
      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.mint, marginBottom: 4, letterSpacing: 1 }}>K-ALBA 인증 한국 경력</div>
        <p style={{ fontSize: 11, color: T.g500, marginBottom: 12 }}>K-ALBA 통해 근무한 경력은 사장님 평가와 함께 자동 기록됩니다</p>
        {workHistory.length === 0 ? (
          <div style={{ padding: 16, background: T.g100, borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>📝</div>
            <div style={{ fontSize: 13, color: T.g700, fontWeight: 600, marginBottom: 3 }}>아직 인증된 경력이 없습니다</div>
            <div style={{ fontSize: 11, color: T.g500 }}>K-ALBA 알바를 시작하시면 자동으로 기록됩니다</div>
          </div>
        ) : (
          workHistory.map((w) => (
            <div key={w.id} style={{ padding: 14, border: `1.5px solid ${T.mint}30`, borderRadius: 10, marginBottom: 8, background: "#FAFFFC" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: T.mintL, color: "#059669" }}>✓ K-ALBA 인증</span>
                <span style={{ fontWeight: 700, color: T.navy, fontSize: 13 }}>{w.job?.title || w.title}</span>
              </div>
              <div style={{ fontSize: 11, color: T.g500, marginBottom: 6 }}>{w.employer?.company_name} · {w.start_date}~{w.end_date}</div>
              {w.rating && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#F59E0B" }}>⭐ {w.rating}</span>
                  <span style={{ fontSize: 11, color: T.g500 }}>사장님 평가</span>
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
