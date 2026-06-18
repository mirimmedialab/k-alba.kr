"use client";
import { useState, useEffect, Suspense } from "react";
export const dynamic = "force-dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { Btn, Card } from "@/components/UI";
import { getCurrentUser, getProfile, getJob, createContract, getMyJobs } from "@/lib/supabase";
import { buildContractFromJob } from "@/lib/contractUtils";
import { useT } from "@/lib/i18n";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { FormPageSkel } from "@/components/Wireframe";

function NewContractContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedJobId = searchParams.get("jobId");
  const t = useT();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [myJobs, setMyJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(preselectedJobId || null);
  const [workerName, setWorkerName] = useState("");
  const [workerPhone, setWorkerPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    getCurrentUser().then(async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);
      const p = await getProfile(u.id);
      setProfile(p);
      if (u.user_metadata?.user_type !== "employer") {
        router.push("/my/contracts");
        return;
      }
      const jobs = await getMyJobs(u.id);
      if (jobs && jobs.length > 0) setMyJobs(jobs);
    });
  }, [router]);

  const selectedJob = myJobs.find((j) => String(j.id) === String(selectedJobId));

  const handleCreate = async () => {
    if (!selectedJob || !workerName.trim()) return;
    setLoading(true);
    const contractData = buildContractFromJob(selectedJob, profile);
    contractData.worker_name = workerName.trim();
    contractData.worker_phone = workerPhone.trim();
    contractData.status = "worker_signing";

    const { data, error } = await createContract(contractData);
    setLoading(false);

    if (!error && data) {
      router.push(`/contracts/${data.id}`);
    } else {
      alert("계약서 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  if (!user) return <FormPageSkel maxWidth={600} fields={3} />;

  if (isDesktop) {
    return (
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 28px 64px" }}>
        <Link href="/my/jobs" style={{ color: T.g500, fontSize: 13, marginBottom: 16, display: "inline-block" }}>← 내 공고</Link>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: T.navy, marginBottom: 4, letterSpacing: "-0.02em" }}>📝 근로계약서 작성</h2>
        <p style={{ color: T.g500, fontSize: 14, marginBottom: 28 }}>공고 정보가 자동으로 채워져 3분만에 완성!</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: T.coral, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>1</div>
              <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>공고 선택</div>
            </div>
            {myJobs.length === 0 ? (
              <div style={{ padding: "24px 8px", textAlign: "center", color: T.g500, fontSize: 13 }}>등록된 공고가 없습니다. 먼저 공고를 등록해주세요.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {myJobs.map((j) => {
                  const selected = String(j.id) === String(selectedJobId);
                  return (
                    <div key={j.id} onClick={() => setSelectedJobId(j.id)} style={{ padding: "12px 14px", borderRadius: 10, border: `2px solid ${selected ? T.coral : T.g200}`, background: selected ? T.coralL : "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 24 }}>{j.icon || "💼"}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>{j.title}</div>
                        <div style={{ fontSize: 11, color: T.g500, marginTop: 2 }}>{j.pay_type} ₩{Number(j.pay_amount).toLocaleString()} · {j.work_days}</div>
                      </div>
                      {selected && <span style={{ fontSize: 18, color: T.coral }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {selectedJob ? (
              <>
                <Card>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: T.coral, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>2</div>
                    <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>근로자 정보</div>
                  </div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 6 }}>근로자 이름 *</label>
                  <input value={workerName} onChange={(e) => setWorkerName(e.target.value)} placeholder="예: Linh T." style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `2px solid ${T.g200}`, fontSize: 14, fontFamily: "inherit", outline: "none", marginBottom: 12, boxSizing: "border-box" }} />
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 6 }}>연락처 (선택)</label>
                  <input value={workerPhone} onChange={(e) => setWorkerPhone(e.target.value)} placeholder="010-0000-0000" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `2px solid ${T.g200}`, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                </Card>
                <Card style={{ background: `linear-gradient(135deg,${T.coralL},#FFE4E0)`, border: `1.5px solid ${T.coral}40` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 18 }}>✨</span>
                    <div style={{ fontWeight: 700, color: T.coral, fontSize: 13 }}>이 정보가 자동으로 채워져요!</div>
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 2, color: T.g700 }}>
                    ✓ 업체명: <strong>{selectedJob.company_name}</strong><br />
                    ✓ 주소: <strong>{selectedJob.address}</strong><br />
                    ✓ 급여: <strong>{selectedJob.pay_type} ₩{Number(selectedJob.pay_amount).toLocaleString()}</strong><br />
                    ✓ 근무시간: <strong>{selectedJob.work_hours}</strong><br />
                    ✓ 근무요일: <strong>{selectedJob.work_days}</strong><br />
                    ✓ 업무내용: <strong>{selectedJob.description?.substring(0, 30)}...</strong>
                  </div>
                </Card>
                <div>
                  <Btn primary full onClick={handleCreate} disabled={!selectedJob || !workerName.trim() || loading}>
                    {loading ? "생성 중..." : "계약서 생성하고 챗봇 시작 →"}
                  </Btn>
                  <p style={{ textAlign: "center", fontSize: 11, color: T.g500, marginTop: 10 }}>생성 후 근로자에게 카카오톡 서명 링크가 전송됩니다</p>
                </div>
              </>
            ) : (
              <Card>
                <div style={{ padding: "32px 8px", textAlign: "center", color: T.g500, fontSize: 13 }}>왼쪽에서 공고를 먼저 선택해주세요.</div>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <Link href="/my/jobs" style={{ color: T.g500, fontSize: 14, marginBottom: 16, display: "inline-block" }}>← 내 공고</Link>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: T.navy, marginBottom: 4 }}>📝 근로계약서 작성</h2>
      <p style={{ color: T.g500, fontSize: 13, marginBottom: 20 }}>공고 정보가 자동으로 채워져 3분만에 완성!</p>

      {/* Step 1: 공고 선택 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: T.coral, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>1</div>
          <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>공고 선택</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {myJobs.map((j) => {
            const selected = String(j.id) === String(selectedJobId);
            return (
              <div
                key={j.id}
                onClick={() => setSelectedJobId(j.id)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `2px solid ${selected ? T.coral : T.g200}`,
                  background: selected ? T.coralL : "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
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
      </Card>

      {/* Step 2: 근로자 정보 */}
      {selectedJob && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: T.coral, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>2</div>
            <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>근로자 정보</div>
          </div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 6 }}>근로자 이름 *</label>
          <input
            value={workerName}
            onChange={(e) => setWorkerName(e.target.value)}
            placeholder="예: Linh T."
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `2px solid ${T.g200}`, fontSize: 14, fontFamily: "inherit", outline: "none", marginBottom: 12, boxSizing: "border-box" }}
          />
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 6 }}>연락처 (선택)</label>
          <input
            value={workerPhone}
            onChange={(e) => setWorkerPhone(e.target.value)}
            placeholder="010-0000-0000"
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `2px solid ${T.g200}`, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
          />
        </Card>
      )}

      {/* Step 3: 자동 프리필 미리보기 */}
      {selectedJob && (
        <Card style={{ marginBottom: 16, background: `linear-gradient(135deg,${T.coralL},#FFE4E0)`, border: `1.5px solid ${T.coral}40` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>✨</span>
            <div style={{ fontWeight: 700, color: T.coral, fontSize: 13 }}>이 정보가 자동으로 채워져요!</div>
          </div>
          <div style={{ fontSize: 12, lineHeight: 2, color: T.g700 }}>
            ✓ 업체명: <strong>{selectedJob.company_name}</strong><br />
            ✓ 주소: <strong>{selectedJob.address}</strong><br />
            ✓ 급여: <strong>{selectedJob.pay_type} ₩{Number(selectedJob.pay_amount).toLocaleString()}</strong><br />
            ✓ 근무시간: <strong>{selectedJob.work_hours}</strong><br />
            ✓ 근무요일: <strong>{selectedJob.work_days}</strong><br />
            ✓ 업무내용: <strong>{selectedJob.description?.substring(0, 30)}...</strong>
          </div>
        </Card>
      )}

      <Btn primary full onClick={handleCreate} disabled={!selectedJob || !workerName.trim() || loading}>
        {loading ? "생성 중..." : "계약서 생성하고 챗봇 시작 →"}
      </Btn>
      <p style={{ textAlign: "center", fontSize: 11, color: T.g500, marginTop: 10 }}>
        생성 후 근로자에게 카카오톡 서명 링크가 전송됩니다
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
