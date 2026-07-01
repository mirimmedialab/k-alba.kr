// 공고 관련 다국어: 비자 코드 의미 + 고정 안내문구
// (대용량 locale 파일을 건드리지 않고 한 곳에 모아 관리. ko/en/vi/zh/uz/mn/ja)

const VISA_LABELS = {
  "D-2":  { ko: "유학",        en: "Study abroad",            vi: "Du học",              zh: "留学",       uz: "Tahsil",                 mn: "Суралцах",                 ja: "留学" },
  "D-4":  { ko: "어학연수",    en: "Language training",       vi: "Du học tiếng",        zh: "语言研修",   uz: "Til kursi",              mn: "Хэлний сургалт",           ja: "語学研修" },
  "D-8":  { ko: "투자",        en: "Investment",              vi: "Đầu tư",              zh: "投资",       uz: "Investitsiya",           mn: "Хөрөнгө оруулалт",         ja: "投資" },
  "D-10": { ko: "구직",        en: "Job seeking",             vi: "Tìm việc",            zh: "求职",       uz: "Ish qidirish",           mn: "Ажил хайх",                ja: "求職" },
  "E-7":  { ko: "특정활동",    en: "Specified activity",      vi: "Hoạt động đặc định",  zh: "特定活动",   uz: "Maxsus faoliyat",        mn: "Тодорхой үйл ажиллагаа",   ja: "特定活動" },
  "E-8":  { ko: "계절근로",    en: "Seasonal work",           vi: "Lao động thời vụ",    zh: "季节性劳务", uz: "Mavsumiy ish",           mn: "Улирлын ажил",             ja: "季節労働" },
  "E-9":  { ko: "비전문취업",  en: "Non-professional work",   vi: "Lao động phổ thông",  zh: "非专业就业", uz: "Malakasiz ish",          mn: "Мэргэжлийн бус ажил",      ja: "非専門就労" },
  "F-2":  { ko: "거주",        en: "Residence",               vi: "Cư trú",              zh: "居住",       uz: "Yashash",                mn: "Оршин суух",               ja: "居住" },
  "F-4":  { ko: "재외동포",    en: "Overseas Korean",         vi: "Kiều bào Hàn",        zh: "在外同胞",   uz: "Chet eldagi koreys",     mn: "Гадаад дахь солонгос",     ja: "在外同胞" },
  "F-5":  { ko: "영주",        en: "Permanent residence",     vi: "Thường trú",          zh: "永住",       uz: "Doimiy yashash",         mn: "Байнга оршин суух",        ja: "永住" },
  "F-6":  { ko: "결혼이민",    en: "Marriage migrant",        vi: "Kết hôn di trú",      zh: "结婚移民",   uz: "Nikoh muhojiri",         mn: "Гэрлэлтийн цагаач",        ja: "結婚移民" },
  "H-2":  { ko: "방문취업",    en: "Working visit",           vi: "Thăm thân & làm việc", zh: "访问就业",  uz: "Tashrif-ish",            mn: "Зочлох ажил",              ja: "訪問就業" },
  "C-4":  { ko: "단기취업",    en: "Short-term work",         vi: "Việc ngắn hạn",       zh: "短期就业",   uz: "Qisqa muddatli ish",     mn: "Богино хугацааны ажил",    ja: "短期就労" },
  "G-1":  { ko: "기타",        en: "Other",                   vi: "Khác",                zh: "其他",       uz: "Boshqa",                 mn: "Бусад",                    ja: "その他" },
};

const NOTICES = {
  legalOnly: {
    ko: "K-ALBA는 비자에 맞는 합법 알바만 안내합니다.",
    en: "K-ALBA only lists legal jobs that match your visa.",
    vi: "K-ALBA chỉ giới thiệu việc làm hợp pháp phù hợp với visa của bạn.",
    zh: "K-ALBA 仅推荐符合您签证的合法兼职。",
    uz: "K-ALBA faqat vizangizga mos qonuniy ishlarni ko‘rsatadi.",
    mn: "K-ALBA нь таны визэнд тохирох хууль ёсны ажлыг л санал болгоно.",
    ja: "K-ALBAはビザに合った合法的なバイトのみご案内します。",
  },
  legalCheckBadge: {
    ko: "위 비자 뱃지로 지원 가능 여부를 먼저 확인하세요.",
    en: "Check the visa badges above to see if you can apply.",
    vi: "Hãy kiểm tra huy hiệu visa ở trên để biết bạn có thể ứng tuyển không.",
    zh: "请先通过上方签证标签确认是否可以申请。",
    uz: "Avval yuqoridagi viza belgilaridan ariza topshira olishingizni tekshiring.",
    mn: "Дээрх визийн тэмдгээр өргөдөл гаргах боломжтой эсэхээ эхэлж шалгаарай.",
    ja: "上のビザバッジで応募可能かどうかをまず確認してください。",
  },
};

const FALLBACK = "ko";

/** 비자 코드의 의미를 현재 언어로 반환. 없으면 "" */
export function visaMeaning(code, locale) {
  const m = VISA_LABELS[String(code || "").toUpperCase()];
  if (!m) return "";
  return m[locale] || m[FALLBACK] || "";
}

/** 공고 고정 안내문구를 현재 언어로 반환 */
export function jobNotice(key, locale) {
  const n = NOTICES[key];
  if (!n) return "";
  return n[locale] || n[FALLBACK] || "";
}

// '가까운순' 안내 문구 (반경 km는 {km}로 치환)
const NEARBY_NOTICE = {
  ko: "📍 내 위치에서 반경 {km}km 이내 공고를 가까운 순으로 보여드려요. 더 많은 공고는 ‘최신순’에서 볼 수 있어요.",
  en: "📍 Showing jobs within {km} km of your location, nearest first. For more listings, choose ‘Latest’.",
  vi: "📍 Đang hiển thị việc làm trong bán kính {km} km quanh bạn, gần nhất trước. Xem thêm ở mục ‘Mới nhất’.",
  zh: "📍 正在显示您所在位置 {km} 公里内的职位，由近到远。查看更多请选择“最新”。",
  uz: "📍 Joylashuvingizdan {km} km radiusdagi ishlar, eng yaqini birinchi. Ko‘proq uchun ‘Eng yangi’ni tanlang.",
  mn: "📍 Таны байршлаас {km} км доторх ажлыг ойрын дарааллаар харуулж байна. Илүү ихийг ‘Шинэ’-ээс үзнэ үү.",
  ja: "📍 現在地から半径{km}km以内の求人を近い順に表示しています。もっと見るには「新着順」を選んでください。",
};

/** '가까운순' 안내 문구를 현재 언어로 반환 */
export function nearestNotice(locale, km = 50) {
  const n = NEARBY_NOTICE[locale] || NEARBY_NOTICE[FALLBACK];
  return n.replace("{km}", km);
}
