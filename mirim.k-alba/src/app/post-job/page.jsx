"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { Btn } from "@/components/UI";
import { AddressSearchModal } from "@/components/AddressSearch";
import { JOB_PRESETS, getMarketPay } from "@/data/marketData";
import { createJob, getCurrentUser } from "@/lib/supabase";

export default function PostJobPage() {
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
    if (s === 1) return "어떤 업종의 알바를 구하시나요?";
    if (s === 2) return `공고 제목을 입력해 주세요!\n\n💡 예시: "${p.title}"`;
    if (s === 3) return `근무형태를 선택해 주세요. (여러 개 가능)\n\n💡 ${jt} 업종은 보통 "${p.workTypeHint}" 이 많아요.`;
    if (s === 4) return `근무지 주소를 입력해 주세요.\n\n💡 예시: "${p.addrEx}"\n\n🔍 아래 [주소 검색] 버튼을 눌러 쉽게 찾을 수 있어요!`;
    if (s === 5) return `상세 주소를 입력해 주세요.\n(건물명, 층수, 호수 등)\n\n💡 예시: "${p.addrDEx || "3층, OO빌딩"}"\n(없으면 "없음" 입력)`;
    if (s === 6) return `급여 형태를 선택해 주세요.\n\n💡 ${jt} 업종은 "${p.payType}" 지급이 일반적이에요.`;
    if (s === 7) {
      const mkt = getMarketPay(a.jobType, a.address);
      let guide = "";
      if (mkt) {
        guide = `💡 ${mkt.region === "전국" ? jt + " 전국 평균" : mkt.region + " " + jt} 현재 공고 시세:\n`;
        guide += `▫ 평균: ${mkt.type} ${mkt.avg.toLocaleString()}원\n`;
        guide += `▫ 중앙값: ${mkt.type} ${mkt.median.toLocaleString()}원 (가장 많이 주는 금액)\n`;
        guide += `▫ 범위: ${mkt.min.toLocaleString()}~${mkt.max.toLocaleString()}원\n`;
        guide += `📊 최근 공고 ${mkt.count}건 분석`;
        if (mkt.note) guide += `\n📌 ${mkt.note}`;
      }
      return `${a.payType || p.payType} 금액을 입력해 주세요. (숫자만)\n\n${guide}\n\n⚠️ 최저시급: ₩10,030`;
    }
    if (s === 8) return `근무 시간대를 알려주세요.\n\n💡 ${jt} 추천: "${p.hoursEx}"`;
    if (s === 9) return `근무 요일을 선택해 주세요.\n\n💡 ${jt} 업종은 "${p.daysHint}" 이 많아요.`;
    if (s === 10) return `필요한 한국어 수준은?\n\n💡 ${jt} 업종은 "${p.koreanHint}" 정도면 충분해요.`;
    if (s === 11) return "지원 가능한 비자를 선택해 주세요. (여러 개 가능)";
    if (s === 12) return `모집 인원은 몇 명인가요?\n\n💡 ${jt} 공고는 보통 ${p.headHint} 모집이 많아요.`;
    if (s === 13) return p.beneHint ? `제공하는 복리후생이 있나요? (여러 개 가능)\n\n💡 ${jt} 업종은 보통 "${p.beneHint}" 을 제공해요.` : "제공하는 복리후생이 있나요? (여러 개 가능)";
    if (s === 14) return `마지막이에요! 상세 업무 내용이나 우대 조건을 입력해 주세요.\n\n💡 ${jt} 예시:\n"${p.descEx}"\n\n(건너뛰려면 '없음' 입력)`;
    return "";
  };

  const getPlaceholder = (s, a) => {
    const p = JOB_PRESETS[a.jobType] || JOB_PRESETS["기타"];
    if (s === 2) return p.title;
    if (s === 4) return p.addrEx;
    if (s === 5) return p.addrDEx || "예: 3층, OO빌딩";
    if (s === 7) {
      const mkt = getMarketPay(a.jobType, a.address);
      return mkt ? String(mkt.median) : p.payEx;
    }
    if (s === 8) return p.hoursEx;
    if (s === 12) return "직접 입력";
    if (s === 14) return "업무 내용, 우대 조건 등";
    return "입력하세요...";
  };

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    setTyping(true);
    setTimeout(() => {
      setMessages([{ from: "bot", text: "안녕하세요 사장님! 😊\nK-ALBA 채용공고 도우미입니다.\n대화하듯 답변하시면 채용공고가 자동으로 만들어져요!" }]);
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
        setMessages((m) => [...m, { from: "bot", text: "채용공고가 완성되었습니다! 아래 내용을 확인해 주세요. 👇", summary: newAnswers }]);
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

  const handlePost = async () => {
    const a = answers;
    const user = await getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const jobData = {
      employer_id: user.id,
      title: a.title,
      job_type: a.jobType,
      work_type: a.workType,
      pay_type: a.payType,
      pay_amount: Number(String(a.payAmount || "0").replace(/[^0-9]/g, "")),
      address: a.address,
      address_detail: a.addressDetail,
      work_hours: a.workHours,
      work_days: a.workDays,
      korean_level: a.korean,
      visa_types: a.visa,
      headcount: a.headcount,
      benefits: a.benefits,
      description: a.description,
    };
    await createJob(jobData);
    setPosted(true);
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
        setMessages([{ from: "bot", text: "안녕하세요 사장님! 😊\nK-ALBA 채용공고 도우미입니다.\n대화하듯 답변하시면 채용공고가 자동으로 만들어져요!" }]);
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

  if (posted) {
    return (
      <div style={{ padding: "50px 20px", maxWidth: 440, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: T.navy, marginBottom: 8 }}>공고가 등록되었습니다!</h2>
        <p style={{ color: T.g500, fontSize: 14, marginBottom: 24 }}>외국인 구직자들에게 자동으로 매칭됩니다</p>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn primary full onClick={() => router.push("/my-jobs")}>내 공고 확인</Btn>
          <Btn full onClick={() => { setPosted(false); resetChat(); }}>추가 등록</Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)", maxWidth: 540, margin: "0 auto", position: "relative" }}>
      {/* 헤더 */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.g200}`, background: "#fff", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "#FEE500", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💬</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: T.navy }}>K-ALBA 채용 도우미</div>
          <div style={{ fontSize: 11, color: T.g500 }}>카카오톡 챗봇 · {step > 0 ? `진행 ${step}/${TOTAL_STEPS}` : "시작"}</div>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", background: "#B2C7D9" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <span style={{ background: "rgba(0,0,0,0.15)", color: "#fff", padding: "4px 14px", borderRadius: 20, fontSize: 11 }}>오늘</span>
        </div>

        {messages.map((m, i) => {
          if (m.summary) {
            const a = m.summary;
            const summaryRows = [
              ["업종", a.jobType],
              ["근무형태", a.workType],
              ["급여", a.payAmount ? `${a.payType} ${Number(String(a.payAmount).replace(/[^0-9]/g, "")).toLocaleString()}원` : null],
              ["근무지", a.address ? `${a.address}${a.addressDetail && a.addressDetail !== "없음" ? " " + a.addressDetail : ""}` : null],
              ["근무시간", a.workHours],
              ["근무요일", a.workDays],
              ["한국어", a.korean],
              ["비자", a.visa],
              ["모집인원", a.headcount],
              ["복리후생", a.benefits]
            ].filter(([, v]) => v);

            return (
              <div key={i}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "#FEE500", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>K</div>
                  <div style={{ fontSize: 13, color: T.navy, lineHeight: 1.6, background: "#fff", padding: "10px 14px", borderRadius: "4px 14px 14px 14px", maxWidth: "85%" }}>{m.text}</div>
                </div>
                <div style={{ marginLeft: 40, background: "#fff", borderRadius: 16, overflow: "hidden", marginBottom: 10, border: `1px solid ${T.g200}` }}>
                  <div style={{ background: `linear-gradient(135deg,${T.coral},#FF8A7A)`, padding: "16px 18px", color: "#fff" }}>
                    <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>K-ALBA 채용공고</div>
                    <div style={{ fontSize: 17, fontWeight: 800 }}>{a.title || "채용공고"}</div>
                  </div>
                  <div style={{ padding: "16px 18px" }}>
                    {summaryRows.map((row) => (
                      <div key={row[0]} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.g100}`, fontSize: 12 }}>
                        <span style={{ color: T.g500, flexShrink: 0 }}>{row[0]}</span>
                        <span style={{ fontWeight: 600, color: T.navy, textAlign: "right", maxWidth: "60%" }}>{row[1]}</span>
                      </div>
                    ))}
                    {a.description && a.description !== "없음" && (
                      <div style={{ marginTop: 10, fontSize: 12, color: T.g700, lineHeight: 1.6, background: T.g100, padding: "10px 12px", borderRadius: 8, whiteSpace: "pre-wrap" }}>{a.description}</div>
                    )}
                  </div>
                  <div style={{ padding: "0 18px 16px", display: "flex", gap: 8 }}>
                    <button onClick={handlePost} style={{ flex: 1, padding: "12px", borderRadius: 10, background: T.coral, color: "#fff", border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>공고 등록하기</button>
                    <button onClick={resetChat} style={{ flex: 1, padding: "12px", borderRadius: 10, background: T.g100, color: T.g700, border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>다시 작성</button>
                  </div>
                </div>
              </div>
            );
          }

          const isUser = m.from === "user";
          return (
            <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", gap: 8, marginBottom: 10 }}>
              {!isUser && <div style={{ width: 32, height: 32, borderRadius: 10, background: "#FEE500", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>K</div>}
              <div style={{ maxWidth: "78%", padding: "10px 14px", borderRadius: isUser ? "14px 4px 14px 14px" : "4px 14px 14px 14px", background: isUser ? "#FFEB33" : "#fff", color: T.navy, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.text}</div>
            </div>
          );
        })}

        {typing && (
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#FEE500", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>K</div>
            <div style={{ background: "#fff", padding: "12px 18px", borderRadius: "4px 14px 14px 14px", display: "flex", gap: 4 }}>
              {[0, 1, 2].map((d) => (
                <div key={d} style={{ width: 6, height: 6, borderRadius: 3, background: T.g300, animation: `dotPulse 1s ease-in-out ${d * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* 입력 영역 */}
      {!typing && currentType === "chips" && (
        <div style={{ padding: "10px 16px", background: "#fff", borderTop: `1px solid ${T.g200}`, display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 140, overflowY: "auto" }}>
          {currentOptions.map((c) => (
            <button key={c} onClick={() => submitAnswer(c)} style={{ padding: "8px 16px", borderRadius: 20, border: `1.5px solid ${T.g200}`, background: "#fff", fontSize: 13, fontWeight: 600, color: T.navy, cursor: "pointer", fontFamily: "inherit" }}>{c}</button>
          ))}
        </div>
      )}

      {!typing && currentType === "chipsInput" && (
        <div style={{ background: "#fff", borderTop: `1px solid ${T.g200}` }}>
          <div style={{ padding: "10px 16px 6px", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {currentOptions.map((c) => (
              <button key={c} onClick={() => submitAnswer(c)} style={{ padding: "8px 16px", borderRadius: 20, border: `1.5px solid ${T.g200}`, background: "#fff", fontSize: 13, fontWeight: 600, color: T.navy, cursor: "pointer", fontFamily: "inherit" }}>{c}</button>
            ))}
          </div>
          <div style={{ padding: "4px 16px 10px", display: "flex", gap: 8 }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleInputSend()} placeholder={currentPlaceholder} style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: `2px solid ${T.g200}`, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
            <button onClick={handleInputSend} disabled={!input.trim()} style={{ padding: "10px 16px", borderRadius: 12, background: input.trim() ? T.coral : T.g200, color: input.trim() ? "#fff" : T.g500, border: "none", fontWeight: 700, fontSize: 15, cursor: input.trim() ? "pointer" : "default" }}>↑</button>
          </div>
        </div>
      )}

      {!typing && currentType === "multi" && (
        <div style={{ padding: "10px 16px", background: "#fff", borderTop: `1px solid ${T.g200}` }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8, maxHeight: 100, overflowY: "auto" }}>
            {currentOptions.map((c) => {
              const sel = multiSel.indexOf(c) >= 0;
              return (
                <button key={c} onClick={() => toggleMulti(c)} style={{ padding: "8px 16px", borderRadius: 20, border: `1.5px solid ${sel ? T.mint : T.g200}`, background: sel ? T.mintL : "#fff", fontSize: 13, fontWeight: 600, color: sel ? "#059669" : T.navy, cursor: "pointer", fontFamily: "inherit" }}>{sel ? "✓ " : ""}{c}</button>
              );
            })}
          </div>
          <button onClick={confirmMulti} disabled={multiSel.length === 0} style={{ width: "100%", padding: "10px", borderRadius: 10, background: multiSel.length > 0 ? T.mint : T.g200, color: multiSel.length > 0 ? "#fff" : T.g500, border: "none", fontWeight: 700, fontSize: 13, cursor: multiSel.length > 0 ? "pointer" : "default", fontFamily: "inherit" }}>
            {multiSel.length > 0 ? `${multiSel.length}개 선택 완료` : "선택해 주세요"}
          </button>
        </div>
      )}

      {!typing && currentType === "addressSearch" && (
        <div style={{ background: "#fff", borderTop: `1px solid ${T.g200}` }}>
          <div style={{ padding: "10px 16px 6px" }}>
            <button onClick={() => setAddrModal(true)} style={{ width: "100%", padding: 12, borderRadius: 12, background: "#FEE500", color: "#3C1E1E", border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              🔍 카카오 주소 검색
            </button>
          </div>
          <div style={{ padding: "4px 16px 10px", display: "flex", gap: 8 }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleInputSend()} placeholder="직접 입력도 가능" style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: `2px solid ${T.g200}`, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
            <button onClick={handleInputSend} disabled={!input.trim()} style={{ padding: "10px 16px", borderRadius: 12, background: input.trim() ? T.coral : T.g200, color: input.trim() ? "#fff" : T.g500, border: "none", fontWeight: 700, fontSize: 15, cursor: input.trim() ? "pointer" : "default" }}>↑</button>
          </div>
        </div>
      )}

      {!typing && (currentType === "input" || currentType === "textarea") && (
        <div style={{ padding: "10px 16px", background: "#fff", borderTop: `1px solid ${T.g200}`, display: "flex", gap: 8 }}>
          {currentType === "textarea"
            ? <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={currentPlaceholder} style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: `2px solid ${T.g200}`, fontSize: 14, fontFamily: "inherit", outline: "none", minHeight: 60, resize: "none" }} />
            : <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleInputSend()} placeholder={currentPlaceholder} style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: `2px solid ${T.g200}`, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
          }
          <button onClick={handleInputSend} disabled={!input.trim()} style={{ padding: "10px 16px", borderRadius: 12, background: input.trim() ? T.coral : T.g200, color: input.trim() ? "#fff" : T.g500, border: "none", fontWeight: 700, fontSize: 15, cursor: input.trim() ? "pointer" : "default" }}>↑</button>
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
