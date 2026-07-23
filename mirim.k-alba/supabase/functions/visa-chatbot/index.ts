import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// K-ALBA 비자 도우미 챗봇 (v5)
// v5 (2026-07-23): 인사말·미인식 응답에 7개 언어 지원 안내 배너 추가
//                  (외국인 사용자가 모국어로 질문 가능함을 인지하도록)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Lang = "ko" | "en" | "vi" | "zh" | "ja" | "uz" | "mn";
const LANGS: Lang[] = ["ko", "en", "vi", "zh", "ja", "uz", "mn"];

const STATUS_LABEL: Record<Lang, Record<string, string>> = {
  ko: { allowed: "✅ 취업 가능", conditional: "⚠️ 조건부 가능", prohibited: "❌ 취업 불가", unknown: "❓ 확인 필요" },
  en: { allowed: "✅ Work allowed", conditional: "⚠️ Conditionally allowed", prohibited: "❌ Not allowed", unknown: "❓ Needs check" },
  vi: { allowed: "✅ Được phép làm việc", conditional: "⚠️ Có điều kiện", prohibited: "❌ Không được phép", unknown: "❓ Cần xác nhận" },
  zh: { allowed: "✅ 可以就业", conditional: "⚠️ 有条件允许", prohibited: "❌ 不可就业", unknown: "❓ 需确认" },
  ja: { allowed: "✅ 就労可能", conditional: "⚠️ 条件付き可能", prohibited: "❌ 就労不可", unknown: "❓ 要確認" },
  uz: { allowed: "✅ Ishlash mumkin", conditional: "⚠️ Shartli ruxsat", prohibited: "❌ Ishlash mumkin emas", unknown: "❓ Tekshirish kerak" },
  mn: { allowed: "✅ Ажиллах боломжтой", conditional: "⚠️ Болзолтой", prohibited: "❌ Ажиллах боломжгүй", unknown: "❓ Шалгах шаардлагатай" },
};

const DETAIL_HEADERS: Record<Lang, { cond: string; sect: string; restr: string }> = {
  ko: { cond: "필요 조건·절차", sect: "허용 분야", restr: "제한 사항" },
  en: { cond: "Requirements & procedures", sect: "Allowed fields", restr: "Restrictions" },
  vi: { cond: "Điều kiện & thủ tục", sect: "Lĩnh vực được phép", restr: "Hạn chế" },
  zh: { cond: "条件与程序", sect: "允许领域", restr: "限制事项" },
  ja: { cond: "必要条件・手続き", sect: "許容分野", restr: "制限事項" },
  uz: { cond: "Talablar va tartib", sect: "Ruxsat etilgan sohalar", restr: "Cheklovlar" },
  mn: { cond: "Шаардлага, журам", sect: "Зөвшөөрөгдсөн салбар", restr: "Хязгаарлалт" },
};

const UI: Record<Lang, Record<string, string>> = {
  ko: { help: "안녕하세요! K-ALBA 비자 도우미입니다 🙌\n비자와 하고 싶은 일을 함께 말해주면 구체적으로 답해드려요.\n예: “D-2 비자 농업 알바도 될까요?”", unknown: "비자 종류를 찾지 못했어요 😅\n비자 코드(D-2, F-4)나 이름과 함께 물어봐 주세요. 업종까지 말하면 더 정확해요!", need_visa: "정확한 답변을 위해 가지고 계신 비자를 알려주세요.", not_found: "이 비자 정보는 아직 준비 중이에요. 외국인종합안내센터(☎1345)로 문의해 주세요.", tip: "💡 업종까지 말해주면 더 구체적으로 답해드려요!", detail: "자세히 보기", other: "다른 비자 물어보기", src: "출처", ko_only: "", err: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요." },
  en: { help: "Hi! I'm the K-ALBA visa helper 🙌\nTell me your visa and the job you want. e.g. “Can I do farm work on a D-2 visa?”", unknown: "I couldn't find your visa type 😅\nPlease include a visa code (D-2, F-4). Adding the job type gives a more precise answer!", need_visa: "To answer precisely, please tell me your visa type.", not_found: "Info for this visa is being prepared. Please call the Immigration Contact Center (☎1345).", tip: "💡 Tell me the job type for a more specific answer!", detail: "See details", other: "Ask another visa", src: "Source", ko_only: "(Details available in Korean)", err: "Temporary error. Please try again." },
  vi: { help: "Xin chào! Trợ lý visa K-ALBA đây 🙌\nHãy cho biết visa và công việc bạn muốn làm. VD: “Visa D-2 làm nông nghiệp được không?”", unknown: "Không tìm thấy loại visa 😅\nHãy ghi kèm mã visa (D-2, F-4). Nêu thêm ngành nghề sẽ chính xác hơn!", need_visa: "Để trả lời chính xác, hãy cho biết loại visa của bạn.", not_found: "Thông tin visa này đang được chuẩn bị. Vui lòng gọi Trung tâm tư vấn người nước ngoài (☎1345).", tip: "💡 Nêu thêm ngành nghề để được trả lời cụ thể hơn!", detail: "Xem chi tiết", other: "Hỏi visa khác", src: "Nguồn", ko_only: "(Chi tiết bằng tiếng Hàn)", err: "Lỗi tạm thời. Vui lòng thử lại." },
  zh: { help: "您好！我是K-ALBA签证助手 🙌\n请告诉我您的签证和想做的工作。例：“D-2签证可以做农场兼职吗？”", unknown: "未能识别签证类型 😅\n请包含签证代码(D-2, F-4)。说明行业会更准确！", need_visa: "为了准确回答，请告诉我您持有的签证。", not_found: "该签证信息正在准备中。请致电外国人综合服务中心(☎1345)。", tip: "💡 告诉我行业，回答会更具体！", detail: "查看详情", other: "咨询其他签证", src: "来源", ko_only: "(详情以韩文提供)", err: "暂时错误，请稍后重试。" },
  ja: { help: "こんにちは！K-ALBAビザアシスタントです 🙌\nビザとしたい仕事を教えてください。例：「D-2ビザで農業バイトはできますか？」", unknown: "ビザの種類が分かりませんでした 😅\nビザコード(D-2, F-4)を含めてください。業種も伝えるとより正確です！", need_visa: "正確にお答えするため、お持ちのビザを教えてください。", not_found: "このビザの情報は準備中です。外国人総合案内センター(☎1345)へ。", tip: "💡 業種まで伝えるとより具体的に答えます！", detail: "詳細を見る", other: "他のビザを聴く", src: "出典", ko_only: "(詳細は韓国語)", err: "一時的なエラーです。後ほどお試しください。" },
  uz: { help: "Salom! K-ALBA viza yordamchisi 🙌\nVizangiz va qilmoqchi bo'lgan ishingizni ayting. Masalan: “D-2 viza bilan fermada ishlasam bo'ladimi?”", unknown: "Viza turini topa olmadim 😅\nViza kodini (D-2, F-4) yozing. Ish turini ham aytsangiz aniqroq javob beraman!", need_visa: "Aniq javob uchun vizangizni ayting.", not_found: "Bu viza haqida ma'lumot tayyorlanmoqda. Ma'lumot markaziga qo'ng'iroq qiling (☎1345).", tip: "💡 Ish turini aytsangiz aniqroq javob beraman!", detail: "Batafsil", other: "Boshqa viza so'rash", src: "Manba", ko_only: "(Tafsilotlar koreys tilida)", err: "Vaqtinchalik xatolik. Qayta urinib ko'ring." },
  mn: { help: "Сайн байна уу! K-ALBA визний туслах 🙌\nВиз болон хийхийг хүссэн ажлаа хэлнэ үү. Жишээ: “D-2 визээр фермд ажиллаж болох уу?”", unknown: "Визний төрлийг олсонгүй 😅\nВизний код (D-2, F-4) бичнэ үү. Ажлын төрлийг нэмвэл илүү оновчтой!", need_visa: "Оновчтой хариулахын тулд визээ хэлнэ үү.", not_found: "Энэ визний мэдээлэл бэлтгэгдэж байна. Мэдээллийн төвд хандана уу (☎1345).", tip: "💡 Ажлын төрлийг хэлвэл илүү тодорхой хариулна!", detail: "Дэлгэрэнгүй", other: "Өөр виз асуух", src: "Эх сурвалж", ko_only: "(Дэлгэрэнгүй нь солонгос хэлээр)", err: "Түр зуурын алдаа. Дахин оролдоно уу." },
};

// 7개 언어 지원 안내 배너 (인사말·미인식 응답에 표시 — 다국어 지원 인지용)
const LANG_NOTICE: Record<Lang, string> = {
  ko: "🌏 English · Tiếng Việt · 中文 · 日本語 · Oʻzbek · Монгол\n외국어로 질문하면 그 언어로 답해드려요!",
  en: "🌏 한국어 · Tiếng Việt · 中文 · 日本語 · Oʻzbek · Монгол\nAsk in any of these languages — I'll answer in it!",
  vi: "🌏 Hỗ trợ 7 ngôn ngữ (Việt, Hàn, Anh, Trung, Nhật...)\nHỏi bằng tiếng của bạn, mình trả lời bằng tiếng đó!",
  zh: "🌏 支持中文、韩语、英语、日语等7种语言\n用您的语言提问，我会用您的语言回答！",
  ja: "🌏 日本語・韓国語・英語など7言語に対応\nあなたの言語で質問すれば、その言語で答えます！",
  uz: "🌏 7 tilda ishlaydi (o'zbek, koreys, ingliz...)\nO'z tilingizda so'rang — o'z tilingizda javob beraman!",
  mn: "🌏 7 хэл дэмжинэ (монгол, солонгос, англи...)\nӨөрийн хэлээр асуувал өөрийн хэлээр хариулна!",
};

// 준비 서류 안내 (업종 답변에 자동 첨부 — 취업 불가 응답에는 미표시)
const DOC_UI: Record<Lang, { title: string; arc: string; permit: string; bank: string }> = {
  ko: { title: "준비 서류", arc: "외국인등록증·여권", permit: "시간제취업허가 (K-ALBA에서 확인서 자동 작성 지원)", bank: "급여 이체용 통장" },
  en: { title: "Documents to prepare", arc: "Alien Registration Card & passport", permit: "Part-time work permit (K-ALBA auto-fills the form)", bank: "Bank account for salary" },
  vi: { title: "Giấy tờ cần chuẩn bị", arc: "Thẻ đăng ký người nước ngoài & hộ chiếu", permit: "Giấy phép làm thêm (K-ALBA tự động điền hồ sơ)", bank: "Tài khoản ngân hàng nhận lương" },
  zh: { title: "需准备的材料", arc: "外国人登录证和护照", permit: "打工许可（K-ALBA自动填写申请表）", bank: "工资转账银行账户" },
  ja: { title: "準備する書類", arc: "外国人登録証・パスポート", permit: "資格外活動許可（K-ALBAが書類自動作成）", bank: "給与振込用の銀行口座" },
  uz: { title: "Tayyorlash kerak bo'lgan hujjatlar", arc: "Chet ellik ro'yxatga olish kartasi va pasport", permit: "Yarim stavka ish ruxsatnomasi (K-ALBA hujjatni avtomatik to'ldiradi)", bank: "Oylik uchun bank hisobi" },
  mn: { title: "Бэлтгэх бичиг баримт", arc: "Гадаад иргэний бүртгэлийн үнэмлэх, паспорт", permit: "Цагийн ажлын зөвшөөрөл (K-ALBA маягтыг автоматаар бөглөнө)", bank: "Цалингийн банкны данс" },
};

const EXTRA_DOCS: Record<string, Record<Lang, string>> = {
  restaurant: {
    ko: "보건증(건강진단결과서) — 보건소 발급, 식품 취급 필수",
    en: "Health certificate (bogeonjeung) — issued at a public health center, required for food handling",
    vi: "Giấy khám sức khỏe (bogeonjeung) — cấp tại trung tâm y tế công, bắt buộc khi tiếp xúc thực phẩm",
    zh: "健康证（보건증）— 保健所办理，接触食品必备",
    ja: "保健証（健康診断結果書）— 保健所で発給、食品取扱いに必須",
    uz: "Sog'liq guvohnomasi (bogeonjeung) — davlat sog'liqni saqlash markazidan, oziq-ovqat bilan ishlashda majburiy",
    mn: "Эрүүл мэндийн үнэмлэх (богонжын) — эрүүл мэндийн төвөөс, хоол хүнстэй ажиллахад заавал",
  },
  convenience: {
    ko: "보건증(건강진단결과서) — 조리식품 취급 시 필요 (보건소 발급)",
    en: "Health certificate (bogeonjeung) — needed if handling prepared food (public health center)",
    vi: "Giấy khám sức khỏe (bogeonjeung) — cần nếu bán đồ ăn chế biến (trung tâm y tế công)",
    zh: "健康证（보건증）— 经营即食食品时需要（保健所办理）",
    ja: "保健証 — 調理食品を扱う場合に必要（保健所で発給）",
    uz: "Sog'liq guvohnomasi (bogeonjeung) — tayyor oziq-ovqat bilan ishlashda kerak",
    mn: "Эрүүл мэндийн үнэмлэх — бэлэн хоол зарах бол шаардлагатай",
  },
  construction: {
    ko: "건설업 기초안전보건교육 이수증",
    en: "Basic construction safety training certificate",
    vi: "Chứng chỉ đào tạo an toàn xây dựng cơ bản",
    zh: "建筑业基础安全教育结业证",
    ja: "建設業基礎安全保健教育修了証",
    uz: "Qurilish xavfsizligi bo'yicha boshlang'ich o'quv sertifikati",
    mn: "Барилгын аюулгүй байдлын үндсэн сургалтын гэрчилгээ",
  },
  delivery: {
    ko: "원동기/2종 면허 + 유상운송 보험 (오토바이 배달 시)",
    en: "Motorcycle license + paid-delivery insurance (for bike delivery)",
    vi: "Bằng lái xe máy + bảo hiểm giao hàng (nếu giao bằng xe máy)",
    zh: "摩托车驾照＋有偿运输保险（骑摩托配送时）",
    ja: "原付/二輪免許＋有償運送保険（バイク配達の場合）",
    uz: "Mototsikl guvohnomasi + yetkazib berish sug'urtasi (mototsiklda)",
    mn: "Мотоциклийн үнэмлэх + хүргэлтийн даатгал (мотоциклоор бол)",
  },
};

function docsSection(lang: Lang, visaCode: string, industryKey: string): string {
  const d = DOC_UI[lang];
  const lines = [`• ${d.arc}`];
  if (visaCode === "D-2" || visaCode === "D-4") lines.push(`• ${d.permit}`);
  lines.push(`• ${d.bank}`);
  const extra = EXTRA_DOCS[industryKey]?.[lang];
  if (extra) lines.push(`• ${extra}`);
  return `📄 ${d.title}\n${lines.join("\n")}`;
}

const VISA_ALIASES: [string, string][] = [
  ["유학생", "D-2"], ["유학", "D-2"], ["대학생", "D-2"], ["대학원", "D-2"],
  ["어학연수", "D-4"], ["어학당", "D-4"], ["연수생", "D-4"], ["기술연수", "D-3"], ["구직", "D-10"],
  ["주재", "D-7"], ["기업투자", "D-8"], ["투자", "D-8"], ["무역", "D-9"],
  ["교수", "E-1"], ["회화지도", "E-2"], ["원어민강사", "E-2"], ["영어강사", "E-2"],
  ["연구", "E-3"], ["기술지도", "E-4"], ["전문직업", "E-5"], ["예술흥행", "E-6"],
  ["숙련기능", "E-7-4"], ["특정활동", "E-7"], ["계절근로비자", "E-8"], ["비전문취업", "E-9"], ["고용허가", "E-9"], ["선원", "E-10"],
  ["방문동거", "F-1"], ["거주비자", "F-2"], ["동반", "F-3"], ["재외동포", "F-4"], ["동포", "F-4"],
  ["영주", "F-5"], ["결혼이민", "F-6"], ["결혼", "F-6"], ["난민", "G-1"], ["인도적", "G-1"],
  ["워킹홀리데이", "H-1"], ["워홀", "H-1"], ["관광취업", "H-1"], ["방문취업", "H-2"],
  ["단기방문", "C-3"], ["단기취업", "C-4"], ["사증면제", "B-1"],
  ["student visa", "D-2"], ["study visa", "D-2"], ["language student", "D-4"], ["overseas korean", "F-4"], ["working holiday", "H-1"], ["permanent resident", "F-5"], ["marriage", "F-6"],
];

const INDUSTRY_ALIASES: [string, string][] = [
  ["농업", "agriculture"], ["농장", "agriculture"], ["농가", "agriculture"], ["과수원", "agriculture"], ["계절근로", "agriculture"], ["밭일", "agriculture"], ["비닐하우스", "agriculture"], ["farm", "agriculture"], ["agricultur", "agriculture"], ["nông nghiệp", "agriculture"], ["农场", "agriculture"], ["农业", "agriculture"], ["農業", "agriculture"], ["ferma", "agriculture"], ["ферм", "agriculture"],
  ["어업", "fishery"], ["양식장", "fishery"], ["수산", "fishery"], ["어선", "fishery"], ["fishing", "fishery"], ["fishery", "fishery"],
  ["식당", "restaurant"], ["음식점", "restaurant"], ["카페", "restaurant"], ["서빙", "restaurant"], ["주방", "restaurant"], ["바리스타", "restaurant"], ["리스토랑", "restaurant"], ["음식업", "restaurant"], ["restaurant", "restaurant"], ["cafe", "restaurant"], ["nhà hàng", "restaurant"], ["餐厅", "restaurant"], ["飲食店", "restaurant"], ["カフェ", "restaurant"], ["restoran", "restaurant"], ["ресторан", "restaurant"],
  ["편의점", "convenience"], ["마트", "convenience"], ["판매알바", "convenience"], ["convenience", "convenience"], ["cửa hàng tiện lợi", "convenience"], ["便利店", "convenience"], ["コンビニ", "convenience"],
  ["공장", "manufacturing"], ["제조업", "manufacturing"], ["생산직", "manufacturing"], ["조립", "manufacturing"], ["factory", "manufacturing"], ["manufactur", "manufacturing"], ["nhà máy", "manufacturing"], ["工厂", "manufacturing"], ["工場", "manufacturing"], ["zavod", "manufacturing"], ["завод", "manufacturing"], ["үйлдвэр", "manufacturing"],
  ["건설", "construction"], ["공사현장", "construction"], ["노가다", "construction"], ["현장일", "construction"], ["construction", "construction"], ["xây dựng", "construction"], ["建筑", "construction"], ["建设", "construction"], ["qurilish", "construction"], ["барилга", "construction"],
  ["배달", "delivery"], ["택배", "delivery"], ["라이더", "delivery"], ["대리운전", "delivery"], ["쿠팡이츠", "delivery"], ["배민", "delivery"], ["delivery", "delivery"], ["giao hàng", "delivery"], ["外卖", "delivery"], ["配達", "delivery"], ["yetkazib", "delivery"], ["хүргэлт", "delivery"],
  ["유흥", "entertainment"], ["노래방", "entertainment"], ["단란주점", "entertainment"], ["마사지", "entertainment"], ["술집서빙", "entertainment"], ["karaoke", "entertainment"], ["nightclub", "entertainment"], ["bar", "entertainment"],
  ["과외", "tutoring"], ["강사알바", "tutoring"], ["학원강사", "tutoring"], ["영어알바", "tutoring"], ["튜터", "tutoring"], ["tutor", "tutoring"], ["teaching", "tutoring"],
  ["사무보조", "office"], ["사무직", "office"], ["통번역", "office"], ["번역알바", "office"], ["office", "office"], ["translation", "office"], ["văn phòng", "office"], ["办公", "office"], ["事務", "office"],
  ["물류", "logistics"], ["창고", "logistics"], ["상하차", "logistics"], ["warehouse", "logistics"], ["logistics", "logistics"], ["kho", "logistics"], ["仓库", "logistics"], ["倉庫", "logistics"], ["ombor", "logistics"], ["агuuлах", "logistics"],
  ["호텔", "hotel"], ["숙박", "hotel"], ["모텔", "hotel"], ["게스트하우스", "hotel"], ["hotel", "hotel"], ["khách sạn", "hotel"], ["酒店", "hotel"], ["ホテル", "hotel"], ["mehmonxona", "hotel"], ["зочид буудал", "hotel"],
];

function extractVisaCode(msg: string): string | null {
  const m = msg.toUpperCase().match(/([ABCDEFGH])\s?-?\s?(\d{1,2})(?:\s?-?\s?(\d{1,2}))?/);
  if (m) {
    let code = `${m[1]}-${m[2]}`;
    if (m[3] && `${code}-${m[3]}` === "E-7-4") code = "E-7-4";
    return code;
  }
  const lower = msg.toLowerCase();
  for (const [alias, code] of VISA_ALIASES) if (lower.includes(alias.toLowerCase())) return code;
  return null;
}

function extractIndustry(msg: string): string | null {
  const lower = msg.toLowerCase();
  for (const [alias, key] of INDUSTRY_ALIASES) if (lower.includes(alias.toLowerCase())) return key;
  return null;
}

function sb(path: string) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_ANON_KEY")!;
  return fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } }).then((r) => r.json());
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });

  let lang: Lang = "ko";
  try {
    const body = await req.json().catch(() => ({}));
    const { message = "", action = "", visa_code = "" } = body;
    if (LANGS.includes(body.lang)) lang = body.lang;
    const ui = UI[lang], sl = STATUS_LABEL[lang];

    const help = { type: "help", answer: `${ui.help}\n\n${LANG_NOTICE[lang]}`, quick_replies: ["D-2 🌾", "D-2 🍽️", "F-4 🏭", "H-2 🌾", "F-5"].map((s) => s) };

    // 자세히 보기 — 상세답변도 다국어 지원 (visa_rules_i18n의 conditions/allowed_sectors/restrictions)
    if (action === "detail" && visa_code) {
      const [rule] = await sb(`visa_rules?visa_code=eq.${encodeURIComponent(visa_code)}&select=*`);
      if (!rule) return json(help);
      let cond = rule.conditions, sect = rule.allowed_sectors, restr = rule.restrictions;
      let fellBack = false;
      if (lang !== "ko") {
        const [tr] = await sb(`visa_rules_i18n?visa_code=eq.${encodeURIComponent(visa_code)}&lang=eq.${lang}&select=conditions,allowed_sectors,restrictions`);
        if (tr && (tr.conditions || tr.allowed_sectors || tr.restrictions)) {
          cond = tr.conditions ?? cond; sect = tr.allowed_sectors ?? sect; restr = tr.restrictions ?? restr;
        } else if (cond || sect || restr) {
          fellBack = true;
        }
      }
      const h = DETAIL_HEADERS[lang];
      const parts: string[] = [];
      if (cond) parts.push(`📋 ${h.cond}\n${cond}`);
      if (sect) parts.push(`🏢 ${h.sect}\n${sect}`);
      if (restr) parts.push(`🚫 ${h.restr}\n${restr}`);
      parts.push(`${ui.src}: ${rule.source_doc}`);
      if (fellBack && ui.ko_only) parts.push(ui.ko_only);
      return json({ type: "detail", visa_code: rule.visa_code, answer: parts.join("\n\n"), quick_replies: [ui.other] });
    }

    const msg = String(message).trim();
    if (!msg || /^(안녕|하이|hello|hi|help|도움|처음|xin chào|你好|こんにち|salom|сайн)/i.test(msg)) return json(help);

    const code = extractVisaCode(msg);
    const industryKey = extractIndustry(msg);

    if (!code && industryKey) {
      return json({ type: "need_visa", answer: ui.need_visa, quick_replies: [`D-2 ${industryKey}`, `D-4 ${industryKey}`, `F-4 ${industryKey}`, `H-2 ${industryKey}`] });
    }
    if (!code) {
      return json({ type: "unknown", answer: `${ui.unknown}\n\n${LANG_NOTICE[lang]}`, quick_replies: ["D-2", "D-4", "F-4", "H-2"] });
    }

    const [rule] = await sb(`visa_rules?visa_code=eq.${encodeURIComponent(code)}&select=*`);
    if (!rule) {
      return json({ type: "not_found", visa_code: code, answer: `${code}: ${ui.not_found}`, quick_replies: ["D-2", "F-4", "H-2"] });
    }

    // 다국어 비자명/답변
    let visaName = rule.visa_name_ko, shortAnswer = rule.short_answer;
    if (lang !== "ko") {
      const [tr] = await sb(`visa_rules_i18n?visa_code=eq.${encodeURIComponent(code)}&lang=eq.${lang}&select=visa_name,short_answer`);
      if (tr) { visaName = tr.visa_name; shortAnswer = tr.short_answer; }
    }

    if (industryKey) {
      const [ir] = await sb(`visa_industry_rules?visa_code=eq.${encodeURIComponent(code)}&industry_key=eq.${industryKey}&select=*`);
      if (ir) {
        let indLabel = ir.industry_label, indAnswer = ir.answer;
        if (lang !== "ko") {
          const [itr] = await sb(`visa_industry_rules_i18n?visa_code=eq.${encodeURIComponent(code)}&industry_key=eq.${industryKey}&lang=eq.${lang}&select=industry_label,answer`);
          if (itr) { indLabel = itr.industry_label; indAnswer = itr.answer; }
        }
        const docs = ir.status !== "prohibited" ? `\n\n${docsSection(lang, code, industryKey)}` : "";
        return json({
          type: "industry_answer", visa_code: code, visa_name: visaName, industry: industryKey, status: ir.status, status_label: sl[ir.status],
          answer: `${code} (${visaName}) × ${indLabel} · ${sl[ir.status]}\n\n${indAnswer}${docs}\n\n${ui.src}: ${ir.source_note}`,
          quick_replies: [ui.detail, ui.other],
        });
      }
      // 매트릭스 미등록 → 비자 전체 규칙 기반
      const dDocs = rule.employment_status !== "prohibited" ? `\n\n${docsSection(lang, code, industryKey)}` : "";
      return json({
        type: "industry_derived", visa_code: code, visa_name: visaName, industry: industryKey, status: rule.employment_status, status_label: sl[rule.employment_status],
        answer: `${code} (${visaName}) · ${sl[rule.employment_status]}\n\n${shortAnswer}${dDocs}\n\nHiKorea / ☎1345`,
        has_detail: true, quick_replies: [ui.detail, ui.other],
      });
    }

    const irs = await sb(`visa_industry_rules?visa_code=eq.${encodeURIComponent(code)}&select=industry_key&limit=3`);
    const chips = (irs || []).map((r: { industry_key: string }) => `${code} ${r.industry_key}`);
    return json({
      type: "answer", visa_code: rule.visa_code, visa_name: visaName, status: rule.employment_status, status_label: sl[rule.employment_status],
      answer: `${rule.visa_code} (${visaName}) · ${sl[rule.employment_status]}\n\n${shortAnswer}${chips.length ? `\n\n${ui.tip}` : ""}`,
      has_detail: !!(rule.conditions || rule.allowed_sectors || rule.restrictions),
      quick_replies: [...chips, ui.detail],
    });
  } catch (_e) {
    return json({ type: "error", answer: UI[lang].err }, 500);
  }
});
