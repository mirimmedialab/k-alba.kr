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
import { FormPageSkel } from "@/components/Wireframe";

const DEMO_JOBS = [
  { id: 1, icon: "☕", title: "카페 바리스타", company_name: "블루보틀 강남점", job_type: "카페", pay_type: "시급", pay_amount: 12000, address: "서울 강남구 테헤란로 152", work_hours: "14:00~20:00", work_days: "평일 (월~금)", description: "커피 음료 제조, 매장 청소, 재고 관리" },
  { id: 2, icon: "🌾", title: "딸기 수확 작업자", company_name: "논산 OO농장", job_type: "농업", pay_type: "일급", pay_amount: 150000, address: "충남 논산시 강경읍", work_hours: "06:00~15:00", work_days: "매일", description: "딸기 수확, 선별, 포장 작업" },
  { id: 3, icon: "🍜", title: "한식당 서빙/주방보조", company_name: "이태원 정 본점", job_type: "식당", pay_type: "시급", pay_amount: 11500, address: "서울 용산구 이태원로 200", work_hours: "17:00~22:00", work_days: "주말 (토~일)", description: "서빙, 테이블 세팅, 주방 보조" },
];

function NewContractContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedJobId = searchParams.get("jobId");
  const t = useT();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [myJobs, setMyJobs] = useState(DEMO_JOBS);
  const [selectedJobId, setSelectedJobId] = useState(preselectedJobId || null);
  const [workerName, setWorkerName] = useState("");
  const [workerPhone, setWorkerPhone] = useState("");
  const [loading, setLoading] = useState(false);

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
        router.push("/my-contracts");
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
      router.push(`/contract/${data.id}`);
    } else if (error) {
      const demoId = "demo-" + Date.now();
      if (typeof window !== "undefined") {
        localStorage.setItem(`contract-${demoId}`, JSON.stringify({ ...contractData, id: demoId }));
      }
      router.push(`/contract/${demoId}`);
    }
  };

  if (!user) return <FormPageSkel maxWidth={600} fields={3} />;

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <Link href="/my-jobs" style={{ color: T.g500, fontSize: 14, marginBottom: 16, display: "inline-block" }}>← 내 공고</Link>
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
