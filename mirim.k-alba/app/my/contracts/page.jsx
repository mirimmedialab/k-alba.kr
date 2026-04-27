"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { Btn, Card } from "@/components/UI";
import { getCurrentUser, getMyContracts } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { ListPageSkel } from "@/components/Wireframe"; // ✅ 스켈레톤

const STATUS_INFO = {
  draft: { label: "초안", color: T.ink3, bg: T.cream, icon: "📝" },
  worker_signing: { label: "근로자 서명 대기", color: "#A17810", bg: "#F7F5F0", icon: "⏳" },
  employer_signing: { label: "사장님 서명 대기", color: "#A17810", bg: "#F7F5F0", icon: "⏳" },
  completed: { label: "계약 완료", color: "#2A7A4A", bg: "#E8F5EC", icon: "✓" },
};

const DEMO_CONTRACTS = [
  {
    id: "demo-sample-1",
    company_name: "블루보틀 강남점",
    worker_name: "Linh T.",
    pay_type: "시급",
    pay_amount: 12000,
    contract_start: "2026-05-01",
    contract_end: "2026-10-31",
    status: "completed",
    worker_signed: true,
    employer_signed: true,
    created_at: "2026-04-12T10:00:00Z",
  },
  {
    id: "demo-sample-2",
    company_name: "논산 OO농장",
    worker_name: "Sokha M.",
    pay_type: "일급",
    pay_amount: 150000,
    contract_start: "2026-04-20",
    contract_end: "2026-07-20",
    status: "worker_signing",
    worker_signed: false,
    employer_signed: false,
    created_at: "2026-04-13T14:30:00Z",
  },
];

// ✅ t()는 키가 없어도 키 문자열을 반환하므로 fallback이 제대로 작동하게 하는 헬퍼
function translatedOrFallback(t, key, fallback) {
  const translated = t(key);
  return translated === key ? fallback : translated;
}

export default function MyContractsPage() {
  const router = useRouter();
  const t = useT();
  const [user, setUser] = useState(null);
  const [contracts, setContracts] = useState(DEMO_CONTRACTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser().then(async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);
      const role = u.user_metadata?.user_type === "employer" ? "employer" : "worker";
      const data = await getMyContracts(u.id, role);

      let localContracts = [];
      if (typeof window !== "undefined") {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("contract-demo-")) {
            try {
              const c = JSON.parse(localStorage.getItem(key));
              localContracts.push({ ...c, id: key.replace("contract-", "") });
            } catch (e) {}
          }
        });
      }

      const combined = [...(data || []), ...localContracts];
      if (combined.length > 0) setContracts(combined);
      setLoading(false);
    });
  }, [router]);

  const isEmployer = user?.user_metadata?.user_type === "employer";

  if (loading) return <ListPageSkel maxWidth={820} showAction rows={3} />;

  const completedCount = contracts.filter(c => c.status === "completed").length;
  const pendingCount = contracts.filter(c => c.status !== "completed").length;

  return (
    <div style={{ padding: "32px 20px", maxWidth: 820, margin: "0 auto" }}>
      {/* Editorial 헤더 */}
      <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
      <div style={{
        fontSize: 11, fontWeight: 700, color: T.ink3,
        letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8,
      }}>
        Contracts · 근로계약서
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{
            fontSize: 28, fontWeight: 800, color: T.ink,
            letterSpacing: "-0.025em", marginBottom: 6, lineHeight: 1.25,
          }}>
            내 계약서 {contracts.length}건
          </h1>
          <p style={{ color: T.ink2, fontSize: 14, lineHeight: 1.6 }}>
            {completedCount > 0 && `${completedCount}건 완료`}
            {completedCount > 0 && pendingCount > 0 && " · "}
            {pendingCount > 0 && `${pendingCount}건 서명 대기`}
            {completedCount === 0 && pendingCount === 0 && "근로계약서를 안전하게 관리하세요"}
          </p>
        </div>
        {isEmployer && (
          <Link href="/contract/new" style={{ textDecoration: "none" }}>
            <button style={{
              padding: "12px 20px",
              background: T.n9,
              color: T.gold,
              border: "none",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "-0.01em",
            }}>
              + 새 계약서
            </button>
          </Link>
        )}
      </div>

      {contracts.length === 0 ? (
        <div style={{
          padding: "48px 20px",
          textAlign: "center",
          background: T.cream,
          border: `1px solid ${T.border}`,
          borderRadius: 4,
        }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.6 }}>📄</div>
          <div style={{
            fontSize: 15,
            fontWeight: 700,
            color: T.ink,
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}>
            {translatedOrFallback(t, "contract.noContracts", "아직 계약서가 없습니다")}
          </div>
          <p style={{ fontSize: 13, color: T.ink2, marginBottom: 20, lineHeight: 1.6 }}>
            {isEmployer
              ? translatedOrFallback(t, "contract.noContractsEmployer", "합격한 지원자와 계약서를 작성해 보세요")
              : translatedOrFallback(t, "contract.noContractsWorker", "합격 시 사장님이 계약서를 보내드립니다")
            }
          </p>
          {isEmployer && (
            <Link href="/contract/new" style={{
              display: "inline-block",
              padding: "12px 24px",
              background: T.n9,
              color: T.gold,
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 700,
              borderRadius: 4,
              letterSpacing: "-0.01em",
            }}>
              계약서 작성하기 →
            </Link>
          )}
        </div>
      ) : (
        <div>
          {contracts.map((c, idx) => {
            const st = STATUS_INFO[c.status] || STATUS_INFO.draft;
            const statusLabel = translatedOrFallback(t, `contract.status.${c.status}`, st.label);
            return (
              <Link key={c.id} href={`/contract/${c.id}`} style={{ textDecoration: "none" }}>
                <div
                  style={{
                    padding: "18px 0",
                    borderBottom: `1px solid ${T.border}`,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 16,
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = T.cream)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{
                    minWidth: 24,
                    fontSize: 12,
                    fontWeight: 700,
                    color: T.ink3,
                    paddingTop: 3,
                  }}>
                    {String(idx + 1).padStart(2, "0")}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                      flexWrap: "wrap",
                    }}>
                      <span style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: T.ink,
                        letterSpacing: "-0.02em",
                      }}>
                        {isEmployer ? c.worker_name : c.company_name}
                      </span>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: 2,
                        fontSize: 11,
                        fontWeight: 700,
                        background: st.bg,
                        color: st.color,
                        letterSpacing: "0.02em",
                      }}>
                        {st.icon} {statusLabel}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: T.ink2, marginBottom: 8 }}>
                      {isEmployer ? c.company_name : `사장님: ${c.employer_name || "—"}`}
                    </div>
                    <div style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}>
                      <span style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: T.accent,
                        letterSpacing: "-0.02em",
                      }}>
                        {c.pay_type} ₩{Number(c.pay_amount).toLocaleString()}
                      </span>
                      <span style={{ fontSize: 11, color: T.ink3 }}>
                        {c.contract_start} ~ {c.contract_end}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11 }}>
                      <span style={{ color: c.worker_signed ? T.green : T.ink3 }}>
                        {c.worker_signed ? "✓" : "⏳"} 근로자 서명
                      </span>
                      <span style={{ color: c.employer_signed ? T.green : T.ink3 }}>
                        {c.employer_signed ? "✓" : "⏳"} 사장님 서명
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: 16, color: T.ink3, flexShrink: 0, paddingTop: 4 }}>
                    →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
