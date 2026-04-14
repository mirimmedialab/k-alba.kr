"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { Btn, Card } from "@/components/UI";
import { getCurrentUser, getMyContracts } from "@/lib/supabase";
import { useT } from "@/lib/i18n";

const STATUS_INFO = {
  draft: { label: "초안", color: T.g500, bg: T.g100, icon: "📝" },
  worker_signing: { label: "근로자 서명 대기", color: "#F59E0B", bg: "#FEF3C7", icon: "⏳" },
  employer_signing: { label: "사장님 서명 대기", color: "#F59E0B", bg: "#FEF3C7", icon: "⏳" },
  completed: { label: "계약 완료", color: "#059669", bg: T.mintL, icon: "✅" },
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

      // 로컬 스토리지의 데모 계약서도 추가
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
      if (combined.length > 0) {
        setContracts(combined);
      }
      setLoading(false);
    });
  }, [router]);

  const isEmployer = user?.user_metadata?.user_type === "employer";

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>로딩 중...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: T.navy, marginBottom: 4 }}>📝 {t("contract.myContracts")}</h2>
          <p style={{ color: T.g500, fontSize: 13 }}>{t("contract.myContracts")} ({contracts.length})</p>
        </div>
        {isEmployer && (
          <Link href="/contract/new">
            <Btn primary>{t("contract.newContract")}</Btn>
          </Link>
        )}
      </div>

      {contracts.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
          <div style={{ fontWeight: 700, color: T.navy, marginBottom: 6 }}>{t("contract.noContracts")}</div>
          <p style={{ fontSize: 13, color: T.g500, marginBottom: 16 }}>
            {isEmployer ? t("contract.noContractsEmployer") : t("contract.noContractsWorker")}
          </p>
          {isEmployer && (
            <Link href="/contract/new">
              <Btn primary>{t("contract.writeContract")}</Btn>
            </Link>
          )}
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {contracts.map((c) => {
            const st = STATUS_INFO[c.status] || STATUS_INFO.draft;
            return (
              <Link key={c.id} href={`/contract/${c.id}`} style={{ textDecoration: "none" }}>
                <Card>
                  <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>
                        {isEmployer ? c.worker_name : c.company_name}
                      </div>
                      <div style={{ fontSize: 12, color: T.g500, marginTop: 2 }}>
                        {isEmployer ? c.company_name : `사장님: ${c.employer_name || "—"}`}
                      </div>
                    </div>
                    <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, flexShrink: 0 }}>
                      {st.icon} {t(`contract.status.${c.status}`) || st.label}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: `1px solid ${T.g100}` }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.coral }}>
                      {c.pay_type} ₩{Number(c.pay_amount).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, color: T.g500 }}>
                      {c.contract_start} ~ {c.contract_end}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 10, fontSize: 11 }}>
                    <span style={{ color: c.worker_signed ? "#059669" : T.g500 }}>
                      {c.worker_signed ? "✅" : "⏳"} 근로자 서명
                    </span>
                    <span style={{ color: c.employer_signed ? "#059669" : T.g500 }}>
                      {c.employer_signed ? "✅" : "⏳"} 사장님 서명
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
