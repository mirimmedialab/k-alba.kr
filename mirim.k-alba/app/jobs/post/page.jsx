"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { AddressSearchModal } from "@/components/AddressSearch";
import { JOB_PRESETS, getMarketPay } from "@/data/marketData";
import { createJob, getCurrentUser, getProfile } from "@/lib/supabase";
import BusinessVerify from "@/components/ui/BusinessVerify";
import { Button, KIcon } from "@/components/ui";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { useT } from "@/lib/i18n";

/**
 * /jobs/post 공고 등록 (BI v2)
 *
 * 디자인 패턴: 카카오톡 챗봇 14단계 인터랙션 (BI v2 핵심 가치 "3분 공고 등록")
 *
 * 페르소나 (BI v2 Section 6 — 사장님):
 *   - 무드: 신뢰·전문성 + 친근한 카톡 인터페이스
 *   - 색상: 카카오 노랑(K 아바타) + 차분 코랄(사장님 액션)
 *
 * 변경점 (BI v2):
 *   - Btn (UI.jsx) → Button variant="primaryDark" (사장님 페이지 일관성)
 *   - 인라인 K 박스 → KIcon variant="kakao" (Step 3-A 워드마크)
 *   - 입력 send 버튼/등록 버튼: T.coral → T.coralDark (사장님 차분 톤)
 *   - T.g500/g700/g100/g200/g300 → T.ink3/ink2/border/borderStrong (새 표준)
 *
 * 보존 (100%):
 *   - 카카오톡 스타일 챗봇 14단계 흐름 (업종/제목/근무형태/주소/.../비자/...)
 *   - 카톡 채팅창 디자인 (#B2C7D9 배경, 노란 K 박스, 말풍선)
 *   - 시세 가이드 (getMarketPay) — 지역·업종별 시급 안내
 *   - JOB_PRESETS 업종별 추천 (intro/title/addrEx/payType 등)
 *   - chips/multi/chipsInput/addressSearch/textarea 5가지 입력 타입
 *   - typing 인디케이터 + scrollIntoView
 *   - 등록 완료 카드 (코랄 그라데이션 — 기쁨 강조)
 *   - resetChat (다시 작성) + handlePost (지오코딩 + 알림)
 *   - 푸시 알림 발송 (반경 내 구독자)
 */
export default function PostJobPage() {
  const t = useT();
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [step, setStep] = useState(0);
  const [input, setInput] = useState("");
  const [answers, setAnswers] = useState({});
  const [typing, setTyping] = useState(false);
  const [posted, setPosted] = useState(false);
  const [multiSel, setMultiSel] = useState([]);
  const [addrModal, setAddrModal] = useState(false);
  const scrollRef = useRef(null);
  const initRef = useRef(false);
  const isDesktop = useIsDesktop();
  const [form, setForm] = useState({ jobType: "", title: "", workType: [], address: "", addressDetail: "", payType: "시급", payAmount: "", workHours: "", workDays: "", korean: "", visa: [], headcount: "", benefits: [], description: "" });
  const [webAddrOpen, setWebAddrOpen] = useState(false);
  const [webErr, setWebErr] = useState("");
  const [webBusy, setWebBusy] = useState(false);
  // 사업자 인증 게이트 상태 (미인증 사장님은 공고 작성 전 인증 먼저)
  const [bizGate, setBizGate] = useState({ loading: true, verified: false, userId: null });

  useEffect(() => {
    getCurrentUser().then(async (u) => {
      if (!u) { setBizGate({ loading: false, verified: false, userId: null }); return; }
      const p = await getProfile(u.id);
      setBizGate({ loading: false, verified: !!p?.verified, userId: u.id });
    });
  }, []);

  // 데스크탑 미인증자는 별도 게이트 대신 '내 공고'의 인라인 인증으로 유도
  useEffect(() => {
    if (!bizGate.loading && !bizGate.verified && isDesktop) {
      router.replace("/my/jobs?verify=1");
    }
  }, [bizGate.loading, bizGate.verified, isDesktop, router]);

  // 스텝: 1=업종, 2=제목, 3=근무형태, 4=주소, 5=상세주소, 6=급여형태, 7=금액, 8=시간, 9=요일, 10=한국어, 11=비자, 12=인원, 13=복리후생, 14=설명
  const TOTAL_STEPS = 14;

  const getStepType = (s) => ({
    1: "chips", 2: "input", 3: "multi", 4: "addressSearch", 5: "input",
    6: "chips", 7: "input", 8: "chipsInput", 9: "chips", 10: "chips",
    11: "multi", 12: "chipsInput", 13: "multi", 14: "textarea"
  })[s];

  const getStepKey = (s) => ({
    1: "jobType", 2: "title", 3: "workType", 4: "address", 5: "addressDetail",
    6: "payType", 7: "payAmount", 8: "workHours", 9: "workDays", 10: "korean",
    11: "visa", 12: "headcount", 13: "benefits", 14: "description"
  })[s];

  const getStepOptions = (s) => ({
    1: ["카페", "식당", "편의점", "제조/생산", "학원/과외", "번역/통역", "호텔/서비스", "농업", "어업", "건설", "이벤트직", "물류/배달", "기타"],
    3: ["정기 알바", "단기 알바", "주말 알바", "야간 알바", "일용직 알바", "재택/온라인"],
    6: ["시급", "일급", "월급"],
    8: ["오전 (06~12시)", "오후 (12~18시)", "저녁 (18~24시)", "야간 (24~06시)", "시간 협의"],
    9: ["평일 (월~금)", "주말 (토~일)", "요일 협의", "매일", "교대근무"],
    10: ["불필요 (못해도 OK)", "초급 (기본 인사)", "중급 (업무 지시 이해)", "고급 (능통)"],
    11: ["D-2 유학", "E-9 비전문취업", "F-2 거주", "F-4 재외동포", "F-6 결혼이민", "H-2 방문취업", "비자 무관"],
    12: ["1명", "2명", "3명", "5명", "10명 이상"],
    13: ["식사 제공", "교통비 지원", "기숙사 제공", "4대보험", "유니폼 제공", "음료 무제한", "직원 할인", "인센티브", "없음"]
  })[s] || [];

  const getBotMessage = (s, a) => {
    const p = JOB_PRESETS[a.jobType] || JOB_PRESETS["기타"];
    const jt = a.jobType || "";
    if (s === 1) return t("postJob.botStep1");
    if (s === 2) return t("postJob.botStep2", { ex: p.title });
    if (s === 3) return t("postJob.botStep3", { jt, hint: p.workTypeHint });
    if (s === 4) return t("postJob.botStep4", { ex: p.addrEx });
    if (s === 5) return t("postJob.botStep5", { ex: p.addrDEx || t("postJob.phAddrDetailEx") });
    if (s === 6) return t("postJob.botStep6", { jt, pt: p.payType });
    if (s === 7) {
      const mkt = getMarketPay(a.jobType, a.address);
      let guide = "";
      if (mkt) {
        guide = mkt.region === "전국"
          ? t("postJob.guideHeaderNation", { jt })
          : t("postJob.guideHeaderRegion", { region: mkt.region, jt });
        guide += t("postJob.guideAvg", { type: mkt.type, avg: mkt.avg.toLocaleString() });
        guide += t("postJob.guideMedian", { type: mkt.type, median: mkt.median.toLocaleString() });
        guide += t("postJob.guideRange", { min: mkt.min.toLocaleString(), max: mkt.max.toLocaleString() });
        guide += t("postJob.guideCount", { count: mkt.count });
        if (mkt.note) guide += t("postJob.guideNote", { note: mkt.note });
      }
      return t("postJob.botStep7", { pt: a.payType || p.payType, guide });
    }
    if (s === 8) return t("postJob.botStep8", { jt, ex: p.hoursEx });
    if (s === 9) return t("postJob.botStep9", { jt, hint: p.daysHint });
    if (s === 10) return t("postJob.botStep10", { jt, hint: p.koreanHint });
    if (s === 11) return t("postJob.botStep11");
    if (s === 12) return t("postJob.botStep12", { jt, hint: p.headHint });
    if (s === 13) return p.beneHint ? t("postJob.botStep13", { jt, hint: p.beneHint }) : t("postJob.botStep13NoHint");
    if (s === 14) return t("postJob.botStep14", { jt, ex: p.descEx });
    return "";
  };

  const getPlaceholder = (s, a) => {
    const p = JOB_PRESETS[a.jobType] || JOB_PRESETS["기타"];
    if (s === 2) return p.title;
    if (s === 4) return p.addrEx;
    if (s === 5) return p.addrDEx || t("postJob.phAddrDetailEx");
    if (s === 7) {
      const mkt = getMarketPay(a.jobType, a.address);
      return mkt ? String(mkt.median) : p.payEx;
    }
    if (s === 8) return p.hoursEx;
    if (s === 12) return t("postJob.phHeadcount");
    if (s === 14) return t("postJob.phDescription");
    return t("postJob.sendPlaceholder");
  };

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    setTyping(true);
    setTimeout(() => {
      setMessages([{ from: "bot", text: t("postJob.greeting") }]);
      setTyping(false);
      setTimeout(() => {
        setTyping(true);
        setTimeout(() => {
          setMessages((p) => [...p, { from: "bot", text: getBotMessage(1, {}) }]);
          setTyping(false);
          setStep(1);
        }, 600);
      }, 900);
    }, 400);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const askNext = (newStep, newAnswers) => {
    if (newStep > TOTAL_STEPS) {
      setTyping(true);
      setTimeout(() => {
        setMessages((m) => [...m, { from: "bot", text: t("postJob.completedNotice"), summary: newAnswers }]);
        setTyping(false);
      }, 800);
      return;
    }

    if (newStep === 2 && newAnswers.jobType) {
      const p = JOB_PRESETS[newAnswers.jobType] || JOB_PRESETS["기타"];
      setTyping(true);
      setTimeout(() => {
        setMessages((m) => [...m, { from: "bot", text: p.intro }]);
        setTyping(false);
        setTimeout(() => {
          setTyping(true);
          setTimeout(() => {
            setMessages((m) => [...m, { from: "bot", text: getBotMessage(2, newAnswers) }]);
            setTyping(false);
          }, 600);
        }, 900);
      }, 500);
      return;
    }

    setTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, { from: "bot", text: getBotMessage(newStep, newAnswers) }]);
      setTyping(false);
    }, 600);
  };

  const submitAnswer = (value) => {
    const key = getStepKey(step);
    if (!key) return;
    setMessages((m) => [...m, { from: "user", text: value }]);
    const newAnswers = { ...answers, [key]: value };
    setAnswers(newAnswers);
    const newStep = step + 1;
    setStep(newStep);
    askNext(newStep, newAnswers);
  };

  const handleInputSend = () => {
    if (!input.trim()) return;
    submitAnswer(input.trim());
    setInput("");
  };

  const toggleMulti = (v) => setMultiSel((p) => (p.indexOf(v) >= 0 ? p.filter((x) => x !== v) : [...p, v]));
  const confirmMulti = () => {
    if (multiSel.length === 0) return;
    submitAnswer(multiSel.join(", "));
    setMultiSel([]);
  };

  const handlePost = async (overrideAnswers) => {
    const a = overrideAnswers || answers;
    const user = await getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // 주소를 좌표로 변환 (Kakao 지오코딩)
    let geoData = {};
    if (a.address) {
      try {
        const geoRes = await fetch("/api/geocode/address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: a.address }),
        });
        const geo = await geoRes.json();
        if (geo.ok) {
          geoData = {
            latitude: geo.latitude,
            longitude: geo.longitude,
            address_road: geo.address_road,
            address_jibun: geo.address_jibun,
            sido: geo.sido,
            sigungu: geo.sigungu,
            dong: geo.dong,
          };
        }
      } catch (e) {
        console.error("[post-job] geocoding failed:", e);
      }
    }

    // work_type/benefits는 DB가 text 컬럼 → 배열이면 쉼표 문자열로 (중첩 JSON 깨짐 방지)
    const toStr = (x) => (Array.isArray(x) ? x.filter(Boolean).join(", ") : (x || ""));
    const benefitsArr = Array.isArray(a.benefits)
      ? a.benefits
      : String(a.benefits || "").split(",").map((s) => s.trim()).filter(Boolean);

    const jobData = {
      employer_id: user.id,
      title: a.title,
      job_type: a.jobType,
      work_type: toStr(a.workType),
      pay_type: a.payType,
      pay_amount: Number(String(a.payAmount || "0").replace(/[^0-9]/g, "")),
      address: a.address,
      address_detail: a.addressDetail,
      work_hours: a.workHours,
      work_days: a.workDays,
      korean_level: a.korean,
      visa_types: typeof a.visa === "string"
        ? a.visa.split(",").map(s => s.trim()).filter(Boolean)
        : (Array.isArray(a.visa) ? a.visa : []),
      headcount: a.headcount,
      benefits: benefitsArr.join(", "),
      description: a.description,
      ...geoData,
      provides_housing: benefitsArr.some((b) => b.includes("숙식") || b.includes("기숙사")),
      provides_shuttle: benefitsArr.some((b) => b.includes("통근") || b.includes("셔틀")),
    };
    // ⚠️ 에러를 반드시 확인 — 실패해도 성공화면(setPosted)으로 넘어가던 버그 수정
    const { data: newJob, error: postErr } = await createJob(jobData);
    if (postErr || !newJob) {
      const msg = postErr?.message || t("postJob.errSubmit", null, "공고 등록에 실패했어요. 입력값을 확인하고 다시 시도해 주세요.");
      setWebErr(msg);
      if (typeof window !== "undefined") window.alert(msg);
      return; // 실패 시 여기서 중단 (성공화면 표시 안 함)
    }

    // 푸시 알림 (fire-and-forget)
    if (newJob?.id) {
      fetch("/api/notifications/notify-nearby-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: newJob.id }),
      }).catch((e) => console.error("[post-job] push notify failed:", e));

      // 신규 공고 이메일 알림: 동의한 알바생 + 사장님 확인 메일 (fire-and-forget)
      fetch("/api/jobs/notify-new-job-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: newJob.id }),
      }).catch((e) => console.error("[post-job] email notify failed:", e));
    }

    setPosted(true);
  };

  // 웹 폼 제출: 동일한 handlePost 재사용
  const submitWebForm = async () => {
    if (!form.jobType) return setWebErr(t("postJob.errJobType"));
    if (!form.title.trim()) return setWebErr(t("postJob.errTitle"));
    if (form.workType.length === 0) return setWebErr(t("postJob.errWorkType"));
    if (!form.address) return setWebErr(t("postJob.errAddress"));
    if (!form.payType) return setWebErr(t("postJob.errPayType"));
    if (!String(form.payAmount).trim()) return setWebErr(t("postJob.errPayAmount"));
    if (form.visa.length === 0) return setWebErr(t("postJob.errVisa"));
    setWebErr("");
    setWebBusy(true);
    try {
      await handlePost({
        jobType: form.jobType,
        title: form.title.trim(),
        workType: form.workType.join(", "),
        address: form.address,
        addressDetail: form.addressDetail,
        payType: form.payType,
        payAmount: form.payAmount,
        workHours: form.workHours,
        workDays: form.workDays,
        korean: form.korean,
        visa: form.visa.join(", "),
        headcount: form.headcount,
        benefits: form.benefits.join(", "),
        description: form.description,
      });
    } finally {
      setWebBusy(false);
    }
  };

  const resetChat = () => {
    setMessages([]);
    setStep(0);
    setAnswers({});
    setMultiSel([]);
    setInput("");
    initRef.current = false;
    setTimeout(() => {
      initRef.current = true;
      setTyping(true);
      setTimeout(() => {
        setMessages([{ from: "bot", text: t("postJob.greeting") }]);
        setTyping(false);
        setTimeout(() => {
          setTyping(true);
          setTimeout(() => {
            setMessages((p) => [...p, { from: "bot", text: getBotMessage(1, {}) }]);
            setTyping(false);
            setStep(1);
          }, 600);
        }, 900);
      }, 400);
    }, 50);
  };

  const currentType = getStepType(step);
  const currentOptions = getStepOptions(step);
  const currentPlaceholder = getPlaceholder(step, answers);

  // ── 사업자 인증 게이트: 미인증 사장님은 공고 작성 전 인증 먼저 ──
  if (bizGate.loading) {
    return <div style={{ padding: "60px 20px", textAlign: "center", color: T.ink3 }}>{t("common.pleaseWait")}</div>;
  }
  if (!bizGate.verified) {
    if (isDesktop) {
      // 위 useEffect가 /my/jobs?verify=1 로 리다이렉트하는 동안 잠시 표시
      return <div style={{ padding: "60px 20px", textAlign: "center", color: T.ink3 }}>{t("common.pleaseWait")}</div>;
    }
    return (
      <div style={{ maxWidth: 460, margin: "0 auto", padding: "32px 20px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.ink, letterSpacing: "-0.02em", marginBottom: 8 }}>
          {t("postJob.verifyGateTitle", null, "사업자 인증이 필요해요")}
        </h1>
        <p style={{ fontSize: 14, color: T.ink2, lineHeight: 1.6, marginBottom: 20 }}>
          {t("postJob.verifyGateDesc", null, "최초 1회만 사업자 인증을 하면 공고를 등록할 수 있어요.")}
        </p>
        <BusinessVerify
          userId={bizGate.userId}
          onVerified={() => setBizGate((g) => ({ ...g, verified: true }))}
        />
      </div>
    );
  }

  // 등록 완료 화면 — Step 3-A Button (primaryDark = 사장님 페이지 일관성)
  if (posted) {
    return (
      <div style={{ padding: "50px 20px", maxWidth: 440, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: T.navy, marginBottom: 8 }}>
          {t("postJob.postedTitle")}
        </h2>
        <p style={{ color: T.ink3, fontSize: 14, marginBottom: 24 }}>
          {t("postJob.postedDesc")}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="primaryDark" fullWidth onClick={() => router.push("/my/jobs")}>
            {t("postJob.viewMyJobs")}
          </Button>
          <Button variant="secondary" fullWidth onClick={() => {
            setPosted(false);
            resetChat();
            // 데스크탑 폼 상태도 초기화 (이전 입력/제출 상태가 남지 않도록)
            setForm({ jobType: "", title: "", workType: [], address: "", addressDetail: "", payType: "시급", payAmount: "", workHours: "", workDays: "", korean: "", visa: [], headcount: "", benefits: [], description: "" });
            setWebErr("");
            setWebBusy(false);
          }}>
            {t("postJob.postAnother")}
          </Button>
        </div>
      </div>
    );
  }

  // ───────── 데스크탑(웹) 전용: 카톡 채팅형 대신 일반 폼 UI ─────────
  if (isDesktop) {
    const SEL = T.accent;
    const chip = (on) => ({ padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${on ? SEL : T.border}`, background: on ? SEL : "#fff", color: on ? "#fff" : T.ink2, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" });
    const lab = { display: "block", fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 9 };
    const inp = { width: "100%", padding: "11px 13px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
    const field = { marginBottom: 22 };
    const rowS = { display: "flex", gap: 8, flexWrap: "wrap" };
    const req = <span style={{ color: T.accent }}>*</span>;
    // 다국어 문구의 {req} 자리에 빨간 * 를 JSX로 렌더 (문자열 보간 시 [object Object] 방지)
    const withReq = (key) => {
      const parts = String(t(`postJob.${key}`)).split("{req}");
      return parts.length > 1 ? <>{parts[0]}{req}{parts[1]}</> : <>{parts[0]}</>;
    };
    const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const toggle = (k, v) => setForm((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));
    const preset = JOB_PRESETS[form.jobType] || JOB_PRESETS["기타"];

    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 28px 80px" }}>
        <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>{t("postJob.webEyebrow")}</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: T.ink, letterSpacing: "-0.025em", marginBottom: 6, lineHeight: 1.2 }}>{t("postJob.title")}</h1>
        <p style={{ color: T.ink2, fontSize: 14, marginBottom: 30, lineHeight: 1.6 }}>{withReq("webIntro")}</p>

        <div style={field}>
          <label style={lab}>{withReq("labelJobType")}</label>
          <div style={rowS}>{getStepOptions(1).map((o) => <button key={o} type="button" onClick={() => setF("jobType", o)} style={chip(form.jobType === o)}>{o}</button>)}</div>
        </div>

        <div style={field}>
          <label style={lab}>{withReq("labelTitle")}</label>
          <input value={form.title} onChange={(e) => setF("title", e.target.value)} placeholder={preset.title} style={inp} />
        </div>

        <div style={field}>
          <label style={lab}>{withReq("labelWorkType")} <span style={{ color: T.ink3, fontWeight: 500 }}>{t("postJob.multipleAllowed")}</span></label>
          <div style={rowS}>{getStepOptions(3).map((o) => <button key={o} type="button" onClick={() => toggle("workType", o)} style={chip(form.workType.includes(o))}>{o}</button>)}</div>
        </div>

        <div style={field}>
          <label style={lab}>{withReq("labelAddress")}</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input value={form.address} readOnly placeholder={t("postJob.phAddressSearch")} style={{ ...inp, flex: 1, background: T.cream }} />
            <button type="button" onClick={() => setWebAddrOpen(true)} style={{ padding: "11px 16px", borderRadius: 8, background: "#FEE500", color: "#3C1E1E", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{t("postJob.webAddrSearchBtn")}</button>
          </div>
          <input value={form.addressDetail} onChange={(e) => setF("addressDetail", e.target.value)} placeholder={t("postJob.phAddressDetail")} style={inp} />
        </div>

        <div style={field}>
          <label style={lab}>{withReq("labelPay")}</label>
          <div style={{ ...rowS, marginBottom: 8 }}>{getStepOptions(6).map((o) => <button key={o} type="button" onClick={() => setF("payType", o)} style={chip(form.payType === o)}>{o}</button>)}</div>
          <input value={form.payAmount} onChange={(e) => setF("payAmount", e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder={t("postJob.phPayAmount")} style={inp} />
          <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 6 }}>{t("postJob.minWage2026")}</div>
        </div>

        <div style={field}>
          <label style={lab}>{t("postJob.labelWorkHours")}</label>
          <div style={{ ...rowS, marginBottom: 8 }}>{getStepOptions(8).map((o) => <button key={o} type="button" onClick={() => setF("workHours", o)} style={chip(form.workHours === o)}>{o}</button>)}</div>
          <input value={form.workHours} onChange={(e) => setF("workHours", e.target.value)} placeholder={t("postJob.phWorkHours")} style={inp} />
        </div>

        <div style={field}>
          <label style={lab}>{t("postJob.labelWorkDays")}</label>
          <div style={rowS}>{getStepOptions(9).map((o) => <button key={o} type="button" onClick={() => setF("workDays", o)} style={chip(form.workDays === o)}>{o}</button>)}</div>
        </div>

        <div style={field}>
          <label style={lab}>{t("postJob.labelKorean")}</label>
          <div style={rowS}>{getStepOptions(10).map((o) => <button key={o} type="button" onClick={() => setF("korean", o)} style={chip(form.korean === o)}>{o}</button>)}</div>
        </div>

        <div style={field}>
          <label style={lab}>{withReq("labelVisa")} <span style={{ color: T.ink3, fontWeight: 500 }}>{t("postJob.multipleAllowed")}</span></label>
          <div style={rowS}>{getStepOptions(11).map((o) => <button key={o} type="button" onClick={() => toggle("visa", o)} style={chip(form.visa.includes(o))}>{o}</button>)}</div>
        </div>

        <div style={field}>
          <label style={lab}>{t("postJob.labelHeadcount")}</label>
          <div style={{ ...rowS, marginBottom: 8 }}>{getStepOptions(12).map((o) => <button key={o} type="button" onClick={() => setF("headcount", o)} style={chip(form.headcount === o)}>{o}</button>)}</div>
          <input value={form.headcount} onChange={(e) => setF("headcount", e.target.value)} placeholder={t("postJob.phHeadcountDirect")} style={inp} />
        </div>

        <div style={field}>
          <label style={lab}>{t("postJob.labelBenefits")} <span style={{ color: T.ink3, fontWeight: 500 }}>{t("postJob.multipleAllowed")}</span></label>
          <div style={rowS}>{getStepOptions(13).map((o) => <button key={o} type="button" onClick={() => toggle("benefits", o)} style={chip(form.benefits.includes(o))}>{o}</button>)}</div>
        </div>

        <div style={field}>
          <label style={lab}>{t("postJob.labelDescription")}</label>
          <textarea value={form.description} onChange={(e) => setF("description", e.target.value)} placeholder={t("postJob.phDescriptionWeb")} style={{ ...inp, minHeight: 110, resize: "vertical" }} />
        </div>

        {webErr && <div style={{ color: "#DC2626", fontSize: 13, marginBottom: 14, fontWeight: 600 }}>{webErr}</div>}

        <Button variant="primaryDark" fullWidth onClick={submitWebForm} disabled={webBusy}>
          {webBusy ? t("postJob.posting") : t("postJob.submitBtn")}
        </Button>

        <AddressSearchModal
          open={webAddrOpen}
          onClose={() => setWebAddrOpen(false)}
          onSelect={(addr) => { setForm((f) => ({ ...f, address: addr })); setWebAddrOpen(false); }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)", maxWidth: 540, margin: "0 auto", position: "relative" }}>
      {/* 헤더 — KIcon variant="kakao" */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, background: "#fff", display: "flex", alignItems: "center", gap: 12 }}>
        <KIcon variant="kakao" size="md" style={{ width: 40, height: 40, fontSize: 20, borderRadius: 12 }} />
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: T.navy }}>{t("postJob.headerName")}</div>
          <div style={{ fontSize: 11, color: T.ink3 }}>{t("postJob.headerChannel")} · {step > 0 ? `${t("postJob.progress")} ${step}/${TOTAL_STEPS}` : t("postJob.start")}</div>
        </div>
      </div>

      {/* 메시지 영역 (카톡 채팅 배경 #B2C7D9 보존) */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", background: "#B2C7D9" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <span style={{ background: "rgba(0,0,0,0.15)", color: "#fff", padding: "4px 14px", borderRadius: 20, fontSize: 11 }}>{t("postJob.today")}</span>
        </div>

        {messages.map((m, i) => {
          if (m.summary) {
            const a = m.summary;
            const summaryRows = [
              [t("postJob.rowJobType"), a.jobType],
              [t("postJob.rowWorkType"), a.workType],
              [t("postJob.rowPay"), a.payAmount ? t("postJob.payAmountFmt", { pt: a.payType, amount: Number(String(a.payAmount).replace(/[^0-9]/g, "")).toLocaleString() }) : null],
              [t("postJob.rowLocation"), a.address ? `${a.address}${a.addressDetail && a.addressDetail !== "없음" ? " " + a.addressDetail : ""}` : null],
              [t("postJob.rowWorkHours"), a.workHours],
              [t("postJob.rowWorkDays"), a.workDays],
              [t("postJob.rowKorean"), a.korean],
              [t("postJob.rowVisa"), a.visa],
              [t("postJob.rowHeadcount"), a.headcount],
              [t("postJob.rowBenefits"), a.benefits]
            ].filter(([, v]) => v);

            return (
              <div key={i}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <KIcon variant="kakao" size="sm" style={{ width: 32, height: 32, fontSize: 14, borderRadius: 10 }} />
                  <div style={{ fontSize: 13, color: T.navy, lineHeight: 1.6, background: "#fff", padding: "10px 14px", borderRadius: "4px 14px 14px 14px", maxWidth: "85%" }}>{m.text}</div>
                </div>
                <div style={{ marginLeft: 40, background: "#fff", borderRadius: 16, overflow: "hidden", marginBottom: 10, border: `1px solid ${T.border}` }}>
                  {/* 카드 헤더: 코랄 그라데이션 (기쁨 강조 — 그대로 유지) */}
                  <div style={{ background: `linear-gradient(135deg,${T.coral},#FF8A7A)`, padding: "16px 18px", color: "#fff" }}>
                    <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>{t("postJob.summaryBrand")}</div>
                    <div style={{ fontSize: 17, fontWeight: 800 }}>{a.title || t("postJob.summaryDefaultTitle")}</div>
                  </div>
                  <div style={{ padding: "16px 18px" }}>
                    {summaryRows.map((row) => (
                      <div key={row[0]} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.cream}`, fontSize: 12 }}>
                        <span style={{ color: T.ink3, flexShrink: 0 }}>{row[0]}</span>
                        <span style={{ fontWeight: 600, color: T.navy, textAlign: "right", maxWidth: "60%" }}>{row[1]}</span>
                      </div>
                    ))}
                    {a.description && a.description !== "없음" && (
                      <div style={{ marginTop: 10, fontSize: 12, color: T.ink2, lineHeight: 1.6, background: T.cream, padding: "10px 12px", borderRadius: 8, whiteSpace: "pre-wrap" }}>{a.description}</div>
                    )}
                  </div>
                  {/* 등록 버튼 — coralDark (사장님 페이지) */}
                  <div style={{ padding: "0 18px 16px", display: "flex", gap: 8 }}>
                    <button onClick={handlePost} style={{ flex: 1, padding: "12px", borderRadius: 10, background: T.coralDark, color: "#fff", border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{t("postJob.submitBtn")}</button>
                    <button onClick={resetChat} style={{ flex: 1, padding: "12px", borderRadius: 10, background: T.cream, color: T.ink2, border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{t("postJob.resetBtn")}</button>
                  </div>
                </div>
              </div>
            );
          }

          const isUser = m.from === "user";
          return (
            <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", gap: 8, marginBottom: 10 }}>
              {!isUser && <KIcon variant="kakao" size="sm" style={{ width: 32, height: 32, fontSize: 14, borderRadius: 10 }} />}
              <div style={{ maxWidth: "78%", padding: "10px 14px", borderRadius: isUser ? "14px 4px 14px 14px" : "4px 14px 14px 14px", background: isUser ? "#FFEB33" : "#fff", color: T.navy, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.text}</div>
            </div>
          );
        })}

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

      {/* 입력 영역 - chips */}
      {!typing && currentType === "chips" && (
        <div style={{ padding: "10px 16px", background: "#fff", borderTop: `1px solid ${T.border}`, display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 140, overflowY: "auto" }}>
          {currentOptions.map((c) => (
            <button key={c} onClick={() => submitAnswer(c)} style={{ padding: "8px 16px", borderRadius: 20, border: `1.5px solid ${T.border}`, background: "#fff", fontSize: 13, fontWeight: 600, color: T.navy, cursor: "pointer", fontFamily: "inherit" }}>{c}</button>
          ))}
        </div>
      )}

      {/* 입력 영역 - chipsInput */}
      {!typing && currentType === "chipsInput" && (
        <div style={{ background: "#fff", borderTop: `1px solid ${T.border}` }}>
          <div style={{ padding: "10px 16px 6px", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {currentOptions.map((c) => (
              <button key={c} onClick={() => submitAnswer(c)} style={{ padding: "8px 16px", borderRadius: 20, border: `1.5px solid ${T.border}`, background: "#fff", fontSize: 13, fontWeight: 600, color: T.navy, cursor: "pointer", fontFamily: "inherit" }}>{c}</button>
            ))}
          </div>
          <div style={{ padding: "4px 16px 10px", display: "flex", gap: 8 }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleInputSend()} placeholder={currentPlaceholder} style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: `2px solid ${T.border}`, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
            {/* send 버튼 — coralDark (사장님 페이지) */}
            <button onClick={handleInputSend} disabled={!input.trim()} style={{ padding: "10px 16px", borderRadius: 12, background: input.trim() ? T.coralDark : T.border, color: input.trim() ? "#fff" : T.ink3, border: "none", fontWeight: 700, fontSize: 15, cursor: input.trim() ? "pointer" : "default" }}>↑</button>
          </div>
        </div>
      )}

      {/* 입력 영역 - multi (다중 선택) */}
      {!typing && currentType === "multi" && (
        <div style={{ padding: "10px 16px", background: "#fff", borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8, maxHeight: 100, overflowY: "auto" }}>
            {currentOptions.map((c) => {
              const sel = multiSel.indexOf(c) >= 0;
              return (
                <button key={c} onClick={() => toggleMulti(c)} style={{ padding: "8px 16px", borderRadius: 20, border: `1.5px solid ${sel ? T.mint : T.border}`, background: sel ? T.mintL : "#fff", fontSize: 13, fontWeight: 600, color: sel ? "#059669" : T.navy, cursor: "pointer", fontFamily: "inherit" }}>{sel ? "✓ " : ""}{c}</button>
              );
            })}
          </div>
          <button onClick={confirmMulti} disabled={multiSel.length === 0} style={{ width: "100%", padding: "10px", borderRadius: 10, background: multiSel.length > 0 ? T.mint : T.border, color: multiSel.length > 0 ? "#fff" : T.ink3, border: "none", fontWeight: 700, fontSize: 13, cursor: multiSel.length > 0 ? "pointer" : "default", fontFamily: "inherit" }}>
            {multiSel.length > 0 ? t("postJob.multiDone", { n: multiSel.length }) : t("postJob.multiSelectPrompt")}
          </button>
        </div>
      )}

      {/* 입력 영역 - addressSearch */}
      {!typing && currentType === "addressSearch" && (
        <div style={{ background: "#fff", borderTop: `1px solid ${T.border}` }}>
          <div style={{ padding: "10px 16px 6px" }}>
            <button onClick={() => setAddrModal(true)} style={{ width: "100%", padding: 12, borderRadius: 12, background: "#FEE500", color: "#3C1E1E", border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {t("postJob.kakaoAddrSearch")}
            </button>
          </div>
          <div style={{ padding: "4px 16px 10px", display: "flex", gap: 8 }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleInputSend()} placeholder={t("postJob.phAddrDirect")} style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: `2px solid ${T.border}`, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
            <button onClick={handleInputSend} disabled={!input.trim()} style={{ padding: "10px 16px", borderRadius: 12, background: input.trim() ? T.coralDark : T.border, color: input.trim() ? "#fff" : T.ink3, border: "none", fontWeight: 700, fontSize: 15, cursor: input.trim() ? "pointer" : "default" }}>↑</button>
          </div>
        </div>
      )}

      {/* 입력 영역 - input / textarea */}
      {!typing && (currentType === "input" || currentType === "textarea") && (
        <div style={{ padding: "10px 16px", background: "#fff", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8 }}>
          {currentType === "textarea"
            ? <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={currentPlaceholder} style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: `2px solid ${T.border}`, fontSize: 14, fontFamily: "inherit", outline: "none", minHeight: 60, resize: "none" }} />
            : <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleInputSend()} placeholder={currentPlaceholder} style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: `2px solid ${T.border}`, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
          }
          <button onClick={handleInputSend} disabled={!input.trim()} style={{ padding: "10px 16px", borderRadius: 12, background: input.trim() ? T.coralDark : T.border, color: input.trim() ? "#fff" : T.ink3, border: "none", fontWeight: 700, fontSize: 15, cursor: input.trim() ? "pointer" : "default" }}>↑</button>
        </div>
      )}

      <AddressSearchModal
        open={addrModal}
        onClose={() => setAddrModal(false)}
        onSelect={(addr) => {
          setAddrModal(false);
          submitAnswer(addr);
        }}
      />
    </div>
  );
}
