"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { Btn, Card, Inp, ChipSelect } from "@/components/UI";
import { AddressSearchField } from "@/components/AddressSearch";
import { getCurrentUser, getProfile, updateProfile, getWorkHistory } from "@/lib/supabase";
import { VISA_OPTIONS, COUNTRIES, KOREAN_LEVELS, WORK_TYPES, JOB_TYPES, REGIONS, BENEFITS } from "@/data/marketData";

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

  if (!user) return <div style={{ padding: 40, textAlign: "center" }}>로딩 중...</div>;

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
              <AddressSearchField label="사업장 주소" value={form.business_address} onChange={(v) => setForm({ ...form, business_address: v })} />
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
