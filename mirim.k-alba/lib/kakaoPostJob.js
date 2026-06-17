import { createClient } from "@supabase/supabase-js";
import { formatPay } from "@/lib/format";

/**
 * K-ALBA 사장님 공고 등록 — DB 상태머신 핸들러 (컨텍스트 비의존)
 *
 * 라우팅 설계:
 *  - 진입/진행 블록(공고 등록, 공고 등록 진행)  -> handlePostJob(body, { allowStart: true })
 *      · 드래프트 없음 = 시작(회원확인→질문). 메뉴 버튼(블록연결, 빈 발화)도 시작됨.
 *  - 폴백 블록                                   -> handlePostJob(body, { allowStart: false })
 *      · 드래프트 있음 = 답으로 기록(자유입력이 폴백으로 떨어져도 흐름 이어짐)
 *      · 드래프트 없음 = 페르소나 메뉴 안내 (다른 페르소나 폴백 정상 유지)
 *
 *  판단 근거는 100% DB 드래프트(kakao_job_drafts). 카카오 컨텍스트에 의존하지 않는다.
 *  버튼 답변은 블록연결 + extra.kalbaAnswer 로 전달된다.
 */

const SITE = "https://www.k-alba.kr";
const JOIN_PATH = "/employer/kakao-join";
const CTX_NAME = "JOB_POSTING";
const PROGRESS_BLOCK = "6a30e78d821f981024003ae8"; // '공고 등록 진행' 블록 ID

const CANCEL_RE = /^(취소|그만|중단|메인|메뉴|처음|나가기|x)$/i;
const SKIP_RE = /^(건너뛰기|스킵|skip|넘기기|패스)$/i;
const ENTRY_RE = /^(공고\s*등록|공고\s*올리기|직원\s*구함|채용)/;

const VISA_OPTIONS = [
  ["D-2 유학", "D-2"],
  ["D-4 어학연수", "D-4"],
  ["E-9 비전문취업", "E-9"],
  ["F-2 거주", "F-2"],
  ["F-4 재외동포", "F-4"],
  ["H-2 방문취업", "H-2"],
  ["비자 무관", "ANY"],
];
const ANY_VISA_CODES = ["D-2", "D-4", "E-9", "F-2", "F-4", "H-2"];

const STEPS = [
  { key: "company", core: true, type: "text",
    q: "🏢 업체명(상호)을 알려주세요.\n예: K-알바 카페 강서점" },
  { key: "job_type", core: true, type: "buttons",
    q: "🏪 어떤 업종이세요?",
    options: ["카페", "식당", "편의점", "제조/생산", "학원/과외", "호텔/서비스", "농업", "물류/배달", "기타"] },
  { key: "title", core: true, type: "text",
    q: "📝 공고 제목을 입력해 주세요.\n예: 주말 홀서빙 구합니다 (외국인 환영)" },
  { key: "pay_type", core: true, type: "buttons",
    q: "💰 급여 형태를 골라주세요.", options: ["시급", "일급", "월급"] },
  { key: "pay_amount", core: true, type: "text",
    q: "💵 급여 금액을 숫자로 입력해 주세요.\n예: 11000" },
  { key: "address", core: true, type: "text",
    q: "📍 근무지 주소를 입력해 주세요.\n예: 서울 강서구 화곡로 123\n(도로명/지번 주소를 적어주시면 지역을 자동으로 찾아드려요)" },
  { key: "visa", core: true, type: "visa",
    q: "🛂 어떤 비자를 가진 분을 채용하시나요?\n(가장 우선하는 비자 1개 또는 '비자 무관')" },
  { key: "contact", core: true, type: "text",
    q: "📞 지원자가 연락할 연락처를 알려주세요.\n예: 010-1234-5678" },
  { key: "work_type", core: false, type: "buttons",
    q: "🗓 근무 형태는요? (선택)",
    options: ["정기 알바", "단기 알바", "주말 알바", "야간 알바", "일용직", "재택/온라인"] },
  { key: "work_hours", core: false, type: "buttons",
    q: "⏰ 근무 시간대는요? (선택)",
    options: ["오전 (06~12시)", "오후 (12~18시)", "저녁 (18~24시)", "야간 (24~06시)", "시간 협의"] },
  { key: "work_days", core: false, type: "buttons",
    q: "📆 근무 요일은요? (선택)",
    options: ["평일 (월~금)", "주말 (토~일)", "요일 협의", "매일", "교대근무"] },
  { key: "korean_level", core: false, type: "buttons",
    q: "🗣 필요한 한국어 수준은요? (선택)",
    options: ["불필요 (못해도 OK)", "초급 (기본 인사)", "중급 (업무 이해)", "고급 (능통)"] },
  { key: "headcount", core: false, type: "buttons",
    q: "👥 몇 명 모집하세요? (선택)",
    options: ["1명", "2명", "3명", "5명", "10명 이상"] },
  { key: "benefits", core: false, type: "buttons",
    q: "🎁 복리후생이 있나요? (선택)",
    options: ["식사 제공", "교통비 지원", "기숙사 제공", "4대보험", "유니폼 제공", "인센티브", "없음"] },
  { key: "description", core: false, type: "text",
    q: "🧾 마지막! 상세 설명을 적어주세요. (선택)\n담당 업무, 우대 사항 등을 자유롭게." },
];

// ───────── helpers ─────────
function supa() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function botKey(body) {
  const u = body?.userRequest?.user || {};
  return u.id || u.properties?.botUserKey || u.properties?.plusfriendUserKey || "";
}

function ctx(lifeSpan = 10) {
  return { values: [{ name: CTX_NAME, lifeSpan, params: {} }] };
}

function reply(template, withCtx = true) {
  const out = { version: "2.0", template };
  out.context = withCtx ? ctx(10) : ctx(0);
  return Response.json(out);
}

function qrMsg(label, text) {
  return { label, action: "message", messageText: text ?? label };
}

// 버튼 답변: 블록연결로 '공고 등록 진행' 블록에 강제 라우팅 + extra로 답 전달
function qrAnswer(label, value) {
  return { action: "block", label, blockId: PROGRESS_BLOCK, extra: { kalbaAnswer: value ?? label } };
}

function welcomeFallback() {
  return reply({
    outputs: [{ simpleText: { text: "무엇을 원하는지 잘 모르겠어요. 아래에서 골라주세요 🙂" } }],
    quickReplies: [
      { action: "message", label: "🌏 외국인 알바생", messageText: "외국인 알바생" },
      { action: "message", label: "💼 사장님", messageText: "사장님" },
      { action: "message", label: "🎓 유학생", messageText: "유학생" },
      { action: "message", label: "🏫 학교 담당자", messageText: "학교 담당자" },
    ],
  }, false);
}

async function geocode(address) {
  const KEY = process.env.KAKAO_REST_API_KEY;
  if (!KEY) return null;
  try {
    const url = new URL("https://dapi.kakao.com/v2/local/search/address.json");
    url.searchParams.set("query", address);
    url.searchParams.set("size", "1");
    const r = await fetch(url.toString(), {
      headers: { Authorization: `KakaoAK ${KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const doc = data.documents?.[0];
    if (!doc) return null;
    const road = doc.road_address;
    const jibun = doc.address;
    return {
      address: road?.address_name || jibun?.address_name || address,
      sido: road?.region_1depth_name || jibun?.region_1depth_name || "",
      sigungu: road?.region_2depth_name || jibun?.region_2depth_name || "",
      dong: road?.region_3depth_name || jibun?.region_3depth_name || "",
      latitude: doc.y ? Number(doc.y) : null,
      longitude: doc.x ? Number(doc.x) : null,
    };
  } catch (_) {
    return null;
  }
}

function askStep(stepIndex, note) {
  const s = STEPS[stepIndex];
  const text = (note ? note + "\n\n" : "") + s.q;
  const qrs = [];
  if (s.type === "buttons") for (const o of s.options) qrs.push(qrAnswer(o, o));
  if (s.type === "visa") for (const [label] of VISA_OPTIONS) qrs.push(qrAnswer(label, label));
  if (!s.core) qrs.push(qrAnswer("⏭ 건너뛰기", "건너뛰기"));
  qrs.push(qrAnswer("✖ 취소", "취소"));
  return reply({ outputs: [{ simpleText: { text } }], quickReplies: qrs.slice(0, 10) }, true);
}

function needJoin(key) {
  const url = `${SITE}${JOIN_PATH}?b=${encodeURIComponent(key)}`;
  return reply({
    outputs: [{
      textCard: {
        title: "공고 등록은 회원가입이 필요해요 🙌",
        description:
          "카카오로 30초면 가입돼요. 가입하면 올린 공고의 지원 현황을 이메일로 받아보실 수 있어요. 가입 후 카카오톡으로 돌아와 아래 '📝 공고 등록' 버튼을 눌러주세요!",
        buttons: [{ action: "webLink", label: "카카오로 가입하기", webLinkUrl: url }],
      },
    }],
    quickReplies: [
      { label: "📝 공고 등록", action: "message", messageText: "공고 등록" },
      { label: "🏠 메뉴", action: "message", messageText: "사장님" },
    ],
  }, false);
}

// 새 공고 등록 시작(회원확인 → 첫 질문)
async function startFlow(db, key) {
  const { data: profile } = await db
    .from("profiles").select("id, company_name").eq("kakao_bot_user_key", key).maybeSingle();
  if (!profile) {
    await db.from("kakao_job_drafts").delete().eq("bot_user_key", key);
    return needJoin(key);
  }
  const data = {};
  let start = 0;
  if (profile.company_name) { data.company = profile.company_name; start = 1; }
  await db.from("kakao_job_drafts").upsert({
    bot_user_key: key, step: start, data, updated_at: new Date().toISOString(),
  });
  const note = start === 1
    ? `'${profile.company_name}' 사장님, 공고를 만들어 드릴게요! ✍️`
    : "공고를 만들어 드릴게요! 몇 가지만 여쭤볼게요 ✍️";
  return askStep(start, note);
}

// 진행 중 드래프트에 답 기록 → 다음 질문 또는 저장
async function continueFlow(db, key, draftRow, input) {
  const { data: profile } = await db
    .from("profiles").select("id, company_name, phone").eq("kakao_bot_user_key", key).maybeSingle();
  if (!profile) {
    await db.from("kakao_job_drafts").delete().eq("bot_user_key", key);
    return needJoin(key);
  }

  let step = draftRow.step;
  const data = { ...(draftRow.data || {}) };
  const s = STEPS[step];

  if (SKIP_RE.test(input)) {
    if (s.core) return askStep(step, "이 항목은 필수예요. 입력해 주세요 🙏");
  } else {
    if (s.type === "text" && !input) return askStep(step, "내용을 입력해 주세요 🙏");
    if (s.key === "pay_amount") {
      const n = Number(input.replace(/[^0-9]/g, ""));
      if (!n) return askStep(step, "급여 금액을 숫자로 입력해 주세요. 예: 11000");
      data.pay_amount = n;
    } else if (s.key === "address") {
      const geo = await geocode(input);
      if (!geo) return askStep(step, "주소를 찾지 못했어요. 도로명/지번 주소로 다시 입력해 주세요 🙏");
      data.address = geo.address; data.sido = geo.sido; data.sigungu = geo.sigungu;
      data.dong = geo.dong; data.latitude = geo.latitude; data.longitude = geo.longitude;
    } else if (s.key === "visa") {
      const match = VISA_OPTIONS.find(([label]) => label === input)
        || VISA_OPTIONS.find(([label, code]) => input.toUpperCase().includes(code) && code !== "ANY")
        || (/무관|상관|불문/.test(input) ? ["비자 무관", "ANY"] : null);
      if (!match) return askStep(step, "아래 버튼에서 비자를 골라주세요 🙏");
      data.visa_types = match[1] === "ANY" ? ANY_VISA_CODES.slice() : [match[1]];
    } else {
      data[s.key] = input;
    }
  }

  step += 1;

  if (step < STEPS.length) {
    await db.from("kakao_job_drafts").upsert({
      bot_user_key: key, step, data, updated_at: new Date().toISOString(),
    });
    return askStep(step);
  }

  // 완료: 공고 저장
  const jobData = {
    employer_id: profile.id,
    title: data.title,
    job_type: data.job_type || "기타",
    pay_type: data.pay_type || "시급",
    pay_amount: Number(data.pay_amount) || 0,
    address: data.address || null,
    sido: data.sido || null,
    sigungu: data.sigungu || null,
    dong: data.dong || null,
    latitude: data.latitude || null,
    longitude: data.longitude || null,
    visa_types: Array.isArray(data.visa_types) ? data.visa_types : [],
    work_type: data.work_type || null,
    work_hours: data.work_hours || null,
    work_days: data.work_days || null,
    korean_level: data.korean_level || null,
    headcount: data.headcount || null,
    benefits: data.benefits || null,
    description: data.description || null,
    employer_external_name: data.company || profile.company_name || null,
    status: "active",
    source_type: "chatbot",
    raw: { via: "kakao_chatbot", contact_phone: data.contact || null },
  };

  const { data: newJob, error } = await db.from("jobs").insert(jobData).select("id").single();
  if (error || !newJob) {
    return reply({
      outputs: [{ simpleText: { text: "앗, 공고 저장 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요 🙏" } }],
      quickReplies: [qrMsg("📝 다시 시도", "공고 등록"), qrMsg("🏠 메인 메뉴", "사장님")],
    }, false);
  }

  const patch = {};
  if (!profile.company_name && data.company) patch.company_name = data.company;
  if (!profile.phone && data.contact) patch.phone = data.contact;
  if (Object.keys(patch).length) await db.from("profiles").update(patch).eq("id", profile.id);

  await db.from("kakao_job_drafts").delete().eq("bot_user_key", key);

  const payStr = `${data.pay_type || "시급"} ${formatPay(Number(data.pay_amount) || 0, data.pay_type)}`;
  const region = data.sigungu || data.sido || "";
  return reply({
    outputs: [{
      textCard: {
        title: "🎉 공고 등록 완료!",
        description: [
          `📋 ${String(data.title || "공고").slice(0, 40)}`,
          `🏢 ${data.company || ""}`,
          `💰 ${payStr}${region ? ` · 📍 ${region}` : ""}`,
          "\n✨ 지금부터 알바 찾기에 노출돼요. 지원이 들어오면 알려드릴게요!",
        ].filter(Boolean).join("\n"),
        buttons: [{ action: "webLink", label: "공고 보기", webLinkUrl: `${SITE}/jobs/${newJob.id}` }],
      },
    }],
    quickReplies: [qrMsg("📝 공고 더 올리기", "공고 등록"), qrMsg("🏠 메인 메뉴", "사장님")],
  }, false);
}

/**
 * 공통 핸들러
 * @param {object} body  카카오 스킬 요청 바디
 * @param {{allowStart?: boolean}} opts  allowStart=true: 진입/진행 블록(없으면 시작),
 *                                       false: 폴백 블록(없으면 페르소나 안내)
 */
export async function handlePostJob(body, { allowStart = true } = {}) {
  const key = botKey(body);
  const utter = String(body?.userRequest?.utterance || "").trim();
  const extra = body?.action?.clientExtra || {};
  const btnAnswer = typeof extra.kalbaAnswer === "string" ? extra.kalbaAnswer.trim() : "";
  const db = supa();

  if (!key || !db) {
    return reply({ outputs: [{ simpleText: { text: "앗, 잠시 후 다시 시도해 주세요. 🙏" } }] }, false);
  }

  const { data: draftRow } = await db
    .from("kakao_job_drafts").select("step, data").eq("bot_user_key", key).maybeSingle();

  // 취소(버튼 또는 발화)
  if (CANCEL_RE.test(btnAnswer) || CANCEL_RE.test(utter)) {
    await db.from("kakao_job_drafts").delete().eq("bot_user_key", key);
    return reply({
      outputs: [{ simpleText: { text: "공고 등록을 취소했어요. 언제든 다시 시작할 수 있어요!" } }],
      quickReplies: [qrMsg("📝 공고 등록"), qrMsg("🏠 메인 메뉴", "사장님")],
    }, false);
  }

  // 명시적 진입 발화는 (재)시작
  if (ENTRY_RE.test(utter)) return startFlow(db, key);

  // 진행 중 드래프트가 있으면 답으로 기록 (자유입력이 폴백으로 떨어져도 여기서 이어짐)
  if (draftRow) return continueFlow(db, key, draftRow, btnAnswer || utter);

  // 드래프트 없음: 진입/진행 블록이면 시작, 폴백 블록이면 페르소나 안내
  if (allowStart) return startFlow(db, key);
  return welcomeFallback();
}
