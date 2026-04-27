"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { Btn, Card } from "@/components/UI";
import { getContract, updateContract, signContract, getCurrentUser, supabase } from "@/lib/supabase";
import { formatKoreanDate, MIN_WAGE } from "@/lib/contractUtils";
import { generateContractPDF, buildContractFilename } from "@/lib/pdfGenerator";
import { useT } from "@/lib/i18n";
import { ContractDetailSkel } from "@/components/Wireframe";
import SignaturePad from "@/components/SignaturePad";

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useT();
  const [contract, setContract] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("chatbot");
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [chatStep, setChatStep] = useState(0);
  const [signing, setSigning] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState(null);
  const scrollRef = useRef(null);

  // ─── 계약서 데이터 로드 ───
  useEffect(() => {
    getCurrentUser().then(async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);

      // DB에서 시도
      let c = await getContract(params.id);

      // 데모 모드 - localStorage에서 로드
      if (!c && typeof window !== "undefined" && String(params.id).startsWith("demo-")) {
        const stored = localStorage.getItem(`contract-${params.id}`);
        if (stored) c = JSON.parse(stored);
      }

      if (c) setContract(c);
      setLoading(false);
    });
  }, [params.id, router]);

  const userType = user?.user_metadata?.user_type || "student";
  const isEmployer = userType === "employer";
  const isWorker = !isEmployer;

  // ─── 챗봇 메시지 초기화 ───
  useEffect(() => {
    if (!contract || !user) return;

    if (isWorker && !contract.worker_signed) {
      initWorkerChat();
    } else if (isEmployer && contract.worker_signed && !contract.employer_signed) {
      initEmployerChat();
    } else if (contract.worker_signed && contract.employer_signed) {
      setMessages([
        { from: "bot", text: "🎉 계약이 완료되었습니다!" },
        { from: "bot", text: "📄 양측에 PDF가 발송되었어요.\n✅ K-ALBA 근무 기록 자동 저장 완료!" },
      ]);
    }
  }, [contract, user]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const addBot = (text, cb) => {
    setTyping(true);
    setTimeout(() => {
      setMessages((p) => [...p, { from: "bot", text }]);
      setTyping(false);
      if (cb) setTimeout(cb, 400);
    }, 700);
  };
  const addUser = (text, cb) => {
    setMessages((p) => [...p, { from: "user", text }]);
    if (cb) setTimeout(cb, 300);
  };

  const initWorkerChat = () => {
    setTyping(true);
    setTimeout(() => {
      setMessages([
        { from: "bot", text: `안녕하세요 ${contract.worker_name}님! 👋\nK-ALBA 근로계약서 도우미예요.\n\n📋 "${contract.company_name}" 공고에 대한\n근로계약서가 준비되어 있어요.` },
      ]);
      setTyping(false);
      setTimeout(() => {
        addBot("📋 근무 조건을 확인해 주세요:\n" +
          `✓ 업체: ${contract.company_name}\n` +
          `✓ 급여: ${contract.pay_type} ₩${Number(contract.pay_amount).toLocaleString()}\n` +
          `✓ 근무: ${(contract.work_days || []).join("·")} ${contract.work_start}~${contract.work_end}\n` +
          `✓ 기간: ${contract.contract_start} ~ ${contract.contract_end}\n\n` +
          "이 조건으로 계약하시겠어요?");
      }, 500);
    }, 400);
  };

  const initEmployerChat = () => {
    setTyping(true);
    setTimeout(() => {
      setMessages([
        { from: "bot", text: `${contract.worker_name}님이 서명을 완료했어요! ✅\n\n이제 사장님의 최종 서명만 남았습니다.` },
      ]);
      setTyping(false);
      setTimeout(() => {
        addBot("📄 계약서 탭에서 내용을 최종 확인 후\n아래 버튼으로 서명해 주세요.");
      }, 500);
    }, 400);
  };

  // ─── 서명 처리 (SignaturePad 모달 열기) ───
  const handleSign = (role) => {
    if (signing) return;
    setPendingRole(role);
    setSignatureModalOpen(true);
  };

  // ─── SignaturePad에서 서명 완료 시 호출 ───
  const handleSignatureComplete = async (signatureDataUrl, meta) => {
    setSignatureModalOpen(false);
    setSigning(true);
    const role = pendingRole;

    addUser(role === "worker" ? "✍️ 서명 완료" : "✍️ 사장님 서명 완료");

    // 위치 정보 수집 (선택, 타임아웃 3초)
    let location = null;
    if (navigator.geolocation) {
      try {
        location = await new Promise((resolve) => {
          const timer = setTimeout(() => resolve(null), 3000);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              clearTimeout(timer);
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
              });
            },
            () => {
              clearTimeout(timer);
              resolve(null);
            },
            { timeout: 3000, enableHighAccuracy: false }
          );
        });
      } catch (e) {
        location = null;
      }
    }

    // 데모 모드 (data-id가 'demo-'로 시작)
    if (String(params.id).startsWith("demo-") && typeof window !== "undefined") {
      const now = new Date().toISOString();
      const updated = { ...contract };
      if (role === "worker") {
        updated.worker_signed = true;
        updated.worker_signature = signatureDataUrl;
        updated.worker_sign_date = now;
        updated.worker_signature_at = now;
        updated.status = "employer_signing";
      } else {
        updated.employer_signed = true;
        updated.employer_signature = signatureDataUrl;
        updated.employer_sign_date = now;
        updated.employer_signature_at = now;
        if (updated.worker_signed) updated.status = "completed";
      }
      localStorage.setItem(`contract-${params.id}`, JSON.stringify(updated));
      setContract(updated);
      setSigning(false);

      setTimeout(() => {
        if (role === "worker") {
          addBot("✅ 근로자 서명 완료!\n📱 사장님께 카카오톡으로 알림을 보냈어요!");
        } else {
          addBot("🎉 계약 완료!\n📄 서명이 기록되었습니다.\n✅ PDF를 다운로드할 수 있습니다.");
        }
      }, 500);
      return;
    }

    // 실제 API 호출
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        alert("로그인이 만료되었습니다. 다시 로그인해 주세요.");
        setSigning(false);
        router.push("/login");
        return;
      }

      const res = await fetch("/api/contract/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          contract_id: contract.id,
          role,
          signature_png: signatureDataUrl,
          meta,
          location,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        alert(`서명 실패: ${data.error || "알 수 없는 오류"}`);
        setSigning(false);
        return;
      }

      // 계약서 다시 로드
      const fresh = await getContract(contract.id);
      if (fresh) setContract(fresh);

      setSigning(false);

      setTimeout(() => {
        if (role === "worker") {
          addBot("✅ 근로자 서명 완료!\n📱 사장님께 카카오톡으로 알림을 보냈어요!");
          if (data.audit?.ip_recorded) {
            addBot(`🔒 감사 로그 기록됨 (${data.audit.device} / ${data.audit.platform})`);
          }
        } else {
          addBot("🎉 계약 완료!\n📄 양측 서명이 모두 기록되었습니다.");
          if (data.pdf_url) {
            setTimeout(() => {
              addBot(`✅ PDF가 생성되었습니다! 아래 버튼으로 다운로드하세요.`);
            }, 800);
          }
        }
      }, 500);
    } catch (err) {
      console.error(err);
      alert("서명 처리 중 오류: " + err.message);
      setSigning(false);
    }
  };

  if (loading) return <ContractDetailSkel />;
  if (!contract) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
        <div style={{ fontWeight: 700, color: T.navy, marginBottom: 6 }}>계약서를 찾을 수 없습니다</div>
        <Link href="/my-contracts" style={{ display: "inline-block", marginTop: 16, padding: "10px 20px", background: T.coral, color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 13 }}>
          계약서 목록으로
        </Link>
      </div>
    );
  }

  const TABS = [
    { k: "chatbot", ic: "💬", label: t("contract.tab.chatbot"), desc: t("contract.tab.chatbotDesc") },
    { k: "form", ic: "📱", label: t("contract.tab.form"), desc: t("contract.tab.formDesc") },
    { k: "preview", ic: "📄", label: t("contract.tab.preview"), desc: t("contract.tab.previewDesc") },
  ];

  const canWorkerSign = isWorker && !contract.worker_signed;
  const canEmployerSign = isEmployer && contract.worker_signed && !contract.employer_signed;

  const statusInfo = {
    draft: { label: "초안", color: T.g500, bg: T.g100 },
    worker_signing: { label: "근로자 서명 대기", color: "#F59E0B", bg: "#FEF3C7" },
    employer_signing: { label: "사장님 서명 대기", color: "#F59E0B", bg: "#FEF3C7" },
    completed: { label: "계약 완료", color: "#059669", bg: T.mintL },
  };
  const st = statusInfo[contract.status] || statusInfo.draft;

  const handleDownloadPdf = async () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const filename = buildContractFilename(contract);
      await generateContractPDF("contract-preview-for-pdf", filename);
    } catch (e) {
      alert("PDF 생성 중 오류가 발생했습니다: " + e.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", minHeight: "calc(100vh - 60px)" }}>
      {/* 헤더 */}
      <div style={{ padding: "16px 20px", background: "#fff", borderBottom: `1px solid ${T.g200}` }}>
        <Link href="/my-contracts" style={{ color: T.g500, fontSize: 13 }}>← {t("contract.myContracts")}</Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: T.navy }}>📝 {t("contract.title")}</h2>
            <div style={{ fontSize: 12, color: T.g500, marginTop: 2 }}>{contract.company_name} · {contract.worker_name}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <span style={{ padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, color: st.color, background: st.bg }}>{t(`contract.status.${contract.status}`) || st.label}</span>
            {contract.worker_signed && contract.employer_signed && (
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  background: downloadingPdf ? T.g200 : T.mint,
                  color: "#fff",
                  border: "none",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: downloadingPdf ? "default" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {downloadingPdf ? "⏳ 생성 중..." : t("contract.downloadPdf")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", background: "#fff", borderBottom: `2px solid ${T.g200}` }}>
        {TABS.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            style={{
              flex: 1,
              padding: "14px 8px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 700,
              color: tab === t.k ? T.coral : T.g500,
              borderBottom: `3px solid ${tab === t.k ? T.coral : "transparent"}`,
              marginBottom: -2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 15 }}>{t.ic}</span> {t.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {tab === "chatbot" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#B2C7D9" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start", gap: 8, marginBottom: 10 }}>
                  {m.from === "bot" && (
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: "#FEE500", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🤖</div>
                  )}
                  <div style={{
                    maxWidth: "78%",
                    padding: "10px 14px",
                    borderRadius: m.from === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                    background: m.from === "user" ? "#FFEB33" : "#fff",
                    color: T.navy,
                    fontSize: 13,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {typing && (
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "#FEE500", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
                  <div style={{ background: "#fff", padding: "12px 18px", borderRadius: "4px 14px 14px 14px", display: "flex", gap: 4 }}>
                    {[0, 1, 2].map((d) => (
                      <div key={d} style={{ width: 6, height: 6, borderRadius: 3, background: T.g300, animation: `dotPulse 1s ease-in-out ${d * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* 서명 버튼 영역 */}
            {(canWorkerSign || canEmployerSign) && !typing && (
              <div style={{ padding: 14, background: "#fff", borderTop: `1px solid ${T.g200}` }}>
                <button
                  onClick={() => handleSign(canWorkerSign ? "worker" : "employer")}
                  disabled={signing}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: 12,
                    background: signing ? T.g200 : T.coral,
                    color: "#fff",
                    border: "none",
                    fontWeight: 800,
                    fontSize: 15,
                    cursor: signing ? "default" : "pointer",
                    fontFamily: "inherit",
                    boxShadow: signing ? "none" : `0 4px 16px ${T.coral}50`,
                  }}
                >
                  {signing ? t("contract.signing") : canWorkerSign ? t("contract.signWorker") : t("contract.signEmployer")}
                </button>
                <p style={{ textAlign: "center", fontSize: 10, color: T.g500, marginTop: 8 }}>
                  {t("contract.signHint")}
                </p>
              </div>
            )}

            {contract.worker_signed && contract.employer_signed && (
              <div style={{ padding: 14, background: T.mintL, borderTop: `1px solid ${T.mint}40`, textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 4 }}>🎉</div>
                <div style={{ fontWeight: 800, color: "#059669", fontSize: 14 }}>{t("contract.complete")}</div>
                <div style={{ fontSize: 11, color: T.g500, marginTop: 4 }}>{t("contract.completeDesc")}</div>

                {contract.pdf_url && (
                  <a
                    href={contract.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: 14,
                      padding: "10px 20px",
                      background: T.n9,
                      color: T.gold,
                      textDecoration: "none",
                      borderRadius: 4,
                      fontWeight: 700,
                      fontSize: 12,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    📄 서명 완료 PDF 다운로드
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "form" && <ContractForm contract={contract} />}
        {tab === "preview" && <ContractPreview contract={contract} />}
      </div>

      {/* 서명 모달 */}
      {signatureModalOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          backdropFilter: "blur(4px)",
        }}>
          <div style={{
            background: "#FFFFFF",
            borderRadius: 8,
            padding: 24,
            maxWidth: 500,
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 18,
            }}>
              <div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.ink3,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}>
                  E-Signature · 전자서명
                </div>
                <h2 style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: T.ink,
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}>
                  {pendingRole === "worker" ? "근로자 서명" : "사업주 서명"}
                </h2>
              </div>
              <button
                onClick={() => setSignatureModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 24,
                  color: T.ink3,
                  cursor: "pointer",
                  padding: 4,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              padding: 12,
              background: T.cream,
              borderRadius: 4,
              marginBottom: 16,
              fontSize: 12,
              color: T.ink2,
              lineHeight: 1.6,
            }}>
              📋 <strong>{pendingRole === "worker" ? contract.worker_name : contract.employer_name}</strong>님,
              아래에 손글씨로 서명해 주세요. 서명은 PDF 계약서에 그대로 기록됩니다.
            </div>

            <SignaturePad
              onSave={handleSignatureComplete}
              label=""
              height={220}
              minPoints={10}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 웹앱 폼 탭 ───
function ContractForm({ contract }) {
  const section = { background: "#fff", borderRadius: 14, padding: 16, border: `1px solid ${T.g200}`, marginBottom: 12 };
  const sectionTitle = { fontSize: 12, fontWeight: 800, color: T.coral, marginBottom: 10, letterSpacing: 1 };
  const row = { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.g100}`, fontSize: 13 };
  const label = { color: T.g500 };
  const val = { fontWeight: 600, color: T.navy };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 16, background: T.cream }}>
      <div style={section}>
        <div style={sectionTitle}>🏪 가게 정보</div>
        <div style={row}><span style={label}>업체명</span><span style={val}>{contract.company_name}</span></div>
        <div style={row}><span style={label}>대표자</span><span style={val}>{contract.employer_name}</span></div>
        <div style={row}><span style={label}>사업자번호</span><span style={val}>{contract.business_number || "—"}</span></div>
        <div style={row}><span style={label}>연락처</span><span style={val}>{contract.employer_phone || "—"}</span></div>
        <div style={row}><span style={label}>주소</span><span style={val}>{contract.business_address}</span></div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>👤 근로자 정보</div>
        <div style={row}><span style={label}>이름</span><span style={val}>{contract.worker_name || "—"}</span></div>
        <div style={row}><span style={label}>연락처</span><span style={val}>{contract.worker_phone || "—"}</span></div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>📋 계약 조건</div>
        <div style={row}><span style={label}>계약 형태</span><span style={val}>{contract.contract_type}</span></div>
        <div style={row}><span style={label}>계약 기간</span><span style={val}>{contract.contract_start} ~ {contract.contract_end}</span></div>
        <div style={row}><span style={label}>업무 내용</span><span style={val}>{contract.job_description}</span></div>
        <div style={row}><span style={label}>근무 요일</span><span style={val}>{(contract.work_days || []).join("·")}</span></div>
        <div style={row}><span style={label}>근무 시간</span><span style={val}>{contract.work_start} ~ {contract.work_end}</span></div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>💰 급여</div>
        <div style={row}><span style={label}>{contract.pay_type}</span><span style={{ ...val, color: T.coral, fontSize: 15 }}>₩{Number(contract.pay_amount).toLocaleString()}</span></div>
        {contract.pay_type === "시급" && (
          <>
            <div style={row}><span style={label}>월 기본급</span><span style={val}>₩{Number(contract.monthly_basic).toLocaleString()}</span></div>
            <div style={row}><span style={label}>주휴수당</span><span style={val}>₩{Number(contract.monthly_holiday).toLocaleString()}</span></div>
            <div style={{ ...row, borderBottom: "none", marginTop: 4, paddingTop: 8, borderTop: `2px solid ${T.coral}20` }}>
              <span style={{ ...label, fontWeight: 700, color: T.navy }}>월 예상 총액</span>
              <span style={{ ...val, color: T.coral, fontSize: 16 }}>₩{Number(contract.monthly_total).toLocaleString()}</span>
            </div>
          </>
        )}
        <div style={{ marginTop: 10, fontSize: 11, color: T.g500, lineHeight: 1.7 }}>
          {contract.insurance_required
            ? "✓ 4대보험 가입 대상 (주 15시간 이상)"
            : "ⓘ 주 15시간 미만 — 산재보험만 적용"}
        </div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>✍️ 서명 상태</div>
        <div style={row}>
          <span style={label}>근로자 서명</span>
          <span style={val}>{contract.worker_signed ? `✅ 완료 (${new Date(contract.worker_sign_date).toLocaleDateString("ko-KR")})` : "⏳ 대기 중"}</span>
        </div>
        <div style={row}>
          <span style={label}>사장님 서명</span>
          <span style={val}>{contract.employer_signed ? `✅ 완료 (${new Date(contract.employer_sign_date).toLocaleDateString("ko-KR")})` : "⏳ 대기 중"}</span>
        </div>
      </div>
    </div>
  );
}

// ─── 계약서 미리보기 탭 ───
// ─── 계약서 미리보기 탭 (첨부 양식 기준) ───
function ContractPreview({ contract }) {
  const contractNo = contract.id
    ? `ALBA-${new Date(contract.created_at || Date.now()).getFullYear()}-${String(contract.id).padStart(6, "0").slice(-6)}`
    : "ALBA-2026-000001";

  const isShortTime = (contract.weekly_hours || 0) < 40;
  const weeklyHours = contract.weekly_hours || 0;
  const weeklyDays = (contract.work_days || []).length;
  const dailyHours = weeklyDays > 0 ? (weeklyHours / weeklyDays).toFixed(1).replace(/\.0$/, "") : 0;

  // 퇴직금 - 계약 기간이 1년 이상이면 발생
  const contractMonths = (() => {
    if (!contract.contract_start || !contract.contract_end) return 6;
    const start = new Date(contract.contract_start);
    const end = new Date(contract.contract_end);
    return Math.round((end - start) / (1000 * 60 * 60 * 24 * 30));
  })();
  const severanceApplies = contractMonths >= 12;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#EDEDEA" }}>
      <div
        id="contract-preview-for-pdf"
        style={{
          background: "#fff",
          padding: "36px 32px 32px",
          borderRadius: 4,
          maxWidth: 700,
          margin: "0 auto",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          fontFamily: "'Noto Sans KR', sans-serif",
          color: "#111",
        }}
      >
        {/* 제목 */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111", letterSpacing: 4, marginBottom: 10 }}>
            근 로 계 약 서
          </h1>
          <div style={{ fontSize: 11, color: "#555", lineHeight: 1.8 }}>
            계약번호 : {contractNo} &nbsp;|&nbsp; 계약일자 : {formatKoreanDate(contract.created_at?.split("T")[0] || new Date().toISOString().split("T")[0])} &nbsp;|&nbsp; 법률검토 : 법무법인 수성 김익환 변호사
          </div>
        </div>

        {/* 제1조 당사자 */}
        <ArticleTable title="제1조 당사자">
          <tr>
            <td style={cellLabel}>사 업 주</td>
            <td style={cellValue}>
              <strong>{contract.employer_name || "—"} | {contract.company_name || "—"}</strong>
              <br />
              <span style={{ fontSize: 10, color: "#555" }}>사업자번호 : {contract.business_number || "—"}</span>
            </td>
            <td style={cellLabel}>근 로 자</td>
            <td style={cellValue}>
              <strong>{contract.worker_name || "—"}</strong>
            </td>
          </tr>
          <tr>
            <td style={cellLabel}>사업장주소</td>
            <td style={cellValue}>{contract.business_address || "—"}{contract.address_detail ? ` ${contract.address_detail}` : ""}</td>
            <td style={cellLabel}>생년월일</td>
            <td style={cellValue}>{contract.worker_birth || "_____년 __월 __일"}</td>
          </tr>
        </ArticleTable>

        {/* 제2조 계약 형태 */}
        <ArticleTable title="제2조 계약 형태">
          <tr>
            <td style={cellLabel}>계약 유형</td>
            <td style={{ ...cellValue, ...cellValueSpan3 }} colSpan={3}>
              <strong>{contract.contract_type || "기간제 근로계약"}</strong> {isShortTime && "(단시간 근로자)"}
            </td>
          </tr>
          <tr>
            <td style={cellLabel}>근무 기간</td>
            <td style={{ ...cellValue, ...cellValueSpan3 }} colSpan={3}>
              {contract.contract_start || "—"} ~ {contract.contract_end || "—"} ({contractMonths}개월)
            </td>
          </tr>
          <tr>
            <td style={cellLabel}>전환 규정</td>
            <td style={{ ...cellValue, ...cellValueSpan3 }} colSpan={3}>
              2년 초과 사용 시 <strong>기간의 정함이 없는 근로계약을 체결한 근로자로 봅니다.</strong> (기간제법 제4조②)
            </td>
          </tr>
        </ArticleTable>

        {/* 제3조 근무 조건 */}
        <ArticleTable title="제3조 근무 조건">
          <tr>
            <td style={cellLabel}>근무 요일</td>
            <td style={cellValue}>
              {(contract.work_days || []).map(d => d + "요일").join(", ")} (주 {weeklyDays}일)
            </td>
            <td style={cellLabel}>근무 시간</td>
            <td style={cellValue}>
              {contract.work_start} ~ {contract.work_end} (일 {dailyHours}시간 · 주 {weeklyHours}시간)
            </td>
          </tr>
          <tr>
            <td style={cellLabel}>휴게 시간</td>
            <td style={cellValue}>4시간당 30분 (근무 중 자유 사용)</td>
            <td style={cellLabel}>근무 장소</td>
            <td style={cellValue}>{contract.company_name || "—"} (사업장 내)</td>
          </tr>
          <tr>
            <td style={cellLabel}>업무 내용</td>
            <td style={{ ...cellValue, ...cellValueSpan3 }} colSpan={3}>
              {contract.job_description || "—"}
            </td>
          </tr>
        </ArticleTable>

        {/* 제4조 임금 */}
        <ArticleTable title="제4조 임금">
          <tr>
            <td style={cellLabel}>{contract.pay_type || "시급"}</td>
            <td style={{ ...cellValue, ...cellValueSpan3 }} colSpan={3}>
              <strong style={{ color: "#E02020", fontSize: 15 }}>{Number(contract.pay_amount || 0).toLocaleString()}원</strong>
              &nbsp;&nbsp;
              {contract.pay_amount >= MIN_WAGE ? (
                <span style={{ color: "#00A86B", fontSize: 11, fontWeight: 600 }}>✓ 2026년 최저시급({MIN_WAGE.toLocaleString()}원) {contract.pay_type === "시급" ? "초과" : "충족"}</span>
              ) : (
                <span style={{ color: "#E02020", fontSize: 11, fontWeight: 600 }}>⚠ 최저시급 미만</span>
              )}
            </td>
          </tr>
          <tr>
            <td style={cellLabel}>지급일·방법</td>
            <td style={{ ...cellValue, ...cellValueSpan3 }} colSpan={3}>
              매월 말일 &nbsp;|&nbsp; 근로자 명의 계좌 이체
            </td>
          </tr>
        </ArticleTable>

        {/* 급여 계산 내역 테이블 */}
        {contract.pay_type === "시급" && (
          <div style={{ marginBottom: 18 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={headCell}>항 목</th>
                  <th style={headCell}>산 정 내 역</th>
                  <th style={{ ...headCell, width: 120 }}>금 액</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={bodyCell}>기 본 급</td>
                  <td style={bodyCell}>
                    {Number(contract.pay_amount).toLocaleString()}원 × {dailyHours}시간/일 × {weeklyDays}일/주 × 4.345주/월
                  </td>
                  <td style={{ ...bodyCell, textAlign: "right" }}>
                    {Number(contract.monthly_basic || 0).toLocaleString()}원/월
                  </td>
                </tr>
                {weeklyHours >= 15 && (
                  <tr>
                    <td style={bodyCell}>주 휴 수 당</td>
                    <td style={bodyCell}>
                      1일 소정근로시간({dailyHours}시간) × 시급({Number(contract.pay_amount).toLocaleString()}원) × 4.345주/월
                    </td>
                    <td style={{ ...bodyCell, textAlign: "right" }}>
                      {Number(contract.monthly_holiday || 0).toLocaleString()}원/월
                    </td>
                  </tr>
                )}
                <tr style={{ background: "#FFFDE7" }}>
                  <td style={{ ...bodyCell, fontWeight: 700 }}>예상 월 급여</td>
                  <td style={{ ...bodyCell, fontWeight: 700 }}>기본급 + 주휴수당 합계</td>
                  <td style={{ ...bodyCell, textAlign: "right", fontWeight: 900, color: "#E02020" }}>
                    약 {Number(contract.monthly_total || 0).toLocaleString()}원
                  </td>
                </tr>
              </tbody>
            </table>
            <p style={{ fontSize: 10, color: "#777", marginTop: 6, fontStyle: "italic" }}>
              ※ 예상 월급여는 4.345주 기준 추정값이며, 실제 지급액은 근무일수에 따라 달라질 수 있습니다.
            </p>
          </div>
        )}

        {/* 제5조 휴일·휴가 및 사회보험 */}
        <ArticleTable title="제5조 휴일·휴가 및 사회보험">
          <tr>
            <td style={cellLabel}>주 휴 일</td>
            <td style={cellValue}>
              {weeklyHours >= 15 ? "주 15시간 이상 근무 시 1일 유급 주휴일 보장" : "주 15시간 미만 — 주휴일 미발생"}
            </td>
            <td style={cellLabel}>연차 휴가</td>
            <td style={cellValue}>
              {contractMonths < 12 ? "1개월 개근 시 1일 발생 (1년 미만 근무)" : "연 15일 이상 발생 (근로기준법 제60조)"}
            </td>
          </tr>
          <tr>
            <td style={cellLabel}>고용보험</td>
            <td style={cellValue}>
              {weeklyHours >= 15 ? "✓ 가입 대상 (주 15시간 이상)" : "주 15시간 미만 — 가입 대상 아님"}
            </td>
            <td style={cellLabel}>산재보험</td>
            <td style={cellValue}>✓ 자동 가입 (모든 근로자)</td>
          </tr>
          <tr>
            <td style={cellLabel}>국민연금</td>
            <td style={cellValue}>
              {contract.insurance_required ? `✓ 가입 대상 (월 약 ${Math.round(weeklyHours * 4.345)}시간 근무, 60시간 초과)` : "월 60시간 미만 — 가입 대상 아님"}
            </td>
            <td style={cellLabel}>건강보험</td>
            <td style={cellValue}>
              {contract.insurance_required ? `✓ 가입 대상 (월 약 ${Math.round(weeklyHours * 4.345)}시간 근무, 60시간 초과)` : "월 60시간 미만 — 가입 대상 아님"}
            </td>
          </tr>
        </ArticleTable>

        {/* 제6조 퇴직금 */}
        <ArticleTable title="제6조 퇴직금">
          <tr>
            <td style={cellLabel}>퇴 직 금</td>
            <td style={{ ...cellValue, ...cellValueSpan3 }} colSpan={3}>
              {severanceApplies
                ? `본 계약 기간(${contractMonths}개월) 종료 시 퇴직금 발생 (계속근로 1년 이상)`
                : `본 계약 기간(${contractMonths}개월) 종료 시 퇴직금 미발생 (계속근로 1년 미만)`}
            </td>
          </tr>
          <tr>
            <td style={cellLabel}>반복갱신 시</td>
            <td style={{ ...cellValue, ...cellValueSpan3 }} colSpan={3}>
              계약 반복갱신으로 계속근로기간이 <strong>1년을 초과하면 퇴직금이 발생합니다.</strong> (근로자퇴직급여보장법 제4조)
            </td>
          </tr>
        </ArticleTable>

        {/* 제7조 계약 해지 및 기타 */}
        <ArticleTable title="제7조 계약 해지 및 기타">
          <tr>
            <td style={cellLabel}>계약 만료</td>
            <td style={cellValue}>기간 종료 시 자동 해지. 계속 근로 시 재계약 체결 필요.</td>
            <td style={cellLabel}>해 고</td>
            <td style={cellValue}>정당한 이유 없는 해고 금지. 30일 전 서면 통보 또는 해고예고수당 지급.</td>
          </tr>
          <tr>
            <td style={cellLabel}>분쟁 해결</td>
            <td style={cellValue}>관할 노동위원회 및 법원</td>
            <td style={cellLabel}>준 거 법</td>
            <td style={cellValue}>대한민국 근로기준법 및 관련 법령</td>
          </tr>
        </ArticleTable>

        {/* 서명 */}
        <div style={{ marginTop: 28 }}>
          <div
            style={{
              background: "#1A1A2E",
              color: "#fff",
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 2,
              marginBottom: 0,
            }}
          >
            서 명 Signatures
          </div>

          <div style={{ border: "1px solid #1A1A2E", borderTop: "none", padding: "14px 16px" }}>
            <p style={{ fontSize: 12, color: "#333", marginBottom: 14 }}>
              본 계약서의 내용을 충분히 확인하고 동의하여 아래와 같이 서명합니다.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <SignatureBlock
                icon="👩‍💼"
                role="근로자 (Worker)"
                name={contract.worker_name}
                signed={contract.worker_signed}
                date={contract.worker_sign_date}
              />
              <SignatureBlock
                icon="🧑‍💼"
                role="사업주 (Employer)"
                name={contract.employer_name}
                signed={contract.employer_signed}
                date={contract.employer_sign_date}
              />
            </div>

            {/* 법률 검토 완료 배너 */}
            <div
              style={{
                marginTop: 18,
                padding: "12px 16px",
                background: "#FFFDE7",
                border: "1px solid #F9D71C",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ fontSize: 24 }}>⚖️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#111", marginBottom: 2 }}>
                  법률 검토 완료
                </div>
                <div style={{ fontSize: 11, color: "#555" }}>
                  본 계약서는 <strong>법무법인 수성 김익환 변호사</strong>님이 검토하셨습니다.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* K-ALBA 푸터 */}
        <div style={{ marginTop: 20, paddingTop: 12, borderTop: "1px dashed #AAA", textAlign: "center", fontSize: 10, color: "#777", lineHeight: 1.7 }}>
          본 근로계약서는 <strong>K-ALBA</strong>를 통해 자동 생성되었습니다.<br />
          미림미디어랩 주식회사 | k-alba.kr
        </div>
      </div>
    </div>
  );
}

// ─── 계약서 양식 서브 컴포넌트 ───
const articleTitleStyle = {
  background: "#1A1A2E",
  color: "#fff",
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: 1,
};

const cellLabel = {
  background: "#F5F3F0",
  color: "#111",
  padding: "9px 12px",
  fontSize: 11,
  fontWeight: 700,
  border: "1px solid #DDD",
  width: "15%",
  verticalAlign: "middle",
};

const cellValue = {
  padding: "9px 12px",
  fontSize: 11,
  color: "#111",
  border: "1px solid #DDD",
  width: "35%",
  lineHeight: 1.6,
  verticalAlign: "middle",
};

const cellValueSpan3 = { width: "85%" };

const headCell = {
  background: "#1A1A2E",
  color: "#fff",
  padding: "8px 12px",
  fontSize: 11,
  fontWeight: 700,
  border: "1px solid #1A1A2E",
  textAlign: "center",
};

const bodyCell = {
  padding: "8px 12px",
  fontSize: 11,
  color: "#111",
  border: "1px solid #DDD",
  lineHeight: 1.5,
};

function ArticleTable({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={articleTitleStyle}>{title}</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function SignatureBlock({ icon, role, name, signed, date }) {
  const signDate = signed && date
    ? (() => {
        const d = new Date(date);
        return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
      })()
    : "____년 ____월 ____일";

  return (
    <div
      style={{
        border: `2px ${signed ? "solid #00A86B" : "dashed #AAA"}`,
        borderRadius: 4,
        padding: "14px 12px",
        background: signed ? "#E8F5E9" : "#FAFAF8",
        minHeight: 150,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#111" }}>{role}</span>
      </div>

      <div style={{ textAlign: "center", padding: "12px 0", marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>( 서 명 )</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#111", letterSpacing: 4, marginBottom: 10 }}>
          {name || "—"}
        </div>
        {signed && <div style={{ fontSize: 28 }}>✍️</div>}
      </div>

      <div style={{ textAlign: "center", fontSize: 11, color: "#555", paddingTop: 8, borderTop: "1px dashed #DDD" }}>
        {signDate}
      </div>
    </div>
  );
}

// ─── (레거시 - 다른 페이지에서 호출 시 대비) ───
function Section({ num, title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: T.coral, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{num}</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.navy }}>제{num}조. {title}</div>
      </div>
      <div style={{ paddingLeft: 36 }}>{children}</div>
    </div>
  );
}

function Table({ rows }) {
  return (
    <div style={{ border: `1px solid ${T.g200}`, borderRadius: 8, overflow: "hidden" }}>
      {rows.map(([k, v, highlight], i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr",
            borderBottom: i < rows.length - 1 ? `1px solid ${T.g200}` : "none",
            fontSize: 12,
          }}
        >
          <div style={{ padding: "9px 12px", background: T.g100, color: T.g500, fontWeight: 600, borderRight: `1px solid ${T.g200}` }}>{k}</div>
          <div style={{ padding: "9px 12px", color: highlight ? T.coral : T.navy, fontWeight: highlight ? 700 : 500 }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

function SignBlock({ role, name, signed, date }) {
  return (
    <div style={{
      border: `2px ${signed ? "solid " + T.mint : "dashed " + T.g300}`,
      borderRadius: 12,
      padding: "16px 12px",
      background: signed ? T.mintL : "#fff",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.g500, marginBottom: 6 }}>{role}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: T.navy, marginBottom: 8, letterSpacing: 3 }}>
        {name || "—"}
      </div>
      <div style={{ fontSize: 24, marginBottom: 6 }}>
        {signed ? "✍️" : "⏳"}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: signed ? "#059669" : T.g500 }}>
        {signed ? "서명 완료" : "서명 대기"}
      </div>
      {signed && date && (
        <div style={{ fontSize: 9, color: T.g500, marginTop: 4 }}>
          {new Date(date).toLocaleDateString("ko-KR")}
        </div>
      )}
    </div>
  );
}
