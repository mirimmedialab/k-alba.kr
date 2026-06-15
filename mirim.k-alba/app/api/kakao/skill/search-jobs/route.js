import { createClient } from "@supabase/supabase-js";
import { formatPay } from "@/lib/format";

/**
 * 카카오 오픈빌더 스킬: 알바 찾기 (비자 맞춤 공고 검색)
 *
 * POST /api/kakao/skill/search-jobs
 *
 * 카카오가 보내는 요청에서 비자 코드를 읽어(버튼 추가정보 clientExtra.visa
 * 또는 파라미터 params.visa), 해당 비자로 지원 가능한 active 공고를 조회해
 * 카카오 listCard 형식으로 돌려준다.
 *
 * 환경변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (RLS 우회)
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = "https://www.k-alba.kr";

function textCard(text, quickReplies) {
  return Response.json({
    version: "2.0",
    template: { outputs: [{ simpleText: { text } }], quickReplies },
  });
}

const RESTART_QRS = [
  { label: "🔄 다른 비자로", action: "message", messageText: "알바 찾기" },
  { label: "🏠 처음으로", action: "message", messageText: "메뉴" },
];

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch (_) {}

  const action = body?.action || {};
  const visa =
    action?.clientExtra?.visa ||
    action?.params?.visa ||
    body?.userRequest?.utterance ||
    "";
  const visaCode = String(visa).trim().toUpperCase();
  const anyVisa = !visaCode || /무관|불문|전체|상관/.test(String(visa));

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return textCard("앗, 잠시 후 다시 시도해 주세요. (서버 설정 오류)", RESTART_QRS);
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

  if (error) {
    return textCard("공고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요. 🙏", RESTART_QRS);
  }

  if (!data || data.length === 0) {
    return textCard(
      `${anyVisa ? "" : visaCode + " "}조건에 맞는 공고를 찾지 못했어요. 😢\n다른 비자로 다시 찾아볼까요?`,
      RESTART_QRS
    );
  }

  const items = data.map((j) => {
    const company = j.employer?.company_name || j.employer_external_name || "";
    const region = j.sigungu || j.sido || j.address || "";
    const pay = `${j.pay_type || "시급"} ${formatPay(j.pay_amount, j.pay_type)}`;
    const desc = [company, region, pay].filter(Boolean).join(" · ");
    return {
      title: String(j.title || "공고").slice(0, 36),
      description: desc.slice(0, 40),
      link: { web: `${SITE}/jobs/${j.id}` },
    };
  });

  const header = anyVisa
    ? "🔍 추천 알바 공고"
    : `🔍 ${visaCode} 비자로 가능한 알바`;

  return Response.json({
    version: "2.0",
    template: {
      outputs: [
        {
          listCard: {
            header: { title: header.slice(0, 36) },
            items,
            buttons: [
              { label: "웹에서 더 보기", action: "webLink", webLinkUrl: `${SITE}/jobs` },
            ],
          },
        },
      ],
      quickReplies: RESTART_QRS,
    },
  });
}

export async function GET() {
  return Response.json({ ok: true, skill: "search-jobs" });
}
