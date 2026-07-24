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
    ko: "건강진단결과서(구 보건증) — 보건소 발급, 식품 취급 필수",
    en: "Health certificate 'Geongang-jindan-gyeolgwaseo' (formerly bogeonjeung) — issued at a public health center, required for food handling",
    vi: "Giấy khám sức khỏe (bogeonjeung) — cấp tại trung tâm y tế công, bắt buộc khi tiếp xúc thực phẩm",
    zh: "健康证（보건증）— 保健所办理，接触食品必备",
    ja: "保健証（健康診断結果書）— 保健所で発給、食品取扱いに必須",
    uz: "Sog'liq guvohnomasi (bogeonjeung) — davlat sog'liqni saqlash markazidan, oziq-ovqat bilan ishlashda majburiy",
    mn: "Эрүүл мэндийн үнэмлэх (богонжын) — эрүүл мэндийн төвөөс, хоол хүнстэй ажиллахад заавал",
  },
  convenience: {
    ko: "건강진단결과서(구 보건증) — 조리식품 취급 시 필요 (보건소 발급)",
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

// 건강진단결과서(구 보건증) 발급 절차 상세 안내 (2026-07 보건소 기준 확인)
const HEALTH_GUIDE: Record<Lang, string> = {
  ko: "📋 건강진단결과서(구 보건증) 발급 안내\n\n식당·카페·편의점 등 식품을 다루는 알바는 근무 시작 전에 꼭 필요해요.\n\n1️⃣ 준비물: 외국인등록증 (⚠️ 여권은 안 돼요!) + 수수료 3,000원\n2️⃣ 방문: 가까운 보건소 (병원도 가능하지만 1~3만원으로 비쌈)\n3️⃣ 검사: 폐결핵(흉부X선)·장티푸스·파라티푸스 — 15~20분이면 끝\n4️⃣ 수령: 약 5일 후(주말 제외) 보건소 방문 또는 e보건소(e-health.go.kr) 온라인 발급\n\n⏰ 유효기간: 1년 — 만료 전 재검사 (재발급 300원, 인터넷 무료)\n💡 사장님께 제출할 사본도 준비하세요!",
  en: "📋 Health certificate (formerly 'bogeonjeung') — how to get it\n\nRequired BEFORE starting any job handling food (restaurant, cafe, convenience store).\n\n1️⃣ Bring: Alien Registration Card (⚠️ passport NOT accepted!) + 3,000 KRW fee\n2️⃣ Visit: a nearby public health center 'bogeonso' (hospitals work too but cost 10,000-30,000 KRW)\n3️⃣ Tests: chest X-ray (TB), typhoid, paratyphoid — takes 15-20 min\n4️⃣ Pick up: ~5 business days later at the center, or online at e-health.go.kr\n\n⏰ Valid for 1 year — retest before it expires (reissue 300 KRW, free online)\n💡 Prepare a copy for your employer!",
  vi: "📋 Hướng dẫn làm Giấy khám sức khỏe (bogeonjeung)\n\nBắt buộc TRƯỚC khi bắt đầu làm việc liên quan thực phẩm (nhà hàng, cafe, cửa hàng tiện lợi).\n\n1️⃣ Mang theo: Thẻ đăng ký người nước ngoài (⚠️ hộ chiếu KHÔNG được!) + phí 3.000 KRW\n2️⃣ Đến: trung tâm y tế công 'bogeonso' gần nhất (bệnh viện cũng được nhưng 10.000-30.000 KRW)\n3️⃣ Khám: X-quang phổi (lao), thương hàn, phó thương hàn — chỉ 15-20 phút\n4️⃣ Nhận: sau ~5 ngày làm việc tại trung tâm, hoặc online tại e-health.go.kr\n\n⏰ Hiệu lực: 1 năm — khám lại trước khi hết hạn (cấp lại 300 KRW, online miễn phí)\n💡 Chuẩn bị bản sao nộp cho chủ quán!",
  zh: "📋 健康证（건강진단결과서·原보건증）办理指南\n\n在餐厅、咖啡店、便利店等接触食品的工作开始前必须办理。\n\n1️⃣ 准备：外国人登录证（⚠️ 护照不可以！）+ 手续费3,000韩元\n2️⃣ 前往：附近保健所（医院也可以但要1~3万韩元）\n3️⃣ 检查：肺结核(胸部X光)、伤寒、副伤寒 — 只需15~20分钟\n4️⃣ 领取：约5个工作日后到保健所领取，或在e-health.go.kr在线打印\n\n⏰ 有效期：1年 — 到期前需重新检查（补发300韩元，网上免费）\n💡 记得准备一份复印件交给老板！",
  ja: "📋 健康診断結果書（旧 保健証）の取得方法\n\n飲食店・カフェ・コンビニなど食品を扱うバイトは勤務開始前に必須です。\n\n1️⃣ 持ち物：外国人登録証（⚠️ パスポートは不可！）＋手数料3,000ウォン\n2️⃣ 訪問：最寄りの保健所（病院でも可能ですが1~3万ウォン）\n3️⃣ 検査：肺結核(胸部X線)・腸チフス・パラチフス — 15~20分で終了\n4️⃣ 受取：約5営業日後に保健所で受取、またはe-health.go.krでオンライン発給\n\n⏰ 有効期間：1年 — 期限前に再検査（再発給300ウォン、ネットは無料）\n💡 店長に提出するコピーも準備しましょう！",
  uz: "📋 Sog'liq guvohnomasi (bogeonjeung) olish tartibi\n\nOziq-ovqat bilan ishlaydigan joyda (restoran, kafe, do'kon) ishlashdan OLDIN majburiy.\n\n1️⃣ Olib boring: Chet ellik ro'yxatga olish kartasi (⚠️ pasport bo'lmaydi!) + 3,000 von to'lov\n2️⃣ Boring: yaqin sog'liqni saqlash markazi 'bogeonso'ga (kasalxonada 10-30 ming von)\n3️⃣ Tekshiruv: o'pka rentgeni (sil), qorin tifi, paratif — 15-20 daqiqa\n4️⃣ Olish: ~5 ish kunidan keyin markazdan yoki e-health.go.kr saytidan\n\n⏰ Muddati: 1 yil — tugashidan oldin qayta tekshiruv (qayta olish 300 von, internetda bepul)\n💡 Ish beruvchiga nusxa tayyorlang!",
  mn: "📋 Эрүүл мэндийн үнэмлэх (богонжын) авах заавар\n\nХоол хүнстэй ажиллах газарт (ресторан, кафе, дэлгүүр) ажиллахаас ӨМНӨ заавал хэрэгтэй.\n\n1️⃣ Авч очих: Гадаад иргэний бүртгэлийн үнэмлэх (⚠️ паспорт болохгүй!) + 3,000 воны хураамж\n2️⃣ Очих газар: ойрын эрүүл мэндийн төв 'богонсо' (эмнэлэгт 1-3 түмэн вон)\n3️⃣ Шинжилгээ: уушгины рентген (сүрьеэ), балнад, паратиф — 15-20 минут\n4️⃣ Авах: ~5 ажлын өдрийн дараа төвөөс, эсвэл e-health.go.kr сайтаас\n\n⏰ Хүчинтэй хугацаа: 1 жил — дуусахаас өмнө дахин шинжилгээ (дахин авах 300 вон, онлайнаар үнэгүй)\n💡 Ажил олгогчид өгөх хуулбар бэлдээрэй!",
};

// '발급 방법' quick reply 라벨 (식품 업종 답변에 노출 — 클릭 시 위 가이드 응답)
const HEALTH_QR: Record<Lang, string> = {
  ko: "보건증 발급 방법", en: "How to get health cert", vi: "Cách làm giấy khám SK", zh: "如何办健康证", ja: "保健証の取り方", uz: "Guvohnoma olish yo'li", mn: "Үнэмлэх авах арга",
};
const HEALTH_KEYWORDS = /보건증|건강진단|health\s?cert|bogeonjeung|giấy khám|健康证|健康診断|保健証|guvohnoma|эрүүл мэндийн үнэмлэх/i;

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

    // 건강진단결과서(구 보건증) 발급 절차 문의
    if (HEALTH_KEYWORDS.test(msg)) {
      return json({ type: "health_cert", answer: HEALTH_GUIDE[lang], quick_replies: [ui.other] });
    }

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
        const foodQr = docs && (industryKey === "restaurant" || industryKey === "convenience") ? [HEALTH_QR[lang]] : [];
        return json({
          type: "industry_answer", visa_code: code, visa_name: visaName, industry: industryKey, status: ir.status, status_label: sl[ir.status],
          answer: `${code} (${visaName}) × ${indLabel} · ${sl[ir.status]}\n\n${indAnswer}${docs}\n\n${ui.src}: ${ir.source_note}`,
          quick_replies: [...foodQr, ui.detail, ui.other],
        });
      }
      // 매트릭스 미등록 → 비자 전체 규칙 기반
      const dDocs = rule.employment_status !== "prohibited" ? `\n\n${docsSection(lang, code, industryKey)}` : "";
      const dFoodQr = dDocs && (industryKey === "restaurant" || industryKey === "convenience") ? [HEALTH_QR[lang]] : [];
      return json({
        type: "industry_derived", visa_code: code, visa_name: visaName, industry: industryKey, status: rule.employment_status, status_label: sl[rule.employment_status],
        answer: `${code} (${visaName}) · ${sl[rule.employment_status]}\n\n${shortAnswer}${dDocs}\n\nHiKorea / ☎1345`,
        has_detail: true, quick_replies: [...dFoodQr, ui.detail, ui.other],
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
