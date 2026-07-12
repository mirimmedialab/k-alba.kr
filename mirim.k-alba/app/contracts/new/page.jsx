"use client";
import { useState, useEffect, Suspense } from "react";
import { formatPhoneInput } from "@/lib/phone";
export const dynamic = "force-dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { Btn, Card } from "@/components/UI";
import {
  getCurrentUser,
  getProfile,
  getJob,
  createContract,
  getMyJobs,
  getMyApplications,
  getJobApplicants,
  supabase,
} from "@/lib/supabase";
import { buildContractFromJob } from "@/lib/contractUtils";
import { useT } from "@/lib/i18n";
import { FormPageSkel } from "@/components/Wireframe";

/**
 * /contracts/new — 근로계약서 작성 (양방향)
 *
 * 사장님(employer):  내 공고 선택 → 지원자 선택(또는 직접 입력) → 생성 (worker_signing)
 * 알바생(worker):    지원한 공고 선택 → 본인 정보 자동 입력 → 생성 (pending_approval, 사장님 승인 필요)
 *
 * 원칙은 사장님 작성. 사장님이 못 만들 경우 알바생이 만들어 사장님 허락(승인)을 받는다.
 */
function NewContractContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedJobId = searchParams.get("jobId");
  const t = useT();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isEmployer, setIsEmployer] = useState(false);
  const [jobs, setJobs] = useState([]); // employer: 내 공고 / worker: 지원한 공고
  const [selectedJobId, setSelectedJobId] = useState(preselectedJobId || null);
  const [applicants, setApplicants] = useState([]);
  const [selectedApplicantId, setSelectedApplicantId] = useState(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [workerName, setWorkerName] = useState("");
  const [workerPhone, setWorkerPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getCurrentUser().then(async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);
      const p = await getProfile(u.id);
      setProfile(p);
      const employer = u.user_metadata?.user_type === "employer";
      setIsEmployer(employer);

      if (employer) {
        const myJobs = await getMyJobs(u.id);
        setJobs(myJobs || []);
      } else {
        // 알바생: 지원한 공고 중 K-ALBA 사장님 공고(employer_id 있는 공고)만
        const apps = await getMyApplications(u.id);
        const applied = (apps || [])
          .map((a) => a.job)
          .filter((j) => j && j.employer_id && j.status !== "deleted");
        // 중복 공고 제거
        const seen = new Set();
        const uniq = applied.filter((j) => (seen.has(j.id) ? false : (seen.add(j.id), true)));
        setJobs(uniq);
        setWorkerName(p?.name || "");
        setWorkerPhone(p?.phone || "");
      }
      setReady(true);
    });
  }, [router]);

  // 사장님: 공고 선택 시 지원자 목록 로드
  useEffect(() => {
    if (!isEmployer || !selectedJobId) return;
    getJobApplicants(selectedJobId).then((list) => {
      const withProfile = (list || []).filter((a) => a.applicant);
      setApplicants(withProfile);
      setSelectedApplicantId(null);
      setManualEntry(withProfile.length === 0);
    });
  }, [isEmployer, selectedJobId]);

  const selectedJob = jobs.find((j) => String(j.id) === String(selectedJobId));
  const selectedApplicant = applicants.find((a) => String(a.applicant_id) === String(selectedApplicantId));

  const effectiveWorkerName = isEmployer
    ? (manualEntry ? workerName.trim() : selectedApplicant?.applicant?.name || "")
    : workerName.trim();

  const canSubmit = !!selectedJob && !!effectiveWorkerName && !loading;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setLoading(true);

    let contractData;
    if (isEmployer) {
      // ── 사장님 작성 (원칙) ──
      contractData = buildContractFromJob(selectedJob, profile, { createdBy: "employer" });
      if (!manualEntry && selectedApplicant) {
        contractData.worker_id = selectedApplicant.applicant_id;
        contractData.worker_name = selectedApplicant.applicant?.name || "";
        contractData.worker_phone = selectedApplicant.applicant?.phone || "";
      } else {
        contractData.worker_name = workerName.trim();
        contractData.worker_phone = workerPhone.trim();
      }
      contractData.status = "worker_signing";
    } else {
      // ── 알바생 작성 → 사장님 승인 필요 ──
      const fullJob = await getJob(selectedJob.id); // employer 프로필 join
      const employerProfile = fullJob?.employer || null;
      contractData = buildContractFromJob(fullJob || selectedJob, employerProfile, {
        createdBy: "worker",
        workerProfile: { ...profile, id: user.id },
      });
      contractData.worker_name = workerName.trim() || profile?.name || "";
      contractData.worker_phone = workerPhone.trim() || profile?.phone || "";
      // status는 buildContractFromJob에서 pending_approval로 설정됨
    }

    const { data, error } = await createContract(contractData);
    setLoading(false);

    if (!error && data) {
      // 상대방에게 자동 이메일 알림 (실패해도 진행)
      try {
        const { data: s } = await supabase.auth.getSession();
        fetch("/api/contract/notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${s?.session?.access_token || ""}`,
          },
          body: JSON.stringify({
            contract_id: data.id,
            event: isEmployer ? "sign_request" : "approval_request",
          }),
        }).catch(() => {});
      } catch (e) { /* no-op */ }
      router.push(`/contracts/${data.id}`);
    } else {
      console.error("[contracts/new] create error:", error);
      alert(t("contract.createFailed"));
    }
  };

  if (!ready) return <FormPageSkel maxWidth={600} fields={3} />;

  const stepBadge = (n) => (
    <div style={{ width: 24, height: 24, borderRadius: 6, background: T.coral, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>{n}</div>
  );

  return (
    <div style={{ padding: 20, maxWidth: 640, margin: "0 auto" }}>
      <Link href={isEmployer ? "/my/jobs" : "/my/contracts"} style={{ color: T.g500, fontSize: 14, marginBottom: 16, display: "inline-block" }}>
        ← {isEmployer ? t("nav.myJobs") : t("contract.myContracts")}
      </Link>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: T.navy, marginBottom: 4 }}>📝 {t("contract.newTitle")}</h2>
      <p style={{ color: T.g500, fontSize: 13, marginBottom: 20 }}>
        {isEmployer ? t("contract.newSubtitle") : t("contract.workerNewSubtitle")}
      </p>

      {/* Step 1: 공고 선택 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          {stepBadge(1)}
          <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>
            {isEmployer ? t("contract.step1") : t("contract.workerSelectJob")}
          </div>
        </div>
        {jobs.length === 0 ? (
          <div style={{ padding: "24px 8px", textAlign: "center", color: T.g500, fontSize: 13 }}>
            {isEmployer ? t("contract.noMyJobs") : t("contract.noAppliedJobs")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {jobs.map((j) => {
              const selected = String(j.id) === String(selectedJobId);
              return (
                <div key={j.id} onClick={() => setSelectedJobId(j.id)} style={{ padding: "12px 14px", borderRadius: 10, border: `2px solid ${selected ? T.coral : T.g200}`, background: selected ? T.coralL : "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 24 }}>{j.icon || "💼"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>{j.title}</div>
                    <div style={{ fontSize: 11, color: T.g500, marginTop: 2 }}>
                      {j.pay_type} ₩{Number(j.pay_amount).toLocaleString()} · {j.work_days}
                    </div>
                  </div>
                  {selected && <span style={{ fontSize: 18, color: T.coral }}>✓</span>}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Step 2: 근로자 정보 */}
      {selectedJob && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            {stepBadge(2)}
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>{t("contract.step2")}</div>
          </div>

          {isEmployer ? (
            <>
              {applicants.length > 0 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.g700, marginBottom: 8 }}>{t("contract.applicantSelect")}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                    {applicants.map((a) => {
                      const selected = !manualEntry && String(a.applicant_id) === String(selectedApplicantId);
                      return (
                        <div
                          key={a.id}
                          onClick={() => { setSelectedApplicantId(a.applicant_id); setManualEntry(false); }}
                          style={{ padding: "10px 14px", borderRadius: 10, border: `2px solid ${selected ? T.coral : T.g200}`, background: selected ? T.coralL : "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
                        >
                          <div style={{ fontSize: 20 }}>👤</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>{a.applicant?.name || "—"}</div>
                            <div style={{ fontSize: 11, color: T.g500, marginTop: 2 }}>
                              {a.applicant?.country || ""} {a.applicant?.visa ? `· ${a.applicant.visa}` : ""}
                            </div>
                          </div>
                          {selected && <span style={{ fontSize: 18, color: T.coral }}>✓</span>}
                        </div>
                      );
                    })}
                  </div>
                  {!manualEntry && !selectedApplicantId && (
                    <p style={{ fontSize: 12, color: T.coral, fontWeight: 700, margin: "0 0 10px" }}>{t("contract.pickApplicantHint")}</p>
                  )}
                  <button
                    onClick={() => { setManualEntry(!manualEntry); setSelectedApplicantId(null); }}
                    style={{ background: "none", border: "none", color: T.coral, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, marginBottom: manualEntry ? 12 : 0, fontFamily: "inherit" }}
                  >
                    {manualEntry ? `← ${t("contract.applicantSelect")}` : `✏️ ${t("contract.manualEntry")}`}
                  </button>
                </>
              )}
              {(manualEntry || applicants.length === 0) && (
                <>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 6 }}>{t("contract.workerName")} *</label>
                  <input value={workerName} onChange={(e) => setWorkerName(e.target.value)} placeholder="예: Linh T." style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `2px solid ${T.g200}`, fontSize: 14, fontFamily: "inherit", outline: "none", marginBottom: 12, boxSizing: "border-box" }} />
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 6 }}>{t("contract.workerPhone")}</label>
                  <input value={workerPhone} onChange={(e) => setWorkerPhone(formatPhoneInput(e.target.value))} placeholder="010-0000-0000" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `2px solid ${T.g200}`, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                  <p style={{ fontSize: 11, color: T.g500, marginTop: 8, lineHeight: 1.6 }}>{t("contract.manualEntryNote")}</p>
                </>
              )}
            </>
          ) : (
            <>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 6 }}>{t("contract.workerName")} *</label>
              <input value={workerName} onChange={(e) => setWorkerName(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `2px solid ${T.g200}`, fontSize: 14, fontFamily: "inherit", outline: "none", marginBottom: 12, boxSizing: "border-box" }} />
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 6 }}>{t("contract.workerPhone")}</label>
              <input value={workerPhone} onChange={(e) => setWorkerPhone(formatPhoneInput(e.target.value))} placeholder="010-0000-0000" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `2px solid ${T.g200}`, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </>
          )}
        </Card>
      )}

      {/* Step 3: 자동 프리필 미리보기 */}
      {selectedJob && (
        <Card style={{ marginBottom: 16, background: `linear-gradient(135deg,${T.coralL},#FFE4E0)`, border: `1.5px solid ${T.coral}40` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>✨</span>
            <div style={{ fontWeight: 700, color: T.coral, fontSize: 13 }}>{t("contract.autoFillTitle")}</div>
          </div>
          <div style={{ fontSize: 12, lineHeight: 2, color: T.g700 }}>
            ✓ {t("contract.preview.workPlace")}: <strong>{selectedJob.company_name || selectedJob.employer_external_name || selectedJob.address}</strong><br />
            ✓ {t("contract.preview.hourlyRate")}: <strong>{selectedJob.pay_type} ₩{Number(selectedJob.pay_amount).toLocaleString()}</strong><br />
            ✓ {t("wh.workHours")}: <strong>{selectedJob.work_hours || "—"}</strong><br />
            ✓ {t("contract.preview.weekDays")}: <strong>{selectedJob.work_days || "—"}</strong><br />
            ✓ {t("contract.preview.jobDesc")}: <strong>{(selectedJob.description || selectedJob.title || "").substring(0, 30)}...</strong>
          </div>
        </Card>
      )}

      {/* 알바생 작성 시 승인 안내 */}
      {!isEmployer && selectedJob && (
        <Card style={{ marginBottom: 16, background: "#FFF9E6", border: "1.5px solid #F0C420" }}>
          <div style={{ fontSize: 12, lineHeight: 1.8, color: T.g700 }}>
            ⚠️ <strong>{t("contract.workerCreateNoticeTitle")}</strong><br />
            {t("contract.workerCreateNotice")}
          </div>
        </Card>
      )}

      <Btn primary full onClick={handleCreate} disabled={!canSubmit}>
        {loading ? t("contract.creating") : isEmployer ? t("contract.createBtn") : t("contract.workerCreateBtn")}
      </Btn>
      <p style={{ textAlign: "center", fontSize: 11, color: T.g500, marginTop: 10 }}>
        {isEmployer ? t("contract.creatingNote") : t("contract.workerCreatingNote")}
      </p>
    </div>
  );
}

export default function NewContractPage() {
  return (
    <Suspense fallback={<FormPageSkel maxWidth={600} fields={3} />}>
      <NewContractContent />
    </Suspense>
  );
}
