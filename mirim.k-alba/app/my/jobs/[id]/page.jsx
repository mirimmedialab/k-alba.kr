"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { getCurrentUser, getJob, updateJob, deleteJob, getJobApplicants, updateApplicationStatus } from "@/lib/supabase";
import { Button, Badge, PageLoading } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { JOB_TYPES, WORK_TYPES, KOREAN_LEVELS, BENEFITS, VISA_OPTIONS } from "@/data/marketData";
import { formatPhoneInput, formatPhoneDisplay } from "@/lib/phone";

/**
 * /my/jobs/[id] — 사장님 공고 관리 (탭)
 *   - 공고 정보: 상세 보기 / 수정(내용 필드) / 삭제(소프트: status='deleted')
 *   - 지원자: 지원자 목록 + 전체 관리(/applicants?jobId=) 링크
 *   (주소 변경은 지오코딩 필요 → 후속. 현재는 읽기 전용 표시)
 */

const PAY_TYPES = ["시급", "일급", "월급"];

// 값이 배열/문자열/중첩 JSON문자열(["\"[...\"]) 무엇이든 깨끗한 문자열 배열로 정규화
function toArr(v) {
  if (v == null) return [];
  let val = v;
  // 과거 버그로 배열이 텍스트 컬럼에 중첩 JSON으로 저장된 경우 반복 파싱
  for (let i = 0; i < 3 && typeof val === "string" && /^\s*\[/.test(val); i++) {
    try { val = JSON.parse(val); } catch { break; }
  }
  const out = [];
  const push = (s) => {
    const t = String(s).replace(/[\[\]"\\]/g, "").trim(); // 잔여 []"\ 기호 제거
    if (t) out.push(t);
  };
  if (Array.isArray(val)) {
    val.forEach((x) => (Array.isArray(x) ? x.forEach(push) : String(x).split(",").forEach(push)));
  } else {
    String(val).split(",").forEach(push);
  }
  return out;
}

export default function JobManagePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const t = useT();

  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [tab, setTab] = useState("info");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!id) return;
    getCurrentUser().then(async (u) => {
      if (!u) { router.push("/login"); return; }
      const j = await getJob(id);
      if (!j || j.employer_id !== u.id) { setForbidden(true); setLoading(false); return; }
      setJob(j);
      const apps = await getJobApplicants(id);
      setApplicants(apps || []);
      setLoading(false);
    });
  }, [id, router]);

  const startEdit = () => {
    setForm({
      title: job.title || "",
      job_type: job.job_type || "",
      work_type: toArr(job.work_type),
      pay_type: job.pay_type || "시급",
      pay_amount: job.pay_amount || "",
      work_hours: job.work_hours || "",
      work_days: job.work_days || "",
      korean_level: job.korean_level || "",
      visa_types: toArr(job.visa_types),
      headcount: job.headcount || "",
      benefits: toArr(job.benefits),
      description: job.description || "",
      contactPhone: job.contact_phone || "",
      contactMobile: job.contact_mobile || "",
      contactEmail: job.contact_email || "",
      status: job.status === "closed" ? "closed" : "active",
    });
    setErr("");
    setEditing(true);
  };

  const save = async () => {
    setErr("");
    if (!form.title.trim()) return setErr("공고 제목을 입력해 주세요.");
    if (form.visa_types.length === 0) return setErr("지원 가능 비자를 1개 이상 선택해 주세요.");
    setSaving(true);
    const updates = {
      title: form.title.trim(),
      job_type: form.job_type,
      // work_type/benefits는 DB가 text 컬럼 → 배열을 쉼표 문자열로 저장(중첩 JSON 깨짐 방지)
      work_type: Array.isArray(form.work_type) ? form.work_type.join(", ") : (form.work_type || ""),
      pay_type: form.pay_type,
      pay_amount: String(form.pay_amount).trim() ? Number(String(form.pay_amount).replace(/[^0-9]/g, "")) : null,
      work_hours: form.work_hours,
      work_days: form.work_days,
      korean_level: form.korean_level,
      visa_types: form.visa_types,
      headcount: form.headcount,
      benefits: Array.isArray(form.benefits) ? form.benefits.join(", ") : (form.benefits || ""),
      description: form.description,
      contact_phone: form.contactPhone.trim() || null,
      contact_mobile: form.contactMobile.trim() || null,
      contact_email: form.contactEmail.trim() || null,
      status: form.status,
    };
    const { data, error } = await updateJob(id, updates);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setJob(data || { ...job, ...updates });
    setEditing(false);
  };

  const onDelete = async () => {
    if (typeof window !== "undefined" && !window.confirm("이 공고를 삭제할까요?")) return;
    const { error } = await deleteJob(id);
    if (error) { setErr(error.message); return; }
    router.push("/my/jobs");
  };

  // 지원자 합격/불합격 처리 (탭 안에서 바로)
  const setApplicantStatus = async (appId, status) => {
    setApplicants((prev) => prev.map((a) => (a.id === appId ? { ...a, status } : a)));
    await updateApplicationStatus(appId, status);
  };

  if (loading) return <PageLoading message={t("common.pleaseWait")} minHeight={400} />;
  if (forbidden) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "60px 24px", textAlign: "center", color: T.ink2 }}>
        접근할 수 없는 공고예요.{" "}
        <Link href="/my/jobs" style={{ color: T.accent, fontWeight: 700 }}>내 공고로 →</Link>
      </div>
    );
  }

  const chip = (on) => ({ padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${on ? T.accent : T.border}`, background: on ? T.accent : "#fff", color: on ? "#fff" : T.ink2, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" });
  const lab = { display: "block", fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 8 };
  const inp = { width: "100%", padding: "11px 13px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
  const field = { marginBottom: 20 };
  const rowS = { display: "flex", gap: 8, flexWrap: "wrap" };
  const toggle = (key, v) => setForm((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }));
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const statusBadge = (s) => (
    <Badge variant={s === "active" ? "success" : "neutral"} size="sm">
      {s === "active" ? "모집 중" : s === "closed" ? "마감" : "삭제됨"}
    </Badge>
  );

  const Row = ({ label, children }) => (
    <div style={{ display: "flex", gap: 12, padding: "11px 0", borderBottom: `1px solid ${T.border}`, fontSize: 14 }}>
      <div style={{ width: 110, flexShrink: 0, color: T.ink3, fontWeight: 600 }}>{label}</div>
      <div style={{ flex: 1, color: T.ink, minWidth: 0 }}>{children || "-"}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 24px 64px" }}>
      <Link href="/my/jobs" style={{ fontSize: 13, color: T.ink3, fontWeight: 600, textDecoration: "none" }}>← 내 공고</Link>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, marginBottom: 4 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: T.ink, letterSpacing: "-0.02em" }}>{job.title}</h1>
        {statusBadge(job.status)}
      </div>
      <div style={{ fontSize: 13, color: T.ink3, marginBottom: 20 }}>{job.job_type} · {job.address}</div>

      <div style={{ display: "flex", gap: 4, borderBottom: `2px solid ${T.border}`, marginBottom: 24 }}>
        {[["info", "공고 정보"], ["applicants", `지원자 (${applicants.length})`]].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            style={{ padding: "10px 16px", border: "none", background: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              color: tab === k ? T.accent : T.ink3, borderBottom: `2px solid ${tab === k ? T.accent : "transparent"}`, marginBottom: -2 }}>
            {l}
          </button>
        ))}
      </div>

      {tab === "info" && !editing && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
            <a href={`/jobs/${id}`} target="_blank" rel="noopener noreferrer"
              style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", color: T.ink2, fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none" }}>
              공고 페이지 보기 ↗
            </a>
            <Button variant="secondary" size="sm" onClick={startEdit}>수정</Button>
            <button type="button" onClick={onDelete}
              style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${T.accent}`, background: "#fff", color: T.accent, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              삭제
            </button>
          </div>
          <Row label="상태">{statusBadge(job.status)}</Row>
          <Row label="업종">{job.job_type}</Row>
          <Row label="근무형태">{toArr(job.work_type).join(", ")}</Row>
          <Row label="급여">{job.pay_type} {job.pay_amount ? `₩${Number(job.pay_amount).toLocaleString()}` : ""}</Row>
          <Row label="근무지">{job.address} {job.address_detail || ""}</Row>
          <Row label="근무시간">{job.work_hours}</Row>
          <Row label="근무요일">{job.work_days}</Row>
          <Row label="한국어">{KOREAN_LEVELS.find((k) => k.v === job.korean_level)?.l || job.korean_level}</Row>
          <Row label="가능 비자">{toArr(job.visa_types).join(", ")}</Row>
          <Row label="모집 인원">{job.headcount}</Row>
          <Row label="복리후생">{toArr(job.benefits).join(", ")}</Row>
          <Row label="상세 설명"><span style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{job.description}</span></Row>
          <Row label="연락처">{[formatPhoneDisplay(job.contact_mobile), formatPhoneDisplay(job.contact_phone), job.contact_email].filter(Boolean).join(" · ") || <span style={{ color: T.ink3 }}>가입 이메일로 지원 문의가 전달돼요</span>}</Row>
          {err && <div style={{ marginTop: 14, color: T.accent, fontSize: 13 }}>{err}</div>}
        </div>
      )}

      {tab === "info" && editing && (
        <div>
          <div style={field}>
            <label style={lab}>상태</label>
            <div style={rowS}>
              {[["active", "모집 중"], ["closed", "마감"]].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setF("status", v)} style={chip(form.status === v)}>{l}</button>
              ))}
            </div>
          </div>
          <div style={field}>
            <label style={lab}>업종</label>
            <div style={rowS}>{JOB_TYPES.map((o) => <button key={o} type="button" onClick={() => setF("job_type", o)} style={chip(form.job_type === o)}>{o}</button>)}</div>
          </div>
          <div style={field}>
            <label style={lab}>공고 제목</label>
            <input value={form.title} onChange={(e) => setF("title", e.target.value)} style={inp} />
          </div>
          <div style={field}>
            <label style={lab}>근무형태 <span style={{ color: T.ink3, fontWeight: 500 }}>(여러 개 가능)</span></label>
            <div style={rowS}>{WORK_TYPES.map((o) => <button key={o} type="button" onClick={() => toggle("work_type", o)} style={chip(form.work_type.includes(o))}>{o}</button>)}</div>
          </div>
          <div style={field}>
            <label style={lab}>급여</label>
            <div style={{ ...rowS, marginBottom: 8 }}>{PAY_TYPES.map((o) => <button key={o} type="button" onClick={() => setF("pay_type", o)} style={chip(form.pay_type === o)}>{o}</button>)}</div>
            <input value={form.pay_amount} onChange={(e) => setF("pay_amount", e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="금액 (숫자만)" style={inp} />
          </div>
          <div style={field}>
            <label style={lab}>근무시간</label>
            <input value={form.work_hours} onChange={(e) => setF("work_hours", e.target.value)} style={inp} />
          </div>
          <div style={field}>
            <label style={lab}>근무요일</label>
            <input value={form.work_days} onChange={(e) => setF("work_days", e.target.value)} style={inp} />
          </div>
          <div style={field}>
            <label style={lab}>한국어 수준</label>
            <div style={rowS}>{KOREAN_LEVELS.map((o) => <button key={o.v} type="button" onClick={() => setF("korean_level", o.v)} style={chip(form.korean_level === o.v)}>{o.l}</button>)}</div>
          </div>
          <div style={field}>
            <label style={lab}>지원 가능 비자 <span style={{ color: T.ink3, fontWeight: 500 }}>(여러 개 가능)</span></label>
            <div style={rowS}>{VISA_OPTIONS.filter((v) => v.v !== "private" && v.v !== "other").map((o) => <button key={o.v} type="button" onClick={() => toggle("visa_types", o.v)} style={chip(form.visa_types.includes(o.v))}>{o.v}</button>)}</div>
          </div>
          <div style={field}>
            <label style={lab}>모집 인원</label>
            <input value={form.headcount} onChange={(e) => setF("headcount", e.target.value)} style={inp} />
          </div>
          <div style={field}>
            <label style={lab}>복리후생 <span style={{ color: T.ink3, fontWeight: 500 }}>(여러 개 가능)</span></label>
            <div style={rowS}>{BENEFITS.map((o) => <button key={o} type="button" onClick={() => toggle("benefits", o)} style={chip(form.benefits.includes(o))}>{o}</button>)}</div>
          </div>
          <div style={field}>
            <label style={lab}>상세 설명</label>
            <textarea value={form.description} onChange={(e) => setF("description", e.target.value)} style={{ ...inp, minHeight: 110, resize: "vertical" }} />
          </div>
          <div style={field}>
            <label style={lab}>연락처 <span style={{ color: T.ink3, fontWeight: 500, fontSize: 12 }}>(선택)</span></label>
            <div style={{ fontSize: 12, color: T.ink3, lineHeight: 1.6, marginBottom: 8 }}>지원 문의는 기본적으로 가입하신 이메일로 전달돼요. 전화·문자로 받거나 다른 담당자 이메일로 받고 싶을 때만 입력하세요.</div>
            <input value={form.contactPhone} onChange={(e) => setF("contactPhone", formatPhoneInput(e.target.value))} placeholder="전화번호 (예: 02-123-4567)" style={inp} />
            <input value={form.contactMobile} onChange={(e) => setF("contactMobile", formatPhoneInput(e.target.value))} placeholder="휴대번호 (예: 010-1234-5678)" style={{ ...inp, marginTop: 8 }} />
            <input value={form.contactEmail} onChange={(e) => setF("contactEmail", e.target.value)} type="email" placeholder="다른 담당자 이메일 (미입력 시 가입 이메일로)" style={{ ...inp, marginTop: 8 }} />
          </div>
          <div style={{ fontSize: 12, color: T.ink3, marginBottom: 16 }}>※ 근무지 주소 변경은 곧 지원될 예정이에요.</div>
          {err && <div style={{ marginBottom: 14, color: T.accent, fontSize: 13, fontWeight: 600 }}>{err}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="primaryDark" onClick={save} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>취소</Button>
          </div>
        </div>
      )}

      {tab === "applicants" && (
        <div>
          <div style={{ fontSize: 14, color: T.ink2, marginBottom: 14 }}>총 <strong>{applicants.length}</strong>명 지원</div>
          {applicants.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: T.ink3, fontSize: 14 }}>아직 지원자가 없습니다.</div>
          ) : (
            <div>
              {applicants.map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0", borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: T.ink, fontSize: 14 }}>{a.applicant?.name || "지원자"}</div>
                    <div style={{ fontSize: 12.5, color: T.ink3, marginBottom: a.message ? 6 : 0 }}>
                      {a.applicant?.nationality || a.applicant?.country || ""}{a.applicant?.visa ? ` · ${a.applicant.visa}` : ""}
                      {a.applicant?.korean_level ? ` · 한국어 ${a.applicant.korean_level}` : ""}
                    </div>
                    {a.message ? <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5, background: T.cream, padding: "8px 10px", borderRadius: 8 }}>{a.message}</div> : null}
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {a.status === "pending" ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" onClick={() => setApplicantStatus(a.id, "accepted")}
                          style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: T.green, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>합격</button>
                        <button type="button" onClick={() => setApplicantStatus(a.id, "rejected")}
                          style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", color: T.ink2, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>불합격</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Badge variant={a.status === "accepted" ? "success" : "neutral"} size="sm">{a.status === "accepted" ? "합격" : "불합격"}</Badge>
                        <button type="button" onClick={() => setApplicantStatus(a.id, "pending")}
                          style={{ padding: "4px 8px", borderRadius: 6, border: "none", background: "none", color: T.ink3, fontSize: 12, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>되돌리기</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
