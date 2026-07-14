"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { getContract, updateContract, signContract, getCurrentUser, supabase } from "@/lib/supabase";
import { formatKoreanDate, MIN_WAGE } from "@/lib/contractUtils";
import { generateContractPDF, buildContractFilename } from "@/lib/pdfGenerator";
import { shareContractKakao } from "@/lib/kakaoShare";
import { useT } from "@/lib/i18n";
import { ContractDetailSkel } from "@/components/Wireframe";
import SignaturePad from "@/components/SignaturePad";
import { Button, Badge, Empty, KIcon, ButtonLoading } from "@/components/ui";

/**
 * /contracts/[id] 근로계약서 상세 (BI v2)
 *
 * 페르소나 (BI v2 Section 6 — 양측 페르소나):
 *   - 사장님(employer) + 알바생(worker) 양측이 동일 페이지에서 서명
 *   - 무드: 법적 신뢰 — 변호사 검토 + 사업자번호 노출
 *
 * 변경점 (BI v2):
 *   - Btn, Card (UI.jsx) → Button, Empty (Step 3-A/C)
 *   - 챗봇 K 박스 (🤖) → <KIcon variant="kakao"> ⭐ BI v2 결정 (🤖 미사용)
 *   - statusInfo 인라인 → <Badge> 시맨틱
 *     · draft → neutral
 *     · worker_signing/employer_signing → warning
 *     · completed → success
 *   - 서명 버튼 페르소나 분기:
 *     · worker 서명 시 → variant="primary" (활기 코랄)
 *     · employer 서명 시 → variant="primaryDark" (차분 코랄)
 *   - 계약서 없음 → <Empty variant="error">
 *   - T.g500/g700/g100/g200/g300 → T.ink3/ink2/border/borderStrong
 *
 * 보존 (100%):
 *   - 3개 탭 (챗봇/폼/미리보기)
 *   - 양측 서명 흐름 (worker → employer)
 *   - PDF 미리보기 (인쇄 양식 표준 — 컬러 변경 금지)
 *     · #1A1A2E 다크 헤더, #F5F3F0 셀, 검정 텍스트
 *   - 카카오톡 챗봇 디자인 (B2C7D9 배경, FEE500 K 박스, 말풍선)
 *   - 법무법인 수성 김익환 변호사 검토 정보
 *   - 사업자번호 노출 (BI v2 신뢰감)
 *   - SignaturePad 모달 + GPS 위치 기록
 *   - 데모 모드 (localStorage) + 실제 API 모드
 *   - 다국어 (useT)
 */
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
  const [approving, setApproving] = useState(false);
  const [sharing, setSharing] = useState(false);
  // 계약 조건 수정 (챗봇 대화형)
  const [editing, setEditing] = useState(false);
  const [editStep, setEditStep] = useState(0); // 1:급여 2:요일 3:시간 4:기간 5:확인
  const [editData, setEditData] = useState(null);
  const [chatInput, setChatInput] = useState("");
  // 챗봇 흐름: 조건 확인 → 계약서 보기 → 서명
  const [termsConfirmed, setTermsConfirmed] = useState(false);
  // 유학생 시간제취업 확인서 정보 수집 Q&A
  const [confAsk, setConfAsk] = useState(null); // { queue: [...], idx, data: {} }
  const [downloadingConf, setDownloadingConf] = useState(false);
  const scrollRef = useRef(null);

  // 시간 표시 정규화: "14:00:00" → "14:00"
  const normTime = (t) => (typeof t === "string" && t.length >= 5 ? t.slice(0, 5) : t);
  const normalizeContract = (c) =>
    c ? { ...c, work_start: normTime(c.work_start), work_end: normTime(c.work_end) } : c;

  // ─── 계약서 데이터 로드 ───
  useEffect(() => {
    getCurrentUser().then(async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);

      let c = await getContract(params.id);

      // 데모 모드
      if (!c && typeof window !== "undefined" && String(params.id).startsWith("demo-")) {
        const stored = localStorage.getItem(`contract-${params.id}`);
        if (stored) c = JSON.parse(stored);
      }

      if (c) setContract(normalizeContract(c));
      setLoading(false);
    });
  }, [params.id, router]);

  const userType = user?.user_metadata?.user_type || "worker";
  const isEmployer = userType === "employer";
  const isWorker = !isEmployer;

  // ─── 챗봇 메시지 초기화 ───
  useEffect(() => {
    if (!contract || !user) return;

    if (contract.status === "pending_approval") {
      if (isEmployer) initApprovalChat();
      else initWaitApprovalChat();
    } else if (contract.status === "rejected") {
      setMessages([
        { from: "bot", text: `❌ 사장님이 계약서를 거절했습니다.${contract.reject_reason ? `\n\n사유: ${contract.reject_reason}` : ""}` },
        { from: "bot", text: "조건을 확인한 뒤 새 계약서를 다시 작성하거나, 사장님과 직접 상의해 보세요." },
      ]);
    } else if (isWorker && !contract.worker_signed) {
      initWorkerChat();
    } else if (isEmployer && contract.worker_signed && !contract.employer_signed) {
      initEmployerChat();
    } else if (isEmployer && !contract.worker_signed) {
      // 사장님: 조건 확인 → 계약서 보기 → 근로자 서명 요청 흐름
      setMessages([
        { from: "bot", text: `📝 ${contract.worker_name || "근로자"}님과의\n근로계약서가 준비되었습니다!` },
        { from: "bot", text: buildTermsText(contract) },
        { from: "bot", text: buildBreakGuide(contract) },
        { from: "bot", text: "혹시 수정할 내용이 있나요?\n없으면 '수정 없음'을 눌러 진행해 주세요." },
      ]);
    } else if (isWorker && contract.worker_signed && !contract.employer_signed) {
      // 알바생 서명 완료 → 사장님 최종 서명 대기 중
      setMessages([
        { from: "bot", text: "✅ 서명이 완료되었어요!\n\n이제 사장님의 최종 서명을 기다리고 있습니다. ⏳" },
        { from: "bot", text: buildTermsText(contract) },
        { from: "bot", text: "💬 상단의 공유 버튼으로 사장님께\n카카오톡 알림을 보낼 수도 있어요.\n\n사장님 서명이 끝나면 PDF를 다운로드할 수 있습니다." },
      ]);
    } else if (contract.worker_signed && contract.employer_signed) {
      setMessages([
        { from: "bot", text: "🎉 계약이 완료되었습니다!" },
        { from: "bot", text: buildTermsText(contract) },
        { from: "bot", text: "📄 아래 버튼으로 근로계약서 PDF를 다운로드하세요.\n✅ K-ALBA 근무 기록 자동 저장 완료!" },
      ]);
      // 유학생이면 시간제취업 확인서 자동 생성 흐름
      const si = getStudentInfo(contract);
      if (si.isStudent) {
        if (isWorker && si.missingWorker.length > 0) {
          setTimeout(() => startConfAsk(si.missingWorker), 900);
        } else if (isEmployer && si.missingEmployer.length > 0) {
          setTimeout(() => startConfAsk(si.missingEmployer), 900);
        } else if (si.missingWorker.length === 0 && si.missingEmployer.length === 0) {
          setTimeout(() => addBot("🎓 외국인 유학생 시간제취업 확인서도 준비되었습니다!\n아래 버튼으로 다운로드하세요.\n\n(유학생담당자 확인란은 학교 국제처에서\n서명을 받으시면 됩니다)"), 900);
        } else {
          setTimeout(() => addBot("🎓 유학생 시간제취업 확인서에 필요한 정보를\n상대방이 입력하는 중이에요.\n입력이 끝나면 확인서를 다운로드할 수 있습니다."), 900);
        }
      }
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

  // 일 근로시간 계산 (휴게시간 안내용)
  const calcDailyHours = (c) => {
    if (!c?.work_start || !c?.work_end) return 0;
    const [sh, sm] = c.work_start.split(":").map(Number);
    const [eh, em] = c.work_end.split(":").map(Number);
    let h = eh + em / 60 - (sh + sm / 60);
    if (h <= 0) h += 24;
    return h;
  };

  // 사장님 안내: 법정 휴게시간 (근로기준법 제54조)
  const buildBreakGuide = (c) => {
    const dailyH = calcDailyHours(c);
    const hTxt = (Math.round(dailyH * 10) / 10).toString().replace(/\.0$/, "");
    const need = dailyH >= 8 ? "1시간 이상" : dailyH >= 4 ? "30분 이상" : null;
    let tail;
    if (need) {
      tail = `이 계약은 일 ${hTxt}시간 근무라\n휴게시간 ${need}을 근무 도중에\n주셔야 합니다. (위반 시 처벌 대상)`;
    } else {
      tail = `이 계약은 일 ${hTxt}시간 근무로\n법정 휴게 의무는 없지만,\n적절한 휴식 부여를 권장해요.`;
    }
    return "☕ 사장님, 휴게시간을 꼭 챙겨주세요!\n\n근로기준법 제54조:\n· 근로 4시간 → 휴게 30분 이상\n· 근로 8시간 → 휴게 1시간 이상\n(근무시간 도중에 부여, 무급 가능)\n\n" + tail;
  };

  // ─── 주요 근로계약 내용 요약 (챗봇 메시지용) ───
  const buildTermsText = (c) => {
    const lines = [
      "📋 주요 근로계약 내용",
      `🏪 업체: ${c.company_name || "—"} (${c.employer_name || "—"})`,
      `👤 근로자: ${c.worker_name || "—"}`,
      `💰 급여: ${c.pay_type || "시급"} ₩${Number(c.pay_amount || 0).toLocaleString()}`,
    ];
    if ((c.pay_type || "시급") === "시급" && c.monthly_total) {
      lines.push(`   └ 예상 월급여 약 ₩${Number(c.monthly_total).toLocaleString()} (주휴수당 포함)`);
    }
    lines.push(`📅 근무: ${(c.work_days || []).join("·")} ${c.work_start || ""}~${c.work_end || ""}${c.weekly_hours ? ` (주 ${c.weekly_hours}시간)` : ""}`);
    const bh = calcDailyHours(c);
    lines.push(`☕ 휴게시간: ${bh >= 8 ? "1시간 이상" : bh >= 4 ? "30분 이상" : "권장"} (근무 중 부여)`);
    lines.push(`🗓 기간: ${c.contract_start || "—"} ~ ${c.contract_end || "—"}`);
    if (c.job_description) lines.push(`💼 업무: ${String(c.job_description).substring(0, 40)}`);
    if (c.business_address) lines.push(`📍 장소: ${c.business_address}`);
    return lines.join("\n");
  };

  const initWorkerChat = () => {
    setTyping(true);
    setTimeout(() => {
      setMessages([
        { from: "bot", text: `안녕하세요 ${contract.worker_name}님! 👋\nK-ALBA 근로계약서 도우미예요.\n\n📋 "${contract.company_name}" 공고에 대한\n근로계약서가 준비되어 있어요.` },
      ]);
      setTyping(false);
      setTimeout(() => {
        addBot(buildTermsText(contract) + "\n\n이 조건으로 계약하시겠어요?");
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
        addBot(buildTermsText(contract) + "\n\n📄 '계약서 보기'로 최종 확인 후\n아래 버튼으로 서명해 주세요.");
      }, 500);
    }, 400);
  };

  // ─── 승인 대기 챗봇 (알바생 작성 → 사장님 검토) ───
  const initApprovalChat = () => {
    setTyping(true);
    setTimeout(() => {
      setMessages([
        { from: "bot", text: `📮 ${contract.worker_name}님(알바생)이 작성한\n근로계약서가 도착했어요!\n\n내용을 확인하고 승인해 주세요.` },
      ]);
      setTyping(false);
      setTimeout(() => {
        addBot(buildTermsText(contract) + "\n\n승인하면 서명 단계로 진행됩니다.\n조건이 다르면 거절 후 사유를 남겨주세요.", () => {
          addBot(buildBreakGuide(contract));
        });
      }, 500);
    }, 400);
  };

  const initWaitApprovalChat = () => {
    setTyping(true);
    setTimeout(() => {
      setMessages([
        { from: "bot", text: `${contract.worker_name}님이 작성한 계약서가\n사장님 승인을 기다리고 있어요. ⏳` },
        { from: "bot", text: buildTermsText(contract) },
      ]);
      setTyping(false);
      setTimeout(() => {
        addBot("💬 아래 버튼으로 사장님께 카카오톡으로\n계약서 링크를 보내 확인을 요청해 보세요!\n\n사장님이 승인하면 서명을 시작할 수 있어요.");
      }, 500);
    }, 400);
  };

  // ─── 사장님 승인/거절 (알바생 작성 계약서) ───
  const handleApprove = async () => {
    if (approving) return;
    setApproving(true);
    const { error } = await updateContract(contract.id, {
      status: "worker_signing",
      employer_approved_at: new Date().toISOString(),
    });
    setApproving(false);
    if (error) {
      alert("승인 처리 중 오류가 발생했습니다: " + error.message);
      return;
    }
    const fresh = await getContract(contract.id);
    if (fresh) setContract(normalizeContract(fresh));
    addBot("✅ 계약서를 승인했습니다!\n근로자에게 서명 요청이 전달됩니다.");
  };

  const handleReject = async () => {
    if (approving) return;
    const reason = window.prompt(t("contract.rejectPrompt") || "거절 사유를 입력해주세요 (선택)");
    if (reason === null) return; // 취소
    setApproving(true);
    const { error } = await updateContract(contract.id, {
      status: "rejected",
      reject_reason: reason || null,
    });
    setApproving(false);
    if (error) {
      alert("거절 처리 중 오류가 발생했습니다: " + error.message);
      return;
    }
    const fresh = await getContract(contract.id);
    if (fresh) setContract(normalizeContract(fresh));
  };

  // ─── 카카오톡 공유 ───
  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const method = await shareContractKakao(contract, typeof window !== "undefined" ? window.location.href : "");
      if (method === "clipboard") alert(t("contract.linkCopied"));
    } finally {
      setSharing(false);
    }
  };

  // ─── 계약 조건 수정 (챗봇 대화형) — 서명 전에만 가능 ───
  const DAY_ORDER = ["월", "화", "수", "목", "금", "토", "일"];

  const startEdit = () => {
    setEditing(true);
    setEditStep(0);
    setEditData({
      pay_amount: contract.pay_amount,
      work_days: [...(contract.work_days || [])],
      work_start: contract.work_start,
      work_end: contract.work_end,
      contract_start: contract.contract_start,
      contract_end: contract.contract_end,
    });
    addUser("✏️ 계약 조건을 수정할게요");
    addBot("어떤 계약 조건을 수정할까요?\n아래에서 번호를 선택해주세요.\n\n1️⃣ 급여\n2️⃣ 근무 요일\n3️⃣ 근무 시간\n4️⃣ 계약 기간\n\n수정이 끝나면 '✅ 수정 완료'를 눌러주세요.");
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditStep(0);
    setEditData(null);
    setChatInput("");
    addBot("수정을 취소했어요. 기존 조건이 그대로 유지됩니다.");
  };

  // 수정 항목 번호 선택 메뉴
  const EDIT_MENU = [
    { n: 1, label: "1️⃣ 급여" },
    { n: 2, label: "2️⃣ 근무 요일" },
    { n: 3, label: "3️⃣ 근무 시간" },
    { n: 4, label: "4️⃣ 계약 기간" },
  ];

  const pickEditField = (n) => {
    if (n === 1) {
      addUser("1️⃣ 급여를 수정할게요");
      setEditStep(1);
      addBot(`${contract.pay_type || "시급"}을 입력해주세요.\n현재: ${Number(editData?.pay_amount ?? contract.pay_amount ?? 0).toLocaleString()}원\n\n(숫자만 입력, 예: 12000)`);
    } else if (n === 2) {
      addUser("2️⃣ 근무 요일을 수정할게요");
      setEditStep(2);
      addBot(`근무 요일을 선택해주세요.\n현재: ${(editData?.work_days || []).join("·")}\n\n아래 버튼으로 요일을 켜고 끈 뒤\n'요일 선택 완료'를 눌러주세요.`);
    } else if (n === 3) {
      addUser("3️⃣ 근무 시간을 수정할게요");
      setEditStep(3);
      addBot(`근무 시간을 입력해주세요.\n현재: ${editData?.work_start || "—"} ~ ${editData?.work_end || "—"}\n\n(예: 14:00~19:00)`);
    } else if (n === 4) {
      addUser("4️⃣ 계약 기간을 수정할게요");
      setEditStep(4);
      addBot(`계약 기간을 입력해주세요.\n현재: ${editData?.contract_start || "—"} ~ ${editData?.contract_end || "—"}\n\n(예: 2026-08-01 ~ 2027-01-31)`);
    }
  };

  const backToEditMenu = (doneMsg) => {
    setEditStep(0);
    addBot(`${doneMsg}\n\n다른 항목도 수정할까요?\n1️⃣ 급여  2️⃣ 근무 요일  3️⃣ 근무 시간  4️⃣ 계약 기간\n\n끝났으면 '✅ 수정 완료'를 눌러주세요.`);
  };

  const finishEdit = () => {
    addUser("✅ 수정 완료");
    setEditStep(5);
    addBot("변경할 조건을 확인해주세요!\n아래 요약을 보고 '저장'을 누르면 계약서에 반영됩니다.");
  };

  const toggleEditDay = (d) => {
    setEditData((p) => ({
      ...p,
      work_days: p.work_days.includes(d) ? p.work_days.filter((x) => x !== d) : [...p.work_days, d],
    }));
  };

  const completeDays = () => {
    const days = DAY_ORDER.filter((d) => editData?.work_days?.includes(d));
    if (days.length === 0) {
      addBot("근무 요일을 1개 이상 선택해주세요.");
      return;
    }
    setEditData((p) => ({ ...p, work_days: days }));
    addUser(days.join("·"));
    backToEditMenu(`✅ 근무 요일을 ${days.join("·")} (주 ${days.length}일)로 변경했어요!`);
  };

  const submitEditInput = () => {
    const v = chatInput.trim();
    if (!v) return;
    setChatInput("");
    addUser(v);

    if (editStep === 1) {
      const amount = parseInt(v.replace(/[^0-9]/g, ""), 10);
      if (!amount) {
        addBot("숫자로 입력해주세요. (예: 12000)");
        return;
      }
      if ((contract.pay_type || "시급") === "시급" && amount < MIN_WAGE) {
        addBot(`⚠️ 최저시급(${MIN_WAGE.toLocaleString()}원)보다 낮아요.\n${MIN_WAGE.toLocaleString()}원 이상으로 입력해주세요.`);
        return;
      }
      setEditData((p) => ({ ...p, pay_amount: amount }));
      backToEditMenu(`✅ 급여를 ${amount.toLocaleString()}원으로 변경했어요!`);
    } else if (editStep === 3) {
      const m = v.match(/(\d{1,2}):?(\d{0,2})\s*[~\-]\s*(\d{1,2}):?(\d{0,2})/);
      if (!m) {
        addBot("형식이 올바르지 않아요.\n예: 14:00~19:00");
        return;
      }
      const ws = `${String(parseInt(m[1], 10)).padStart(2, "0")}:${m[2] || "00"}`;
      const we = `${String(parseInt(m[3], 10)).padStart(2, "0")}:${m[4] || "00"}`;
      setEditData((p) => ({ ...p, work_start: ws, work_end: we }));
      backToEditMenu(`✅ 근무 시간을 ${ws} ~ ${we}로 변경했어요!`);
    } else if (editStep === 4) {
      const dm = v.match(/(\d{4}-\d{1,2}-\d{1,2})\s*[~\-]\s*(\d{4}-\d{1,2}-\d{1,2})/);
      if (!dm) {
        addBot("형식이 올바르지 않아요.\n예: 2026-08-01 ~ 2027-01-31");
        return;
      }
      setEditData((p) => ({ ...p, contract_start: dm[1], contract_end: dm[2] }));
      backToEditMenu(`✅ 계약 기간을 ${dm[1]} ~ ${dm[2]}로 변경했어요!`);
    }
  };

  const saveEdit = async () => {
    if (!editData) return;
    // 주간 근로시간 재계산
    let dailyH = 0;
    if (editData.work_start && editData.work_end) {
      const [sh, sm] = editData.work_start.split(":").map(Number);
      const [eh, em] = editData.work_end.split(":").map(Number);
      dailyH = eh + em / 60 - (sh + sm / 60);
      if (dailyH <= 0) dailyH += 24;
    }
    const weeklyHours = Math.round(dailyH * editData.work_days.length * 10) / 10;

    // 급여 재계산 (시급일 때)
    let monthly_basic = contract.monthly_basic;
    let monthly_holiday = contract.monthly_holiday;
    let monthly_total = contract.monthly_total;
    if ((contract.pay_type || "시급") === "시급") {
      monthly_basic = Math.round(editData.pay_amount * weeklyHours * 4.345);
      monthly_holiday = weeklyHours >= 15 ? Math.round(editData.pay_amount * (weeklyHours / 5) * 4.345) : 0;
      monthly_total = monthly_basic + monthly_holiday;
    }

    const { error } = await updateContract(contract.id, {
      pay_amount: editData.pay_amount,
      work_days: editData.work_days,
      work_start: editData.work_start,
      work_end: editData.work_end,
      contract_start: editData.contract_start,
      contract_end: editData.contract_end,
      weekly_hours: weeklyHours,
      monthly_basic,
      monthly_holiday,
      monthly_total,
      insurance_required: weeklyHours >= 15,
    });

    setEditing(false);
    setEditStep(0);

    if (error) {
      alert("조건 변경 중 오류가 발생했습니다: " + error.message);
      return;
    }
    const fresh = await getContract(contract.id);
    if (fresh) setContract(normalizeContract(fresh));
    addBot("✅ 계약 조건이 변경되었습니다!\n📄 '계약서' 탭에서 변경된 내용을 확인하세요.\n\n변경된 조건으로 서명을 진행하면 됩니다.");
  };

  // ─── 조건 확인 → 계약서 보기 → 서명 흐름 ───
  const confirmTerms = () => {
    setTermsConfirmed(true);
    addUser("👍 수정할 내용 없어요. 이 조건으로 진행할게요");
    if (isEmployer && !contract.worker_signed) {
      addBot("좋아요! 계약 조건이 확정되었어요.\n\n📄 '계약서 보기'로 전문을 확인하고,\n💬 '근로자에게 서명 요청'을 눌러\n카카오톡으로 서명 요청을 보내주세요.");
    } else {
      addBot("좋아요! 서명 전에 '📄 계약서 보기'를 눌러\n근로계약서 전문을 꼭 확인해 주세요.\n\n확인하셨으면 ✍️ 서명하기를 눌러주세요.");
    }
  };

  // 계약서 전문 보기 (챗봇 대화로 안내)
  const handleViewContract = () => {
    addUser("📄 계약서 전문을 확인할게요");
    addBot("근로계약서 전문을 열었어요!\n검토가 끝나면 '챗봇' 탭으로 돌아와\n계속 진행해 주세요.");
    setTimeout(() => setTab("preview"), 900);
  };

  // ─── 유학생 시간제취업 확인서 (출입국·외국인청 서식) ───
  const CONF_PROMPTS = {
    alien_reg_no: "외국인등록번호를 입력해주세요.\n(예: 123456-1234567)",
    university: "재학 중인 대학교 이름을 알려주세요.\n(예: OO대학교)",
    department: "학과(전공)를 알려주세요.\n(예: 컴퓨터공학과)",
    semester: "이수 학기를 숫자로 알려주세요.\n(예: 3)",
    industry: "사업장의 업종을 알려주세요.\n(예: 편의점, 음식점, 카페 등)",
  };

  const getStudentInfo = (c) => {
    const wp = c?.worker || {};
    const visa = wp.visa || "";
    const isStudent = visa.includes("D-2") || visa.includes("D-4") || visa.includes("D2") || visa.includes("D4");
    const sf = c?.student_form || {};
    const missingWorker = [];
    if (!(sf.alien_reg_no || wp.alien_reg_number)) missingWorker.push("alien_reg_no");
    if (!(sf.university || wp.organization)) missingWorker.push("university");
    if (!sf.department) missingWorker.push("department");
    if (!sf.semester) missingWorker.push("semester");
    const missingEmployer = sf.industry ? [] : ["industry"];
    return { isStudent, sf, missingWorker, missingEmployer, workerProfile: wp };
  };

  const startConfAsk = (queue) => {
    setConfAsk({ queue, idx: 0, data: {} });
    addBot(`🎓 ${contract.worker_name}님은 외국인 유학생이라\n'시간제취업 확인서'도 자동으로 만들어 드려요!\n\n확인서 작성에 필요한 정보를 몇 가지 여쭤볼게요.`);
    setTimeout(() => addBot(CONF_PROMPTS[queue[0]]), 1800);
  };

  const submitConfInput = async () => {
    const v = chatInput.trim();
    if (!v || !confAsk) return;
    setChatInput("");
    addUser(v);
    const key = confAsk.queue[confAsk.idx];
    const data = { ...confAsk.data, [key]: v };
    if (confAsk.idx + 1 < confAsk.queue.length) {
      setConfAsk({ ...confAsk, idx: confAsk.idx + 1, data });
      addBot(CONF_PROMPTS[confAsk.queue[confAsk.idx + 1]]);
    } else {
      setConfAsk(null);
      const merged = { ...(contract.student_form || {}), ...data };
      const { error } = await updateContract(contract.id, { student_form: merged });
      if (error) {
        alert("정보 저장 중 오류가 발생했습니다: " + error.message);
        return;
      }
      const fresh = await getContract(contract.id);
      if (fresh) setContract(normalizeContract(fresh));
    }
  };

  const handleDownloadConfirmation = async () => {
    if (downloadingConf) return;
    setDownloadingConf(true);
    addUser("🎓 시간제취업 확인서를 다운로드할게요");
    try {
      await generateContractPDF(
        "student-confirmation-for-pdf",
        `K-ALBA_시간제취업확인서_${(contract.worker_name || "student").replace(/[\s\/\\]/g, "_")}.pdf`
      );
      addBot("✅ 시간제취업 확인서 PDF가 저장되었습니다!\n\n유학생담당자 확인란은 학교 국제처에서\n기재·날인 후 출입국·외국인청에 제출하세요.");
    } catch (e) {
      alert("확인서 생성 중 오류가 발생했습니다: " + e.message);
    } finally {
      setDownloadingConf(false);
    }
  };

  // ─── 서명 처리 ───
  const handleSign = (role) => {
    if (signing) return;
    setPendingRole(role);
    setSignatureModalOpen(true);
  };

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

    // 데모 모드
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

      const fresh = await getContract(contract.id);
      if (fresh) setContract(normalizeContract(fresh));

      setSigning(false);

      setTimeout(() => {
        if (role === "worker") {
          addBot("✅ 근로자 서명 완료!\n📱 사장님께 카카오톡으로 알림을 보냈어요!");
          if (data.audit?.ip_recorded) {
            addBot("🔒 전자서명이 기록되었습니다.");
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

  // 계약서를 찾을 수 없을 때 — Step 3-C Empty
  if (!contract) {
    return (
      <div style={{ padding: "40px 20px", maxWidth: 480, margin: "0 auto" }}>
        <Empty
          variant="error"
          icon="❌"
          title="계약서를 찾을 수 없습니다"
          description="계약서가 삭제되었거나 접근 권한이 없을 수 있습니다."
          action={
            <Button variant="primary" href="/my/contracts">
              계약서 목록으로
            </Button>
          }
        />
      </div>
    );
  }

  const TABS = [
    { k: "chatbot", ic: "💬", label: t("contract.tab.chatbot"), desc: t("contract.tab.chatbotDesc") },
    { k: "form", ic: "📱", label: t("contract.tab.form"), desc: t("contract.tab.formDesc") },
    { k: "preview", ic: "📄", label: t("contract.tab.preview"), desc: t("contract.tab.previewDesc") },
  ];

  // 승인 전(pending_approval)·거절(rejected) 상태에서는 서명 불가
  const signBlocked = ["pending_approval", "rejected"].includes(contract.status);
  // 조건 수정: 양측 모두 서명 전 + 거절/완료 아님 (사장님은 항상, 알바생은 본인이 만든 승인 대기 건만)
  const canEdit = !contract.worker_signed && !contract.employer_signed
    && !["rejected", "completed"].includes(contract.status)
    && (isEmployer || (contract.created_by === "worker" && contract.status === "pending_approval"));
  // 유학생 시간제취업 확인서 상태
  const studentInfo = getStudentInfo(contract);
  const confReady = studentInfo.isStudent && studentInfo.missingWorker.length === 0 && studentInfo.missingEmployer.length === 0;
  const canWorkerSign = isWorker && !contract.worker_signed && !signBlocked;
  const canEmployerSign = isEmployer && contract.worker_signed && !contract.employer_signed && !signBlocked;
  const needsApproval = isEmployer && contract.status === "pending_approval";
  const waitingApproval = isWorker && contract.status === "pending_approval";

  // 상태 → Badge variant 매핑 (Step 3-A)
  const statusVariant = {
    draft: "neutral",                // 초안
    pending_approval: "warning",     // 사장님 승인 대기 (알바생 작성)
    rejected: "error",               // 사장님 거절
    worker_signing: "warning",       // 근로자 서명 대기
    employer_signing: "warning",     // 사장님 서명 대기
    completed: "success",            // 계약 완료
  };
  const statusLabel = {
    draft: "초안",
    pending_approval: "사장님 승인 대기",
    rejected: "거절됨",
    worker_signing: "근로자 서명 대기",
    employer_signing: "사장님 서명 대기",
    completed: "계약 완료",
  };

  const handleDownloadPdf = async () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    addUser("📄 근로계약서를 다운로드할게요");
    const prevTab = tab;
    try {
      // 계약서 탭이 렌더링돼 있어야 PDF 요소가 존재 → 잠시 전환 후 생성
      if (typeof document !== "undefined" && !document.getElementById("contract-preview-for-pdf")) {
        setTab("preview");
        await new Promise((r) => setTimeout(r, 700));
      }
      const filename = buildContractFilename(contract);
      await generateContractPDF("contract-preview-for-pdf", filename);
      setTab(prevTab);
      addBot("✅ 근로계약서 PDF가 저장되었습니다!\n다운로드 폴더를 확인해 주세요.");
    } catch (e) {
      setTab(prevTab);
      alert("PDF 생성 중 오류가 발생했습니다: " + e.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", minHeight: "calc(100vh - 60px)" }}>
      {/* 헤더 */}
      <div style={{ padding: "16px 20px", background: "#fff", borderBottom: `1px solid ${T.border}` }}>
        <Link href="/my/contracts" style={{ color: T.ink3, fontSize: 13 }}>← {t("contract.myContracts")}</Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: T.navy }}>📝 {t("contract.title")}</h2>
            <div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>{contract.company_name} · {contract.worker_name}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            {/* 상태 배지 — Step 3-A Badge 시맨틱 */}
            <Badge
              variant={statusVariant[contract.status] || "neutral"}
              size="sm"
            >
              {t(`contract.status.${contract.status}`) || statusLabel[contract.status]}
            </Badge>
            {/* 카카오톡 공유 — 상호간 계약 내용 확인용 링크 전송 */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleShare}
              disabled={sharing}
              title={t("contract.shareKakao")}
            >
              💬 {t("contract.share")}
            </Button>
            {contract.worker_signed && contract.employer_signed && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? <ButtonLoading text="생성 중..." /> : t("contract.downloadPdf")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", background: "#fff", borderBottom: `2px solid ${T.border}` }}>
        {TABS.map((tabItem) => (
          <button
            key={tabItem.k}
            onClick={() => setTab(tabItem.k)}
            style={{
              flex: 1,
              padding: "14px 8px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 700,
              color: tab === tabItem.k ? T.coral : T.ink3,
              borderBottom: `3px solid ${tab === tabItem.k ? T.coral : "transparent"}`,
              marginBottom: -2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 15 }}>{tabItem.ic}</span> {tabItem.label}
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
                  {/* KIcon variant="kakao" — BI v2: 챗봇 아바타에 🤖 미사용 */}
                  {m.from === "bot" && (
                    <KIcon variant="kakao" size="sm" style={{ width: 32, height: 32, fontSize: 14, borderRadius: 10 }} />
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
                  <KIcon variant="kakao" size="sm" style={{ width: 32, height: 32, fontSize: 14, borderRadius: 10 }} />
                  <div style={{ background: "#fff", padding: "12px 18px", borderRadius: "4px 14px 14px 14px", display: "flex", gap: 4 }}>
                    {[0, 1, 2].map((d) => (
                      <div key={d} style={{ width: 6, height: 6, borderRadius: 3, background: T.borderStrong, animation: `dotPulse 1s ease-in-out ${d * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* 계약 조건 수정 버튼 — 승인 검토 단계에서만 별도 노출 (다른 단계는 대화 버튼에 포함) */}
            {canEdit && !editing && !typing && signBlocked && (
              <div style={{ padding: "8px 14px 0", background: "#fff", borderTop: `1px solid ${T.border}` }}>
                <button
                  onClick={startEdit}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px dashed ${T.borderStrong}`, background: "#fff", color: T.ink2, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                >
                  ✏️ 계약 조건 수정 (급여·요일·시간·기간)
                </button>
              </div>
            )}

            {/* 사장님: 근로자 서명 대기 단계 — 조건 확인 → 계약서 보기·서명 요청 */}
            {isEmployer && !contract.worker_signed && !contract.employer_signed && !signBlocked && !typing && !editing && !confAsk && (
              <div style={{ padding: 14, background: "#fff", borderTop: `1px solid ${T.border}` }}>
                {!termsConfirmed ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button variant="primaryDark" size="lg" fullWidth onClick={confirmTerms}>
                      👍 수정 없음, 진행
                    </Button>
                    {canEdit && (
                      <Button variant="secondary" size="lg" onClick={startEdit} style={{ flexShrink: 0 }}>
                        ✏️ 수정
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button variant="secondary" size="lg" onClick={handleViewContract} style={{ flexShrink: 0 }}>
                        📄 계약서 보기
                      </Button>
                      <Button variant="primaryDark" size="lg" fullWidth onClick={handleShare} disabled={sharing}>
                        💬 근로자에게 서명 요청
                      </Button>
                    </div>
                    <p style={{ textAlign: "center", fontSize: 10, color: T.ink3, marginTop: 8 }}>
                      근로자가 서명하면 사장님 최종 서명 차례가 됩니다
                    </p>
                  </>
                )}
              </div>
            )}

            {/* 조건 수정 대화 입력 영역 */}
            {editing && (
              <div style={{ padding: 12, background: "#fff", borderTop: `1px solid ${T.border}` }}>
                {editStep === 0 && (
                  <div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                      {EDIT_MENU.map((m) => (
                        <button
                          key={m.n}
                          onClick={() => pickEditField(m.n)}
                          style={{ flex: "1 1 45%", padding: "11px 8px", borderRadius: 8, border: `2px solid ${T.border}`, background: "#fff", color: T.navy, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button variant="primary" size="md" fullWidth onClick={finishEdit}>✅ 수정 완료</Button>
                      <Button variant="secondary" size="md" onClick={cancelEdit}>취소</Button>
                    </div>
                  </div>
                )}
                {editStep === 2 && (
                  <div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                      {DAY_ORDER.map((d) => {
                        const on = editData?.work_days?.includes(d);
                        return (
                          <button
                            key={d}
                            onClick={() => toggleEditDay(d)}
                            style={{ flex: 1, minWidth: 40, padding: "10px 0", borderRadius: 8, border: `2px solid ${on ? T.coral : T.border}`, background: on ? T.coralL : "#fff", color: on ? T.coral : T.ink3, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button variant="primary" size="md" fullWidth onClick={completeDays}>
                        요일 선택 완료 ({(editData?.work_days || []).length}일)
                      </Button>
                      <Button variant="secondary" size="md" onClick={cancelEdit}>취소</Button>
                    </div>
                  </div>
                )}
                {editStep === 5 && editData && (
                  <div>
                    <div style={{ background: T.cream, borderRadius: 10, padding: "10px 14px", fontSize: 12.5, lineHeight: 2, marginBottom: 8 }}>
                      💰 {contract.pay_type || "시급"} <strong>{Number(editData.pay_amount).toLocaleString()}원</strong><br />
                      📅 <strong>{editData.work_days.join("·")}</strong> (주 {editData.work_days.length}일)<br />
                      ⏰ <strong>{editData.work_start} ~ {editData.work_end}</strong><br />
                      🗓 <strong>{editData.contract_start} ~ {editData.contract_end}</strong>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button variant="primary" size="md" fullWidth onClick={saveEdit}>💾 이 조건으로 저장</Button>
                      <Button variant="secondary" size="md" onClick={cancelEdit}>취소</Button>
                    </div>
                  </div>
                )}
                {(editStep === 1 || editStep === 3 || editStep === 4) && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") submitEditInput(); }}
                      placeholder={editStep === 1 ? "예: 12000" : editStep === 3 ? "예: 14:00~19:00" : "예: 2026-08-01 ~ 2027-01-31 (또는 '그대로')"}
                      style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `2px solid ${T.border}`, fontSize: 14, fontFamily: "inherit", outline: "none", minWidth: 0 }}
                    />
                    <Button variant="primary" size="md" onClick={submitEditInput}>전송</Button>
                    <Button variant="ghost" size="md" onClick={cancelEdit}>✕</Button>
                  </div>
                )}
              </div>
            )}

            {/* 승인 버튼 영역 — 알바생 작성 계약서를 사장님이 검토 */}
            {needsApproval && !typing && !editing && (
              <div style={{ padding: 14, background: "#fff", borderTop: `1px solid ${T.border}`, display: "flex", gap: 10 }}>
                <Button
                  variant="primaryDark"
                  size="lg"
                  fullWidth
                  onClick={handleApprove}
                  disabled={approving}
                >
                  {approving ? <ButtonLoading text="처리 중..." /> : `✅ ${t("contract.approveBtn")}`}
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleReject}
                  disabled={approving}
                  style={{ flexShrink: 0 }}
                >
                  {t("contract.rejectBtn")}
                </Button>
              </div>
            )}

            {/* 승인 대기 — 알바생이 사장님께 카카오톡으로 확인 요청 */}
            {waitingApproval && !typing && !editing && (
              <div style={{ padding: 14, background: "#fff", borderTop: `1px solid ${T.border}` }}>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleShare}
                  disabled={sharing}
                >
                  💬 {t("contract.shareToEmployer")}
                </Button>
                <p style={{ textAlign: "center", fontSize: 10, color: T.ink3, marginTop: 8 }}>
                  {t("contract.waitApprovalHint")}
                </p>
              </div>
            )}

            {/* 유학생 확인서 정보 수집 입력 영역 */}
            {confAsk && !editing && (
              <div style={{ padding: 12, background: "#fff", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8 }}>
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitConfInput(); }}
                  placeholder="답변을 입력하세요"
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `2px solid ${T.border}`, fontSize: 14, fontFamily: "inherit", outline: "none", minWidth: 0 }}
                />
                <Button variant="primary" size="md" onClick={submitConfInput}>전송</Button>
              </div>
            )}

            {/* 서명 버튼 영역 — 1)조건 확인 → 2)계약서 보기 → 3)서명 */}
            {(canWorkerSign || canEmployerSign) && !typing && !editing && (
              <div style={{ padding: 14, background: "#fff", borderTop: `1px solid ${T.border}` }}>
                {canWorkerSign && !termsConfirmed ? (
                  <>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button variant="primary" size="lg" fullWidth onClick={confirmTerms}>
                        👍 이 조건으로 진행
                      </Button>
                      {canEdit && (
                        <Button variant="secondary" size="lg" onClick={startEdit} style={{ flexShrink: 0 }}>
                          ✏️ 수정
                        </Button>
                      )}
                    </div>
                    <p style={{ textAlign: "center", fontSize: 10, color: T.ink3, marginTop: 8 }}>
                      계약 조건을 확인한 뒤 진행해주세요
                    </p>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button variant="secondary" size="lg" onClick={handleViewContract} style={{ flexShrink: 0 }}>
                        📄 계약서 보기
                      </Button>
                      <Button
                        variant={canEmployerSign ? "primaryDark" : "primary"}
                        size="lg"
                        fullWidth
                        onClick={() => handleSign(canWorkerSign ? "worker" : "employer")}
                        disabled={signing}
                      >
                        {signing ? (
                          <ButtonLoading text={t("contract.signing")} />
                        ) : (
                          canWorkerSign ? t("contract.signWorker") : t("contract.signEmployer")
                        )}
                      </Button>
                    </div>
                    <p style={{ textAlign: "center", fontSize: 10, color: T.ink3, marginTop: 8 }}>
                      {t("contract.signHint")}
                    </p>
                  </>
                )}
              </div>
            )}

            {contract.worker_signed && contract.employer_signed && (
              <div style={{ padding: 14, background: T.mintL, borderTop: `1px solid ${T.mint}40`, textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 4 }}>🎉</div>
                <div style={{ fontWeight: 800, color: "#059669", fontSize: 14 }}>{t("contract.complete")}</div>
                <div style={{ fontSize: 11, color: T.ink3, marginTop: 4 }}>{t("contract.completeDesc")}</div>

                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
                  <Button variant="landingDark" size="md" onClick={handleDownloadPdf} disabled={downloadingPdf}>
                    {downloadingPdf ? "생성 중..." : "📄 근로계약서 PDF"}
                  </Button>
                  {studentInfo.isStudent && confReady && (
                    <Button variant="primary" size="md" onClick={handleDownloadConfirmation} disabled={downloadingConf}>
                      {downloadingConf ? "생성 중..." : "🎓 시간제취업 확인서 PDF"}
                    </Button>
                  )}
                </div>
                {studentInfo.isStudent && !confReady && (
                  <p style={{ fontSize: 10.5, color: T.ink3, marginTop: 8 }}>
                    🎓 시간제취업 확인서는 정보 입력이 끝나면 다운로드할 수 있어요
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "form" && <ContractForm contract={contract} />}
        {tab === "preview" && <ContractPreview contract={contract} />}
      </div>

      {/* 유학생 시간제취업 확인서 (숨김 — PDF 생성용) */}
      {contract.worker_signed && contract.employer_signed && studentInfo.isStudent && (
        <StudentConfirmationForm contract={contract} info={studentInfo} />
      )}

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

// ─── 웹앱 폼 탭 (BI v2 토큰 적용) ───
function ContractForm({ contract }) {
  const section = { background: "#fff", borderRadius: 14, padding: 16, border: `1px solid ${T.border}`, marginBottom: 12 };
  const sectionTitle = { fontSize: 12, fontWeight: 800, color: T.coral, marginBottom: 10, letterSpacing: 1 };
  const row = { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.cream}`, fontSize: 13 };
  const label = { color: T.ink3 };
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
        <div style={{ marginTop: 10, fontSize: 11, color: T.ink3, lineHeight: 1.7 }}>
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

// ─── 계약서 미리보기 탭 (인쇄 양식 — 컬러 변경 금지) ───
// ─── 외국인 유학생 시간제 취업 확인서 (출입국·외국인청 서식) — PDF 생성용 숨김 렌더 ───
function StudentConfirmationForm({ contract, info }) {
  const sf = info.sf || {};
  const wp = info.workerProfile || {};
  const days = contract.work_days || [];
  let dailyH = 0;
  if (contract.work_start && contract.work_end) {
    const [sh, sm] = contract.work_start.split(":").map(Number);
    const [eh, em] = contract.work_end.split(":").map(Number);
    dailyH = eh + em / 60 - (sh + sm / 60);
    if (dailyH <= 0) dailyH += 24;
  }
  const fmtH = (h) => (Math.round(h * 10) / 10).toString().replace(/\.0$/, "");
  const WEEKDAYS = ["월", "화", "수", "목", "금"];
  const WEEKEND = ["토", "일"];
  const weekdayTotal = days.filter((d) => WEEKDAYS.includes(d)).length * dailyH;
  const weekendTotal = days.filter((d) => WEEKEND.includes(d)).length * dailyH;
  const timeRange = contract.work_start && contract.work_end ? `${contract.work_start}~${contract.work_end}` : "";

  const th = { border: "1px solid #111", background: "#F2F0EC", padding: "7px 8px", fontSize: 11, fontWeight: 700, textAlign: "center", verticalAlign: "middle" };
  const td = { border: "1px solid #111", padding: "7px 10px", fontSize: 11, verticalAlign: "middle" };
  const tdC = { ...td, textAlign: "center" };

  return (
    <div
      id="student-confirmation-for-pdf"
      style={{ display: "none", background: "#fff", padding: "42px 40px", width: 700, fontFamily: "'Noto Sans KR', sans-serif", color: "#111" }}
    >
      <h1 style={{ textAlign: "center", fontSize: 20, fontWeight: 900, letterSpacing: 3, border: "2px solid #111", padding: "12px 0", marginBottom: 0 }}>
        외국인 유학생 시간제 취업 확인서
      </h1>
      <div style={{ textAlign: "center", fontSize: 9.5, color: "#777", padding: "4px 0 10px" }}>
        Part-time Work of Foreign Student Confirmation Form
      </div>

      {/* 대상자 */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 0 }}>
        <tbody>
          <tr>
            <td style={{ ...th, width: 60 }} rowSpan={3}>대상자</td>
            <td style={{ ...th, width: 90 }}>성 명</td>
            <td style={td}>{contract.worker_name || ""}</td>
            <td style={{ ...th, width: 90 }}>외국인<br />등록번호</td>
            <td style={{ ...td, width: 150 }}>{sf.alien_reg_no || wp.alien_reg_number || ""}</td>
          </tr>
          <tr>
            <td style={th}>학과(전공)</td>
            <td style={td}>{sf.department || ""}</td>
            <td style={th}>이수학기</td>
            <td style={td}>{sf.semester ? `${String(sf.semester).replace(/[^0-9]/g, "")}학기` : ""}</td>
          </tr>
          <tr>
            <td style={th}>전화번호</td>
            <td style={td}>{contract.worker_phone || wp.phone || ""}</td>
            <td style={th}>e-mail</td>
            <td style={td}>{wp.email || ""}</td>
          </tr>
        </tbody>
      </table>

      {/* 취업 예정 근무처 */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderTop: "none" }}>
        <tbody>
          <tr>
            <td style={{ ...th, width: 60 }} rowSpan={6}>취업<br />예정<br />근무처</td>
            <td style={{ ...th, width: 90 }}>업 체 명</td>
            <td style={td} colSpan={3}>{contract.company_name || ""}</td>
          </tr>
          <tr>
            <td style={th}>사업자<br />등록번호</td>
            <td style={td}>{contract.business_number || ""}</td>
            <td style={{ ...th, width: 70 }}>업종</td>
            <td style={{ ...td, width: 150 }}>{sf.industry || ""}</td>
          </tr>
          <tr>
            <td style={th}>주 소</td>
            <td style={td} colSpan={3}>{contract.business_address || ""}{contract.address_detail ? ` ${contract.address_detail}` : ""}</td>
          </tr>
          <tr>
            <td style={th}>고 용 주</td>
            <td style={td}>
              {contract.employer_name || ""}&nbsp;&nbsp;
              {contract.employer_signature ? (
                <img src={contract.employer_signature} alt="서명" style={{ height: 26, verticalAlign: "middle" }} />
              ) : (
                <span style={{ color: "#999", fontSize: 10 }}>(인 또는 서명)</span>
              )}
            </td>
            <td style={th}>전화<br />번호</td>
            <td style={td}>{contract.employer_phone || ""}</td>
          </tr>
          <tr>
            <td style={th}>취업기간</td>
            <td style={td}>{contract.contract_start || ""} ~ {contract.contract_end || ""}</td>
            <td style={th}>급여<br />(시급)</td>
            <td style={td}>{Number(contract.pay_amount || 0).toLocaleString()}원</td>
          </tr>
          <tr>
            <td style={th}>근무시간</td>
            <td style={{ ...td, padding: 0 }} colSpan={3}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ ...tdC, border: "none", borderBottom: "1px solid #111", fontWeight: 700 }} colSpan={6}>
                      평 일 : 총 {fmtH(weekdayTotal)}시간
                    </td>
                    <td style={{ ...tdC, border: "none", borderBottom: "1px solid #111", borderLeft: "1px solid #111", fontWeight: 700 }} colSpan={2}>
                      주말 : 총 {fmtH(weekendTotal)}시간
                    </td>
                  </tr>
                  <tr>
                    <td style={{ ...th, borderTop: "none" }}>요일</td>
                    {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
                      <td key={d} style={{ ...th, borderTop: "none" }}>{d}</td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ ...th }}>시간</td>
                    {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
                      <td key={d} style={{ ...tdC, fontSize: 9.5 }}>{days.includes(d) ? timeRange : ""}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 확인 문구 */}
      <div style={{ border: "1px solid #111", borderTop: "none", padding: "14px 16px", fontSize: 11.5, lineHeight: 2 }}>
        위 유학생은 본교에 재학하고 있는 학생으로서 현재의 학습 및 연구 상황으로 볼 때, 상기 예정된
        시간제취업 활동을 통해서는 학업(또는 연구 활동)에 지장이 없을 것으로 판단되므로, 이에 확인합니다.
        <div style={{ textAlign: "center", marginTop: 10, fontSize: 12 }}>20&nbsp;&nbsp;&nbsp;.&nbsp;&nbsp;&nbsp;.&nbsp;&nbsp;&nbsp;.</div>
        <div style={{ fontSize: 9, color: "#555", lineHeight: 1.7, marginTop: 8 }}>
          ※ 시간제취업허가 [한국어능력기준 제출자] 허용시간은 어학연수생은 주당 20시간, 학부과정은 주당 20시간 이내(인증대학은 25시간), 석박사과정은 주당 30시간 이내임.<br />
          ▶ 한국어능력기준(토픽 기준) : 어학연수 2급, 전문학사 3급, 학사(1~2학년) 3급, 학사(3~4학년) 4급, 석박사 4급 이상 ◀<br />
          ※ 시간제취업 허가 전 취업할 경우 [유학생과 고용주] 모두 처벌될 수 있습니다. (허가된 근무처에서만 취업 활동 가능)
        </div>
      </div>

      <div style={{ border: "1px solid #111", borderTop: "none", padding: "16px 0", textAlign: "center", fontSize: 15, fontWeight: 700, letterSpacing: 2 }}>
        ◌ ◌ 출입국·외국인청(사무소·출장소)장 귀하
      </div>

      {/* 유학생담당자 확인란 (학교 기재) */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderTop: "none" }}>
        <tbody>
          <tr>
            <td style={{ ...th, width: 100 }} rowSpan={3}>유학생담당자<br />확인란</td>
            <td style={{ ...th, width: 80 }}>소속</td>
            <td style={{ ...td, width: 160 }}>{sf.university || wp.organization || ""}</td>
            <td style={{ ...th, width: 60 }} rowSpan={3}>성명</td>
            <td style={td} rowSpan={3}><span style={{ color: "#999", fontSize: 10 }}>(인 또는 서명)</span></td>
          </tr>
          <tr>
            <td style={th}>인증대학<br />여부</td>
            <td style={td}>해당 ☐&nbsp;&nbsp;비해당 ☐</td>
          </tr>
          <tr>
            <td style={th}>직위<br />(연락처)</td>
            <td style={td}></td>
          </tr>
        </tbody>
      </table>

      <div style={{ textAlign: "center", fontSize: 9, color: "#999", marginTop: 10 }}>
        본 확인서는 K-ALBA에서 자동 생성되었습니다. 유학생담당자 확인란은 소속 대학에서 기재·날인 후 제출하세요.
      </div>
    </div>
  );
}

// ─── 계약서 미리보기: 고용노동부 「표준근로계약서(단시간근로자)」 서식 기반 ───
function ContractPreview({ contract }) {
  const workDays = contract.work_days || [];
  const weeklyHours = contract.weekly_hours || 0;
  const weeklyDays = workDays.length;
  const dailyHours = weeklyDays > 0 ? (weeklyHours / weeklyDays).toFixed(1).replace(/\.0$/, "") : "";
  const contractDate = (contract.created_at || new Date().toISOString()).split("T")[0];
  const [cy, cm, cd] = contractDate.split("-");
  const insured = !!contract.insurance_required; // 월 60시간 이상 → 국민연금·건강보험
  const employmentIns = weeklyHours >= 15; // 주 15시간 이상 → 고용보험
  const payLabel = contract.pay_type === "시급" ? "시간급" : contract.pay_type === "일급" ? "일급" : "월급";
  const contractNo = contract.id
    ? `ALBA-${new Date(contract.created_at || Date.now()).getFullYear()}-${String(contract.id).padStart(6, "0").slice(-6)}`
    : "ALBA-2026-000001";

  const num = { fontWeight: 800, fontSize: 12.5, color: "#111" };
  const line = { fontSize: 12, color: "#111", lineHeight: 1.9, marginBottom: 4 };
  const noteStyle = { fontSize: 10.5, color: "#555", lineHeight: 1.7, margin: "2px 0 6px 14px" };
  const u = { borderBottom: "1px solid #111", padding: "0 6px", fontWeight: 700 };
  const th = { border: "1px solid #333", background: "#F5F3F0", padding: "6px 8px", fontSize: 11, fontWeight: 700, textAlign: "center" };
  const td = { border: "1px solid #333", padding: "6px 8px", fontSize: 11, textAlign: "center" };

  const SignImg = ({ png, signed, date }) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {signed && png ? (
        <img src={png} alt="서명" style={{ height: 34, verticalAlign: "middle" }} />
      ) : (
        <span style={{ color: "#999" }}>(서명)</span>
      )}
      {signed && date && (
        <span style={{ fontSize: 10, color: "#00A86B" }}>✓ {new Date(date).toLocaleDateString("ko-KR")} 전자서명</span>
      )}
    </span>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#EDEDEA" }}>
      <div
        id="contract-preview-for-pdf"
        style={{ background: "#fff", padding: "40px 36px 30px", borderRadius: 4, maxWidth: 700, margin: "0 auto", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", fontFamily: "'Noto Sans KR', sans-serif", color: "#111" }}
      >
        {/* 제목 */}
        <h1 style={{ textAlign: "center", fontSize: 21, fontWeight: 900, letterSpacing: 4, marginBottom: 6 }}>
          단시간근로자 표준근로계약서
        </h1>
        <div style={{ textAlign: "center", fontSize: 10, color: "#777", marginBottom: 18 }}>
          계약번호 {contractNo} · 고용노동부 표준서식 기반 · 법률검토 : 법무법인 수성 김익환 변호사
        </div>

        <p style={{ fontSize: 12, lineHeight: 2.1, marginBottom: 14 }}>
          <span style={u}>{contract.company_name || contract.employer_name || "        "}</span> (이하 “사업주”라 함)과(와){" "}
          <span style={u}>{contract.worker_name || "        "}</span> (이하 “근로자”라 함)은 다음과 같이 근로계약을 체결한다.
        </p>

        <div style={line}><span style={num}>1. 근로개시일</span> : {formatKoreanDate(contract.contract_start)}부터 {formatKoreanDate(contract.contract_end)}까지</div>
        <div style={line}><span style={num}>2. 근 무 장 소</span> : {contract.business_address || "—"}{contract.address_detail ? ` ${contract.address_detail}` : ""}{contract.company_name ? ` (${contract.company_name})` : ""}</div>
        <div style={line}><span style={num}>3. 업무의 내용</span> : {contract.job_description || "—"}</div>

        <div style={{ ...line, marginBottom: 6 }}><span style={num}>4. 근로일 및 근로일별 근로시간</span></div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 4 }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 90 }}></th>
              {workDays.map((d) => (
                <th key={d} style={th}>( {d} )요일</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={th}>근로시간</td>
              {workDays.map((d) => (<td key={d} style={td}>{dailyHours}시간</td>))}
            </tr>
            <tr>
              <td style={th}>시 업</td>
              {workDays.map((d) => (<td key={d} style={td}>{contract.work_start || "—"}</td>))}
            </tr>
            <tr>
              <td style={th}>종 업</td>
              {workDays.map((d) => (<td key={d} style={td}>{contract.work_end || "—"}</td>))}
            </tr>
            <tr>
              <td style={th}>휴게 시간</td>
              {workDays.map((d) => (<td key={d} style={td}>4시간당 30분</td>))}
            </tr>
          </tbody>
        </table>
        <div style={{ ...line, marginLeft: 6, marginBottom: 10 }}>ㅇ 주휴일 : 매주 일요일 {weeklyHours >= 15 ? "(유급 · 주 15시간 이상)" : "(주 15시간 미만 — 미발생)"}</div>

        <div style={{ ...line, marginBottom: 2 }}><span style={num}>5. 임 금</span></div>
        <div style={{ marginLeft: 14 }}>
          <div style={line}>
            - {payLabel} : <strong>{Number(contract.pay_amount || 0).toLocaleString()}원</strong>
            {contract.pay_type === "시급" && contract.pay_amount >= MIN_WAGE && (
              <span style={{ fontSize: 10.5, color: "#00A86B" }}> (✓ 2026년 최저시급 {MIN_WAGE.toLocaleString()}원 이상)</span>
            )}
          </div>
          <div style={line}>- 상여금 : 없음 ( ○ )</div>
          <div style={line}>
            - 기타급여(제수당 등) : {weeklyHours >= 15 && contract.pay_type === "시급"
              ? <>있음 ( ○ ) — 주휴수당 약 {Number(contract.monthly_holiday || 0).toLocaleString()}원/월</>
              : "없음 ( ○ )"}
          </div>
          <div style={line}>- 초과근로에 대한 가산임금률 : 50%</div>
          <div style={noteStyle}>
            ※ 단시간근로자와 사용자 사이에 근로하기로 정한 시간을 초과하여 근로하면 법정 근로시간 내라도 통상임금의 100분의 50% 이상의 가산임금 지급(’14.9.19. 시행)
          </div>
          <div style={line}>- 임금지급일 : 매월 말일 (휴일의 경우는 전일 지급)</div>
          <div style={line}>- 지급방법 : 근로자 명의 예금통장에 입금 ( ○ )</div>
          {contract.pay_type === "시급" && (
            <div style={noteStyle}>
              ※ 예상 월 급여(참고) : 기본급 약 {Number(contract.monthly_basic || 0).toLocaleString()}원 + 주휴수당 약 {Number(contract.monthly_holiday || 0).toLocaleString()}원 = 약 {Number(contract.monthly_total || 0).toLocaleString()}원 (4.345주 기준 추정, 실제 지급액은 근무일수에 따라 달라질 수 있음)
            </div>
          )}
        </div>

        <div style={line}><span style={num}>6. 연차유급휴가</span> : 통상근로자의 근로시간에 비례하여 연차유급휴가 부여</div>

        <div style={{ ...line, marginBottom: 2 }}><span style={num}>7. 사회보험 적용여부</span> (해당란에 체크)</div>
        <div style={{ ...line, marginLeft: 14, letterSpacing: 0.5 }}>
          {employmentIns ? "☑" : "☐"} 고용보험 &nbsp;&nbsp; ☑ 산재보험 &nbsp;&nbsp; {insured ? "☑" : "☐"} 국민연금 &nbsp;&nbsp; {insured ? "☑" : "☐"} 건강보험
        </div>

        <div style={line}><span style={num}>8. 근로계약서 교부</span></div>
        <div style={{ ...line, marginLeft: 14 }}>
          - “사업주”는 근로계약을 체결함과 동시에 본 계약서를 사본하여 “근로자”의 교부요구와 관계없이 “근로자”에게 교부함 (근로기준법 제17조 이행 — 전자문서 교부 포함)
        </div>

        <div style={line}><span style={num}>9. 근로계약, 취업규칙 등의 성실한 이행의무</span></div>
        <div style={{ ...line, marginLeft: 14 }}>
          - 사업주와 근로자는 각자가 근로계약, 취업규칙, 단체협약을 지키고 성실하게 이행하여야 함
        </div>

        <div style={line}><span style={num}>10. 기 타</span></div>
        <div style={{ ...line, marginLeft: 14 }}>- 이 계약에 정함이 없는 사항은 근로기준법령에 의함</div>

        <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, margin: "24px 0 18px" }}>
          {cy}년 {Number(cm)}월 {Number(cd)}일
        </div>

        {/* 서명란 */}
        <div style={{ fontSize: 12, lineHeight: 2.3, marginBottom: 6 }}>
          <div>
            <strong>(사업주)</strong> 사업체명 : {contract.company_name || "—"} &nbsp;(전화 : {contract.employer_phone || "—"})
          </div>
          <div style={{ marginLeft: 52 }}>주&nbsp;&nbsp;&nbsp;&nbsp;소 : {contract.business_address || "—"}</div>
          <div style={{ marginLeft: 52 }}>
            대 표 자 : {contract.employer_name || "—"} &nbsp;
            <SignImg png={contract.employer_signature} signed={contract.employer_signed} date={contract.employer_sign_date} />
          </div>
        </div>
        <div style={{ fontSize: 12, lineHeight: 2.3 }}>
          <div>
            <strong>(근로자)</strong> 주&nbsp;&nbsp;&nbsp;&nbsp;소 : {contract.worker_address || ""}
          </div>
          <div style={{ marginLeft: 52 }}>연 락 처 : {contract.worker_phone || "—"}</div>
          <div style={{ marginLeft: 52 }}>
            성&nbsp;&nbsp;&nbsp;&nbsp;명 : {contract.worker_name || "—"} &nbsp;
            <SignImg png={contract.worker_signature} signed={contract.worker_signed} date={contract.worker_sign_date} />
          </div>
        </div>

        {/* K-ALBA 푸터 */}
        <div style={{ marginTop: 22, paddingTop: 12, borderTop: "1px dashed #AAA", textAlign: "center", fontSize: 10, color: "#777", lineHeight: 1.7 }}>
          본 근로계약서는 고용노동부 표준근로계약서(단시간근로자) 서식에 따라 <strong>K-ALBA</strong>에서 자동 생성되었으며, 전자서명은 서면 서명과 동일한 법적 효력을 가집니다.<br />
          미림미디어랩 주식회사 | k-alba.kr
        </div>
      </div>
    </div>
  );
}

// ─── (구 양식 — 보관용, 미사용) ───
function LegacyContractPreview({ contract }) {
  const contractNo = contract.id
    ? `ALBA-${new Date(contract.created_at || Date.now()).getFullYear()}-${String(contract.id).padStart(6, "0").slice(-6)}`
    : "ALBA-2026-000001";

  const isShortTime = (contract.weekly_hours || 0) < 40;
  const weeklyHours = contract.weekly_hours || 0;
  const weeklyDays = (contract.work_days || []).length;
  const dailyHours = weeklyDays > 0 ? (weeklyHours / weeklyDays).toFixed(1).replace(/\.0$/, "") : 0;

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

        {/* 제1조 ~ 제7조 */}
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

        {/* 급여 계산 내역 */}
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

// ─── 계약서 양식 서브 컴포넌트 (PDF 인쇄용 — 컬러 변경 금지) ───
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
