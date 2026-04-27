// 지역·업종별 평균 급여 데이터 (실제로는 DB 집계/통계청 데이터로 대체)
export const MARKET_PAY = {
  "카페": {
    "서울 강남": { type: "시급", avg: 13000, median: 13000, min: 11000, max: 16000, count: 82 },
    "서울 홍대": { type: "시급", avg: 12500, median: 12000, min: 11000, max: 15000, count: 64 },
    "서울 이태원": { type: "시급", avg: 12800, median: 13000, min: 11500, max: 15000, count: 23 },
    "경기 수원": { type: "시급", avg: 11500, median: 11000, min: 10500, max: 13000, count: 41 },
    "부산": { type: "시급", avg: 11200, median: 11000, min: 10500, max: 13000, count: 38 },
    "기본": { type: "시급", avg: 12000, median: 12000, min: 10500, max: 15000, count: 230 },
  },
  "식당": {
    "서울 이태원": { type: "시급", avg: 12500, median: 12000, min: 11000, max: 15000, count: 56 },
    "서울 강남": { type: "시급", avg: 12800, median: 13000, min: 11500, max: 16000, count: 47 },
    "기본": { type: "시급", avg: 11800, median: 12000, min: 10500, max: 14000, count: 180 },
  },
  "편의점": {
    "서울": { type: "시급", avg: 11500, median: 11000, min: 10300, max: 13500, count: 95 },
    "기본": { type: "시급", avg: 10800, median: 10500, min: 10030, max: 13000, count: 312 },
  },
  "제조/생산": {
    "경기 안산": { type: "일급", avg: 128000, median: 130000, min: 110000, max: 150000, count: 74 },
    "경기 수원": { type: "일급", avg: 125000, median: 125000, min: 110000, max: 145000, count: 52 },
    "충남 천안": { type: "일급", avg: 122000, median: 120000, min: 105000, max: 140000, count: 41 },
    "기본": { type: "일급", avg: 120000, median: 120000, min: 100000, max: 150000, count: 245 },
  },
  "학원/과외": {
    "서울": { type: "시급", avg: 28000, median: 25000, min: 20000, max: 45000, count: 102 },
    "온라인": { type: "시급", avg: 25000, median: 25000, min: 18000, max: 40000, count: 168 },
    "기본": { type: "시급", avg: 25000, median: 25000, min: 18000, max: 40000, count: 270 },
  },
  "번역/통역": {
    "서울": { type: "시급", avg: 18000, median: 15000, min: 13000, max: 30000, count: 54 },
    "기본": { type: "시급", avg: 16500, median: 15000, min: 13000, max: 25000, count: 87 },
  },
  "호텔/서비스": {
    "서울 명동": { type: "시급", avg: 13500, median: 13000, min: 12000, max: 16000, count: 31 },
    "부산": { type: "시급", avg: 12800, median: 12500, min: 11500, max: 15000, count: 24 },
    "기본": { type: "시급", avg: 12800, median: 13000, min: 11500, max: 15000, count: 78 },
  },
  "농업": {
    "충남 논산": { type: "일급", avg: 165000, median: 170000, min: 140000, max: 200000, count: 48, note: "딸기/참외 수확철 강세" },
    "경기 평택": { type: "일급", avg: 195000, median: 200000, min: 150000, max: 250000, count: 32, note: "시설원예 중심" },
    "전남 해남": { type: "일급", avg: 150000, median: 150000, min: 130000, max: 180000, count: 67, note: "배추/마늘 작업" },
    "경북 안동": { type: "일급", avg: 155000, median: 150000, min: 130000, max: 185000, count: 29 },
    "기본": { type: "일급", avg: 160000, median: 160000, min: 130000, max: 220000, count: 240 },
  },
  "어업": {
    "경남 통영": { type: "일급", avg: 150000, median: 150000, min: 130000, max: 180000, count: 35, note: "굴 가공 중심" },
    "부산": { type: "일급", avg: 145000, median: 140000, min: 125000, max: 170000, count: 28 },
    "기본": { type: "일급", avg: 145000, median: 140000, min: 120000, max: 180000, count: 95 },
  },
  "건설": {
    "경기 화성": { type: "일급", avg: 185000, median: 180000, min: 150000, max: 230000, count: 52, note: "아파트 신축현장 다수" },
    "서울": { type: "일급", avg: 200000, median: 200000, min: 170000, max: 260000, count: 38 },
    "인천": { type: "일급", avg: 180000, median: 180000, min: 150000, max: 220000, count: 41 },
    "기본": { type: "일급", avg: 185000, median: 180000, min: 150000, max: 250000, count: 180 },
  },
  "이벤트직": {
    "서울 강남": { type: "일급", avg: 135000, median: 130000, min: 110000, max: 170000, count: 42 },
    "기본": { type: "일급", avg: 125000, median: 120000, min: 100000, max: 160000, count: 85 },
  },
  "물류/배달": {
    "경기 이천": { type: "시급", avg: 12800, median: 12500, min: 11000, max: 15000, count: 67, note: "물류센터 야간 할증" },
    "경기 광주": { type: "시급", avg: 12500, median: 12500, min: 11000, max: 14500, count: 38 },
    "기본": { type: "시급", avg: 12200, median: 12000, min: 10500, max: 14500, count: 180 },
  },
  "기타": { "기본": { type: "시급", avg: 11000, median: 11000, min: 10030, max: 14000, count: 120 } },
};

// 주소에서 지역 키워드 추출
export function extractRegion(addr) {
  if (!addr) return null;
  const keywords = Object.keys(MARKET_PAY).reduce(
    (acc, job) => [...acc, ...Object.keys(MARKET_PAY[job]).filter(k => k !== "기본")],
    []
  );
  for (const k of [...new Set(keywords)]) {
    if (addr.includes(k)) return k;
  }
  if (addr.includes("서울")) return "서울";
  if (addr.includes("부산")) return "부산";
  if (addr.includes("인천")) return "인천";
  return null;
}

export function getMarketPay(jobType, address) {
  const data = MARKET_PAY[jobType] || MARKET_PAY["기타"];
  const region = extractRegion(address);
  if (region && data[region]) return { ...data[region], region };
  return { ...data["기본"], region: "전국" };
}

// 업종별 챗봇 예시 프리셋
export const JOB_PRESETS = {
  "카페": { title: "카페 바리스타 모집 (외국인 환영)", workTypeHint: "정기 알바", payType: "시급", payEx: "12,000", addrEx: "서울 강남구 테헤란로 152", addrDEx: "1층 블루보틀 강남점", hoursEx: "14:00~20:00 (6시간)", daysHint: "평일 (월~금)", koreanHint: "초급 (기본 인사)", headHint: "2명", beneHint: "음료 무제한, 식사 제공, 유니폼 제공", descEx: "커피 음료 제조, 매장 청소, 재고 관리.\n카페 경험자 또는 바리스타 자격증 보유자 우대.", intro: "카페 업종이시군요! ☕\n카페 알바는 보통 시급 11,000~13,000원,\n하루 4~6시간, 주 3~5일 근무가 많아요." },
  "식당": { title: "한식당 서빙/주방보조 모집", workTypeHint: "정기 알바 또는 주말 알바", payType: "시급", payEx: "11,500", addrEx: "서울 용산구 이태원로 200", addrDEx: "이태원 정 본점", hoursEx: "17:00~22:00 (5시간)", daysHint: "주말 (토~일)", koreanHint: "중급 (업무 지시 이해)", headHint: "3명", beneHint: "식사 제공, 교통비 지원, 4대보험", descEx: "서빙, 테이블 세팅, 주방 보조 업무.\n식당 근무 경험자 우대.", intro: "식당 업종이시군요! 🍜\n식당 알바는 보통 시급 11,000~12,000원,\n점심/저녁 피크 시간 3~5시간 근무가 많아요." },
  "편의점": { title: "편의점 야간 알바 모집", workTypeHint: "야간 알바 또는 정기 알바", payType: "시급", payEx: "12,500", addrEx: "서울 서대문구 연세로 50", addrDEx: "CU 신촌점", hoursEx: "22:00~06:00 (8시간)", daysHint: "요일 협의", koreanHint: "초급 (기본 인사)", headHint: "1명", beneHint: "4대보험, 직원 할인", descEx: "계산, 진열, 재고 정리, 매장 청소.\nPOS 사용법 교육 제공.", intro: "편의점이시군요! 🏪\n편의점 알바는 보통 시급 10,500~12,500원,\n주간 6~8시간, 야간은 할증 적용돼요." },
  "제조/생산": { title: "공장 생산직 근무자 모집", workTypeHint: "정기 알바", payType: "일급", payEx: "120,000", addrEx: "경기 안산시 단원구 고잔로 51", addrDEx: "OO산업단지 3동", hoursEx: "08:00~17:00 (8시간)", daysHint: "평일 (월~금)", koreanHint: "초급 (기본 인사)", headHint: "5명", beneHint: "기숙사 제공, 식사 제공, 4대보험", descEx: "제품 조립, 검수, 포장 업무.\n경험 불문, 기숙사 무료 제공.", intro: "제조/생산 업종이시군요! 🏭\n공장 알바는 보통 일급 10만~15만원,\n주 5일 풀타임이 많아요." },
  "학원/과외": { title: "영어/중국어 과외 선생님 모집", workTypeHint: "정기 알바 또는 재택/온라인", payType: "시급", payEx: "25,000", addrEx: "온라인 (Zoom/카카오톡)", addrDEx: "없음", hoursEx: "17:00~19:00 (2시간)", daysHint: "요일 협의", koreanHint: "불필요 (못해도 OK)", headHint: "2명", beneHint: "없음", descEx: "초등~중학생 대상 영어/중국어 회화 수업.\n원어민 또는 해당 언어 능통자.", intro: "학원/과외 업종이시군요! 📚\n과외 알바는 보통 시급 20,000~35,000원,\n주 2~3회, 회당 1~2시간이 많아요." },
  "번역/통역": { title: "베트남어/중국어 번역 보조 모집", workTypeHint: "정기 알바 또는 재택/온라인", payType: "시급", payEx: "15,000", addrEx: "서울 종로구 종로 1", addrDEx: "OO무역 사무실 5층", hoursEx: "10:00~13:00 (3시간)", daysHint: "평일 (월~금)", koreanHint: "고급 (능통)", headHint: "1명", beneHint: "교통비 지원", descEx: "무역 서류 번역, 거래처 통역 보조.\nTOPIK 5급 이상.", intro: "번역/통역 업종이시군요! 🌐\n번역 알바는 보통 시급 13,000~20,000원,\n주 3~5회, 반일 근무가 많아요." },
  "호텔/서비스": { title: "호텔 프론트 데스크 직원 모집", workTypeHint: "정기 알바", payType: "시급", payEx: "13,000", addrEx: "서울 중구 을지로 100", addrDEx: "롯데호텔 명동 로비", hoursEx: "15:00~23:00 (8시간, 교대)", daysHint: "교대근무", koreanHint: "중급 (업무 지시 이해)", headHint: "2명", beneHint: "식사 제공, 유니폼 제공, 4대보험", descEx: "외국인 투숙객 체크인/체크아웃 안내.\n영어 필수.", intro: "호텔/서비스 업종이시군요! 🏨\n호텔 알바는 보통 시급 12,000~14,000원,\n교대근무가 많고 영어가 필수예요!" },
  "농업": { title: "딸기 수확 작업자 모집 (비닐하우스)", workTypeHint: "단기 알바 또는 일용직 알바", payType: "일급", payEx: "150,000", addrEx: "충남 논산시 강경읍", addrDEx: "OO농장 딸기 비닐하우스", hoursEx: "06:00~15:00 (8시간)", daysHint: "매일", koreanHint: "불필요 (못해도 OK)", headHint: "10명 이상", beneHint: "기숙사 제공, 식사 제공, 교통비 지원", descEx: "딸기 수확, 선별, 포장 작업.\n비닐하우스 내 작업, 숙소 무료, 3끼 식사.", intro: "농업이시군요! 🌾\n농업 알바는 보통 일급 12만~18만원,\n수확철에는 20만원 이상도 많아요.\n숙소 + 3끼 식사 제공이 일반적이에요!" },
  "어업": { title: "수산물 가공 작업자 모집", workTypeHint: "단기 알바 또는 정기 알바", payType: "일급", payEx: "140,000", addrEx: "경남 통영시 산양읍", addrDEx: "OO수산 가공공장", hoursEx: "05:00~14:00 (8시간)", daysHint: "평일 (월~금)", koreanHint: "불필요 (못해도 OK)", headHint: "5명", beneHint: "기숙사 제공, 식사 제공, 4대보험", descEx: "굴/멍게 등 수산물 손질, 포장 작업.\n경험 불문, 숙소 무료.", intro: "어업이시군요! 🐟\n어업/수산 알바는 보통 일급 12만~16만원,\n새벽 시작이 많고 숙소+식사 제공이 기본이에요!" },
  "건설": { title: "건설 현장 보조 인력 모집", workTypeHint: "일용직 알바 또는 단기 알바", payType: "일급", payEx: "180,000", addrEx: "경기 화성시 동탄", addrDEx: "OO건설 아파트 신축현장", hoursEx: "07:00~17:00 (9시간)", daysHint: "평일 (월~금)", koreanHint: "초급 (기본 인사)", headHint: "10명 이상", beneHint: "식사 제공, 교통비 지원, 4대보험", descEx: "자재 운반, 현장 정리, 보조 작업.\n안전장비 제공. 초보자도 가능.", intro: "건설 업종이시군요! 🏗️\n건설 일용직은 보통 일급 15만~22만원,\n기술자는 25만원 이상도 있어요!" },
  "이벤트직": { title: "주말 전시회 행사 스태프 모집", workTypeHint: "단기 알바 또는 주말 알바", payType: "일급", payEx: "130,000", addrEx: "서울 강남구 삼성동 COEX", addrDEx: "COEX 전시홀 A동", hoursEx: "09:00~18:00 (8시간)", daysHint: "주말 (토~일)", koreanHint: "초급 (기본 인사)", headHint: "5명", beneHint: "식사 제공, 교통비 지원, 유니폼 제공", descEx: "전시회 안내, 부스 세팅/정리, 물품 배포.\n외국어 가능자 추가 수당.", intro: "이벤트직이시군요! 🎪\n이벤트 알바는 보통 일급 10만~15만원,\n주말/공휴일 단기가 많아요!" },
  "물류/배달": { title: "물류센터 상품 분류/포장 알바 모집", workTypeHint: "정기 알바 또는 야간 알바", payType: "시급", payEx: "12,500", addrEx: "경기 이천시 마장면", addrDEx: "쿠팡 이천물류센터", hoursEx: "20:00~05:00 (8시간, 야간수당)", daysHint: "요일 협의", koreanHint: "불필요 (못해도 OK)", headHint: "10명 이상", beneHint: "교통비 지원, 식사 제공, 4대보험", descEx: "상품 분류, 검수, 포장, 적재 작업.\n셔틀버스 운행. 야간 할증 적용.", intro: "물류/배달이시군요! 📦\n물류센터는 보통 시급 11,000~13,000원,\n야간 할증 포함하면 더 높아요!" },
  "기타": { title: "알바 모집 (외국인 환영)", workTypeHint: "정기 알바", payType: "시급", payEx: "11,000", addrEx: "서울시", addrDEx: "", hoursEx: "협의", daysHint: "요일 협의", koreanHint: "초급 (기본 인사)", headHint: "1명", beneHint: "", descEx: "업무 내용을 자유롭게 작성해 주세요.", intro: "알겠습니다! 💼\n상세 정보를 입력해 주시면\n맞춤 공고를 만들어 드릴게요!" },
};

// 비자 유형 옵션
export const VISA_OPTIONS = [
  { v: "private", l: "🔒 비공개" },
  { v: "D-2", l: "D-2 (유학)" },
  { v: "D-4", l: "D-4 (어학연수)" },
  { v: "D-10", l: "D-10 (구직)" },
  { v: "E-7", l: "E-7 (특정활동)" },
  { v: "E-9", l: "E-9 (비전문취업)" },
  { v: "F-2", l: "F-2 (거주)" },
  { v: "F-4", l: "F-4 (재외동포)" },
  { v: "F-5", l: "F-5 (영주)" },
  { v: "F-6", l: "F-6 (결혼이민)" },
  { v: "H-1", l: "H-1 (워킹홀리데이)" },
  { v: "H-2", l: "H-2 (방문취업)" },
  { v: "other", l: "기타" },
];

export const COUNTRIES = ["베트남", "중국", "우즈베키스탄", "몽골", "일본", "캄보디아", "네팔", "필리핀", "태국", "인도네시아", "미얀마", "미국", "러시아", "기타"];
export const KOREAN_LEVELS = [
  { v: "none", l: "불필요 (한국어 못함)" },
  { v: "beginner", l: "초급 (기본 대화)" },
  { v: "intermediate", l: "중급 (업무 가능)" },
  { v: "advanced", l: "고급 (능통)" },
];
export const WORK_TYPES = ["정기 알바", "단기 알바", "주말 알바", "야간 알바", "일용직 알바", "재택/온라인"];
export const JOB_TYPES = ["카페", "식당", "편의점", "제조/생산", "학원/과외", "번역/통역", "호텔/서비스", "농업", "어업", "건설", "이벤트직", "물류/배달", "청소/가사", "기타"];
export const REGIONS = ["서울", "경기 북부", "경기 남부", "인천", "부산", "대구", "대전", "광주", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주", "전국 어디든"];
export const BENEFITS = ["식사 제공", "교통비 지원", "기숙사 제공", "4대보험", "유니폼 제공", "음료 무제한", "직원 할인", "인센티브", "자격증 취득 지원"];
