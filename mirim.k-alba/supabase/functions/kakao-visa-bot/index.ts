import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// 카카오 i 오픈빌더 폴백 라우터 스킬 서버 (v3)
// 1) 먼저 기존 공고등록 폴백(www.k-alba.kr)에 프록시
//    - 진행 중 드래프트/진입/취소 등은 그 응답을 그대로 통과(공고 등록 흐름 보존)
// 2) "무엇을 원하는지 잘 모르겠어요"(메뉴 안내)로 떨어질 때만 비자 도우미가 답변
// v3 (2026-07-23): 발화 언어 자동 감지 → visa-chatbot에 lang 전달 (7개 언어 답변)
//    - 문자 스크립트(한글/가나/한자/키릴/베트남 성조) + 우즈베크 라틴 키워드로 판별
//    - '자세히' quick reply는 언어별 키워드로 생성해 무상태에서도 언어 유지
// verify_jwt=false: 카카오 서버는 Supabase JWT를 보낼 수 없음 (공개 안내 데이터만 제공)

const POSTJOB_FALLBACK_URL = "https://www.k-alba.kr/api/kakao/skill/fallback";
const WELCOME_MARKER = "무엇을 원하는지 잘 모르겠어요";

type Lang = "ko" | "en" | "vi" | "zh" | "ja" | "uz" | "mn";

// 언어별 '자세히' 키워드 (quick reply messageText에 심어 무상태로 언어 전달)
const DETAIL_KEYWORD: Record<Lang, string> = {
  ko: "자세히", en: "detail", vi: "chi tiết", zh: "详情", ja: "詳細", uz: "batafsil", mn: "дэлгэрэнгүй",
};
// '다른 비자 물어보기' → 언어별 인사말 (visa-chatbot의 help 트리거와 일치)
const HELP_KEYWORD: Record<Lang, string> = {
  ko: "도움", en: "help", vi: "xin chào", zh: "你好", ja: "こんにちは", uz: "salom", mn: "сайн",
};
// visa-chatbot이 돌려주는 언어별 라벨 (quick reply 치환 판별용)
const DETAIL_LABELS = ["자세히 보기", "See details", "Xem chi tiết", "查看详情", "詳細を見る", "Batafsil", "Дэлгэрэнгүй"];
const OTHER_LABELS = ["다른 비자 물어보기", "Ask another visa", "Hỏi visa khác", "咨询其他签证", "他のビザを聴く", "Boshqa viza so'rash", "Өөр виз асуух"];

// 발화 언어 감지 (스크립트 우선, 라틴은 베트남 성조 → 우즈베크 키워드 → 영어 순)
function detectLang(text: string): Lang {
  const t = String(text || "");
  if (/[가-힣]/.test(t)) return "ko";
  if (/[぀-ヿ]/.test(t)) return "ja"; // 히라가나/가타카나
  if (/[一-鿿]/.test(t)) return "zh"; // 한자 (가나 없음)
  if (/[Ѐ-ӿ]/.test(t)) return "mn"; // 키릴 (몽골어 우선; 우즈베크는 라틴 표기가 일반적)
  if (/[ăâđêơưàảãạáằẳẵặắầẩẫậấèẻẽẹéềểễệếìỉĩịíòỏõọóồổỗộốờởỡợớùủũụúừửữựứỳỷỹỵý]/i.test(t)) return "vi";
  if (/(bo['’‘]l|mumkin|ishla|qanday|kerak|viza\s+bilan|talaba)/i.test(t)) return "uz";
  // 비자코드/숫자/기호만 있으면 기본 한국어
  const residue = t.replace(/[ABCDEFGH]\s?-?\s?\d{1,2}(-\d)?/gi, "").replace(/[^a-z]/gi, "");
  if (!residue) return "ko";
  return "en";
}

// '자세히' 요청에서 언어 추출 (키워드 자체가 언어를 나타냄)
function detectDetailLang(text: string): Lang | null {
  const lower = text.toLowerCase();
  if (/자세히|상세/.test(text)) return "ko";
  if (/chi tiết/i.test(text)) return "vi";
  if (/详情|详细/.test(text)) return "zh";
  if (/詳細/.test(text)) return "ja";
  if (/batafsil/i.test(lower)) return "uz";
  if (/дэлгэрэнгүй/i.test(lower)) return "mn";
  if (/\bdetail/i.test(lower)) return "en";
  return null;
}

async function callChatbot(payload: Record<string, unknown>) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_ANON_KEY")!;
  const res = await fetch(`${url}/functions/v1/visa-chatbot`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
  });
  return res.json();
}

function kakaoResponse(text: string, quickReplies: string[] = [], visaCode?: string, lang: Lang = "ko") {
  return {
    version: "2.0",
    template: {
      outputs: [{ simpleText: { text: text.slice(0, 1000) } }],
      quickReplies: quickReplies.slice(0, 10).map((q) => {
        // 카카오는 무상태 → quick reply에 비자코드/언어 키워드를 심어 다음 발화에서 복원
        let messageText = q;
        if (DETAIL_LABELS.includes(q) && visaCode) messageText = `${visaCode} ${DETAIL_KEYWORD[lang]}`;
        else if (OTHER_LABELS.includes(q)) messageText = HELP_KEYWORD[lang];
        return { label: q.slice(0, 14), action: "message", messageText };
      }),
    },
  };
}

async function visaAnswer(utterance: string) {
  // "D-2 자세히 / D-2 detail / D-2 chi tiết ..." 패턴 -> detail 액션
  const detailMatch = utterance.match(
    /([ABCDEFGH]\s?-?\s?\d{1,2}(?:-\d)?).{0,10}(자세히|상세|detail|chi tiết|详情|详细|詳細|batafsil|дэлгэрэнгүй)/i
  );
  let data;
  let lang: Lang;
  if (detailMatch) {
    const code = detailMatch[1].toUpperCase().replace(/\s/g, "").replace(/^([A-H])(\d)/, "$1-$2");
    lang = detectDetailLang(utterance) ?? detectLang(utterance);
    data = await callChatbot({ action: "detail", visa_code: code, lang });
  } else {
    lang = detectLang(utterance);
    data = await callChatbot({ message: utterance, lang });
  }
  return kakaoResponse(data.answer ?? "잠시 후 다시 시도해 주세요.", data.quick_replies ?? [], data.visa_code, lang);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("ok");
  try {
    const raw = await req.text();
    const body = JSON.parse(raw || "{}");
    const utterance: string = body?.userRequest?.utterance?.trim() ?? "";

    // 1) 기존 공고등록 폴백에 먼저 위임 (드래프트 진행/진입/취소 로직은 단일 출처 유지)
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3000);
      const pj = await fetch(POSTJOB_FALLBACK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: raw,
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (pj.ok) {
        const pjText = await pj.text();
        if (!pjText.includes(WELCOME_MARKER)) {
          // 공고등록 흐름의 유효 응답 -> 그대로 통과
          return new Response(pjText, { headers: { "Content-Type": "application/json; charset=utf-8" } });
        }
      }
    } catch (_e) {
      // 프록시 실패 시 비자 답변으로 계속
    }

    // 2) 메뉴 안내로 떨어진 발화 -> 비자 도우미 답변 (발화 언어로)
    const out = await visaAnswer(utterance);
    return new Response(JSON.stringify(out), {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (_e) {
    return new Response(JSON.stringify(kakaoResponse("일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.")), {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
});
