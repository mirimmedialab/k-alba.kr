import { createClient } from "@supabase/supabase-js";
import { formatPay } from "@/lib/format";

/**
 * 카카오 오픈빌더 스킬: 알바 찾기 (비자 맞춤 공고 검색)
 *
 * 1) 비자 미선택(진입) -> "비자 골라주세요" + 비자 선택 quickReplies
 *    (각 quickReply는 '메시지 전송' 방식: 라벨이 발화로 전송되어
 *     "공고 결과" 블록에 매칭되고 스킬이 utterance에서 비자 코드를 추출)
 * 2) 비자 선택됨 -> 해당 비자 가능 공고를 listCard로 반환
 *
 * 환경변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (RLS 우회)
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = "https://www.k-alba.kr";

const VISA_CHOICES = [
  ["비자 무관", "비자무관"],
  ["D-2 유학", "D-2"],
  ["D-4 어학연수", "D-4"],
  ["E-9 비전문취업", "E-9"],
  ["F-2 거주", "F-2"],
  ["F-4 재외동포", "F-4"],
  ["H-2 방문취업", "H-2"],
];

// 비자 선택 버튼: '메시지 전송' 방식.
// 라벨이 그대로 발화로 전송되어 "공고 결과" 블록 패턴에 매칭되고,
// 스킬이 utterance에서 비자 코드를 추출한다. (봇테스트/실카톡 모두 동일 동작)
function visaQuickReplies() {
  return VISA_CHOICES.map(([label]) => ({
    label,
    action: "message",
    messageText: label,
  }));
}

const AFTER_QRS = [
  { label: "🔄 다른 비자로", action: "message", messageText: "알바 찾기" },
  { label: "🏠 처음으로", action: "message", messageText: "메뉴" },
];

// 발화/라벨에서 비자 코드 추출 ("H-2 방문취업" -> "H-2", "비자 무관" -> "비자무관")
function extractVisa(t) {
  if (!t) return "";
  if (/무관|불문|전체|상관/.test(t)) return "비자무관";
  const m = t.match(/([A-Ha-h])\s*-?\s*(\d{1,2})/);
  return m ? `${m[1].toUpperCase()}-${m[2]}` : "";
}

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch (_) {}

  const action = body?.action || {};
  const fromBtn = action?.clientExtra?.visa || action?.params?.visa || "";
  const utter = String(body?.userRequest?.utterance || "");
  const visa = fromBtn || extractVisa(utter);
  const hasInput = !!String(visa).trim();

  if (!hasInput) {
    return Response.json({
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: "어떤 비자로 일하실 수 있나요? 🛂\n비자에 맞는 합법 알바만 보여드릴게요.\n아래에서 선택해 주세요.",
            },
          },
        ],
        quickReplies: visaQuickReplies(),
      },
    });
  }

  const visaCode = String(visa).trim().toUpperCase().replace(/\s+/g, "");
  const anyVisa = /무관|불문|전체|상관/.test(String(visa));

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return Response.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: "앗, 잠시 후 다시 시도해 주세요. (서버 설정 오류)" } }],
        quickReplies: AFTER_QRS,
      },
    });
  }

  const supabase = createClient(url, key);
  let q = supabase
    .from("jobs")
    .select(
      "id, title, pay_type, pay_amount, sigungu, sido, address, visa_types, employer_external_name, employer:profiles(company_name)"
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(5);
  if (!anyVisa) q = q.contains("visa_types", [visaCode]);

  const { data, error } = await q;

  if (error || !data || data.length === 0) {
    return Response.json({
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: `${anyVisa ? "" : visaCode + " "}조건에 맞는 공고를 찾지 못했어요. 😢\n다른 비자로 다시 찾아볼까요?`,
            },
          },
        ],
        quickReplies: AFTER_QRS,
      },
    });
  }

  const items = data.map((j) => {
    const company = j.employer?.company_name || j.employer_external_name || "";
    const region = j.sigungu || j.sido || j.address || "";
    const pay = `${j.pay_type || "시급"} ${formatPay(j.pay_amount, j.pay_type)}`;
    const desc = [company, region, pay].filter(Boolean).join(" · ");
    return {
      title: String(j.title || "공고").slice(0, 36),
      description: desc.slice(0, 40),
      link: { web: `${SITE}/jobs/${j.id}?utm_source=kakao_channel&utm_medium=chatbot` },
    };
  });

  const header = anyVisa ? "🔍 추천 알바 공고" : `🔍 ${visaCode} 비자로 가능한 알바`;

  return Response.json({
    version: "2.0",
    template: {
      outputs: [
        {
          listCard: {
            header: { title: header.slice(0, 36) },
            items,
            buttons: [{ label: "웹에서 더 보기", action: "webLink", webLinkUrl: `${SITE}/jobs?utm_source=kakao_channel&utm_medium=chatbot` }],
          },
        },
      ],
      quickReplies: AFTER_QRS,
    },
  });
}

export async function GET() {
  return Response.json({ ok: true, skill: "search-jobs" });
}
