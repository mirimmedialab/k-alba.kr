// 업종별 직무 한국어 문제은행 (듣기·읽기 포함)
// 문항 형태: { type: "expr"|"usage"|"reading"|"listening", q, choices, answer, kind:"korean",
//            passage?(읽기 지문), tts?(듣기 재생 텍스트 — 화면에 표시하지 않음) }
// 듣기는 브라우저 음성합성(ko-KR)으로 재생 — 별도 오디오 파일 불필요.

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function mcq(base, correct, distractors) {
  const ds = [...new Set(distractors.filter((d) => d && d !== correct))].slice(0, 3);
  if (ds.length < 2) return null;
  const choices = shuffle([correct, ...ds]);
  return { ...base, choices, answer: choices.indexOf(correct), kind: "korean" };
}

// ── 업종별 핵심 표현 (의미·상황 문항 소스) ──
const EXPRS = {
  convenience: [
    { ko: "어서오세요", en: "Welcome! (greeting a customer)", when: "손님이 매장에 들어올 때" },
    { ko: "봉투 필요하세요?", en: "Do you need a bag?", when: "계산 시 봉투가 필요한지 물어볼 때" },
    { ko: "신분증 확인 부탁드립니다", en: "May I see your ID, please?", when: "술·담배 구매 손님의 나이를 확인할 때" },
    { ko: "적립카드 있으세요?", en: "Do you have a point card?", when: "포인트 적립 여부를 물어볼 때" },
    { ko: "결제 도와드리겠습니다", en: "I'll help you with the payment", when: "계산을 시작할 때" },
    { ko: "영수증 드릴까요?", en: "Would you like a receipt?", when: "계산 후 영수증이 필요한지 물어볼 때" },
    { ko: "전자레인지에 데워드릴까요?", en: "Would you like it heated in the microwave?", when: "도시락·간편식을 구매한 손님에게" },
    { ko: "품절입니다", en: "It's sold out", when: "찾는 상품의 재고가 없을 때" },
    { ko: "행사 상품입니다", en: "This item is on promotion (1+1 etc.)", when: "1+1·2+1 행사 상품을 안내할 때" },
    { ko: "감사합니다. 또 오세요", en: "Thank you. Please come again", when: "계산을 마친 손님을 배웅할 때" },
  ],
  cafe: [
    { ko: "주문 도와드릴까요?", en: "May I take your order?", when: "손님의 주문을 받을 때" },
    { ko: "드시고 가세요?", en: "For here (dine in)?", when: "매장 이용인지 확인할 때" },
    { ko: "포장해 드릴까요?", en: "Would you like it to go (takeout)?", when: "테이크아웃 여부를 물어볼 때" },
    { ko: "아이스로 드릴까요, 따뜻한 걸로 드릴까요?", en: "Iced or hot?", when: "음료 온도를 확인할 때" },
    { ko: "사이즈는 어떤 걸로 하시겠어요?", en: "Which size would you like?", when: "음료 사이즈를 확인할 때" },
    { ko: "진동벨 울리면 찾으러 와주세요", en: "Please come pick it up when the buzzer rings", when: "진동벨을 건네줄 때" },
    { ko: "샷 추가하시겠어요?", en: "Would you like an extra shot?", when: "에스프레소 샷 추가 여부를 물어볼 때" },
    { ko: "휘핑 올려드릴까요?", en: "Would you like whipped cream on top?", when: "휘핑크림 추가 여부를 물어볼 때" },
    { ko: "주문하신 음료 나왔습니다", en: "Your drink is ready", when: "완성된 음료를 픽업대에서 안내할 때" },
    { ko: "뜨거우니 조심하세요", en: "It's hot, please be careful", when: "뜨거운 음료를 건넬 때" },
  ],
  restaurant: [
    { ko: "몇 분이세요?", en: "How many people?", when: "입장한 손님의 인원을 확인할 때" },
    { ko: "이쪽으로 앉으세요", en: "Please have a seat over here", when: "손님을 자리로 안내할 때" },
    { ko: "주문하시겠어요?", en: "Are you ready to order?", when: "메뉴 주문을 받을 때" },
    { ko: "덜 맵게 해드릴까요?", en: "Would you like it less spicy?", when: "매운 정도를 조절해줄지 물어볼 때" },
    { ko: "리필 되나요?라고 물으시면 '네, 됩니다'", en: "Yes, refills are available", when: "반찬·음료 리필 문의에 답할 때" },
    { ko: "음식 나왔습니다", en: "Here is your food", when: "음식을 서빙할 때" },
    { ko: "뜨겁습니다, 조심하세요", en: "It's hot, please be careful", when: "뜨거운 음식을 내려놓을 때" },
    { ko: "맛있게 드세요", en: "Enjoy your meal", when: "서빙을 마치고 인사할 때" },
    { ko: "포장 되나요?라고 물으시면 '네, 포장 가능합니다'", en: "Yes, takeout is available", when: "남은 음식 포장 문의에 답할 때" },
    { ko: "계산은 카운터에서 부탁드립니다", en: "Please pay at the counter", when: "계산 위치를 안내할 때" },
  ],
};

// ── 읽기 문항 (지문 + 질문) ──
const READINGS = {
  convenience: [
    { passage: "[폐기 안내]\n삼각김밥: 오늘 14:00 폐기\n샌드위치: 오늘 18:00 폐기\n우유: 내일 09:00 폐기", q: "오늘 오후 6시에 폐기해야 하는 상품은?", correct: "샌드위치", wrong: ["삼각김밥", "우유", "도시락"] },
    { passage: "[행사 안내]\n바나나우유 1+1 (7/1~7/31)\n초코과자 2+1 (7/15~7/20)", q: "7월 25일에 진행 중인 행사는?", correct: "바나나우유 1+1", wrong: ["초코과자 2+1", "행사 없음", "전 품목 할인"] },
    { passage: "[교대 근무표]\n오전: 09:00~14:00 김OO\n오후: 14:00~19:00 NGUYEN\n야간: 19:00~24:00 박OO", q: "NGUYEN의 근무 시간은?", correct: "14:00~19:00", wrong: ["09:00~14:00", "19:00~24:00", "24:00~09:00"] },
    { passage: "[주의]\n술·담배는 반드시 신분증 확인 후 판매하세요.\n미성년자 판매 시 영업정지 처분을 받습니다.", q: "이 안내문의 내용으로 알맞은 것은?", correct: "술·담배는 신분증 확인 후 판매해야 한다", wrong: ["술·담배는 할인 판매할 수 있다", "미성년자는 담배만 살 수 있다", "신분증 확인은 선택사항이다"] },
    { passage: "[냉장고 온도 점검]\n매일 오전 10시, 오후 4시 냉장고 온도를 확인하고 기록지에 적으세요.\n온도가 10도 이상이면 바로 점장님께 연락하세요.", q: "냉장고 온도가 12도일 때 해야 할 일은?", correct: "바로 점장님께 연락한다", wrong: ["기록만 하고 넘어간다", "냉장고를 끈다", "퇴근 후에 말한다"] },
  ],
  cafe: [
    { passage: "[주문서]\n아이스 아메리카노 (L) 1잔 — 샷 추가\n따뜻한 카페라떼 (M) 1잔 — 휘핑 없이", q: "주문서 내용으로 알맞은 것은?", correct: "아메리카노에 샷을 추가한다", wrong: ["카페라떼에 휘핑을 올린다", "아메리카노는 따뜻하게 만든다", "라떼는 L 사이즈다"] },
    { passage: "[우유 보관 안내]\n개봉한 우유는 냉장 보관, 개봉 후 3일 이내 사용.\n유통기한이 지난 우유는 즉시 폐기.", q: "개봉한 우유의 사용 기한은?", correct: "개봉 후 3일 이내", wrong: ["개봉 후 7일 이내", "유통기한과 상관없이 사용 가능", "개봉 당일만"] },
    { passage: "[알레르기 안내]\n녹차라떼: 우유 포함\n딸기스무디: 우유 없음\n초코쿠키: 견과류 포함", q: "우유 알레르기가 있는 손님에게 권할 수 있는 메뉴는?", correct: "딸기스무디", wrong: ["녹차라떼", "초코쿠키와 녹차라떼", "모든 메뉴 불가"] },
    { passage: "[마감 체크리스트]\n1. 머신 세척  2. 우유 냉장 보관  3. 원두통 밀봉  4. 포스 정산", q: "마감 체크리스트에 없는 일은?", correct: "신메뉴 개발", wrong: ["머신 세척", "포스 정산", "원두통 밀봉"] },
    { passage: "[사이즈 안내]\nS(스몰) 355ml / M(미디엄) 473ml / L(라지) 591ml", q: "473ml에 해당하는 사이즈는?", correct: "M(미디엄)", wrong: ["S(스몰)", "L(라지)", "XL(엑스라지)"] },
  ],
  restaurant: [
    { passage: "[오늘의 품절 메뉴]\n김치찌개 — 품절\n된장찌개 — 주문 가능\n제육볶음 — 오후 6시 이후 품절", q: "오후 7시에 주문할 수 있는 메뉴는?", correct: "된장찌개", wrong: ["김치찌개", "제육볶음", "모든 메뉴"] },
    { passage: "[홀 서빙 순서]\n1. 물과 수저 세팅  2. 반찬 제공  3. 메인 음식 서빙  4. 후식 안내", q: "메인 음식보다 먼저 해야 하는 일은?", correct: "반찬 제공", wrong: ["후식 안내", "계산", "테이블 정리"] },
    { passage: "[위생 규칙]\n주방 출입 시 손 세척 → 위생장갑 착용 → 앞치마 착용 순서를 지키세요.", q: "주방에서 가장 먼저 해야 하는 일은?", correct: "손 세척", wrong: ["위생장갑 착용", "앞치마 착용", "칼 준비"] },
    { passage: "[예약 안내]\n6시 30분 4명 창가 자리 (이OO님)\n7시 2명 홀 (WANG님)", q: "7시에 오는 손님의 인원은?", correct: "2명", wrong: ["4명", "6명", "예약 없음"] },
    { passage: "[알레르기 주의]\n해물파전: 새우·오징어 포함\n감자전: 해물 없음", q: "새우 알레르기 손님에게 권할 수 있는 메뉴는?", correct: "감자전", wrong: ["해물파전", "둘 다 가능", "둘 다 불가"] },
  ],
};

// ── 듣기 문항 (음성 재생 텍스트 + 질문) ──
const LISTENINGS = {
  convenience: [
    { tts: "봉투 하나 주시고요, 이 도시락 데워주세요.", q: "손님이 요청한 것은?", correct: "봉투 1개와 도시락 데우기", wrong: ["봉투 2개", "영수증 출력", "도시락 환불"] },
    { tts: "담배 한 갑 주세요.", q: "이때 알바생이 가장 먼저 해야 할 일은?", correct: "신분증 확인을 요청한다", wrong: ["바로 담배를 준다", "봉투에 담아준다", "포인트를 적립한다"] },
    { tts: "이거 유통기한이 지났는데요, 환불해 주세요.", q: "손님이 원하는 것은?", correct: "환불", wrong: ["교환", "포장", "적립"] },
    { tts: "만 오천 원입니다. 카드로 결제하시겠어요?", q: "결제 금액은 얼마인가요?", correct: "15,000원", wrong: ["5,000원", "50,000원", "1,500원"] },
    { tts: "바나나우유는 지금 원 플러스 원 행사 중입니다.", q: "안내한 내용으로 알맞은 것은?", correct: "바나나우유가 1+1 행사 중이다", wrong: ["바나나우유가 품절이다", "바나나우유가 2+1 행사 중이다", "바나나우유 가격이 올랐다"] },
  ],
  cafe: [
    { tts: "아이스 아메리카노 두 잔 포장해 주세요.", q: "손님의 주문으로 알맞은 것은?", correct: "아이스 아메리카노 2잔 포장", wrong: ["따뜻한 아메리카노 2잔 매장", "아이스 라떼 1잔 포장", "아메리카노 3잔 매장"] },
    { tts: "따뜻한 카페라떼 라지 사이즈로 하나, 샷 추가해 주세요.", q: "주문 내용으로 알맞은 것은?", correct: "핫 카페라떼 L, 샷 추가", wrong: ["아이스 카페라떼 L", "핫 카페라떼 S, 휘핑 추가", "핫 아메리카노 L"] },
    { tts: "주문하신 음료 나왔습니다. 뜨거우니 조심하세요.", q: "이 말을 하는 상황은?", correct: "완성된 뜨거운 음료를 건넬 때", wrong: ["주문을 받을 때", "계산할 때", "매장을 청소할 때"] },
    { tts: "죄송합니다. 딸기스무디는 지금 재료가 없어서 안 됩니다.", q: "안내한 내용으로 알맞은 것은?", correct: "딸기스무디는 품절이다", wrong: ["딸기스무디는 할인 중이다", "딸기스무디는 포장만 된다", "딸기스무디는 곧 나온다"] },
    { tts: "진동벨 울리면 픽업대에서 찾아가세요.", q: "손님이 음료를 받는 곳은?", correct: "픽업대", wrong: ["카운터", "테이블", "주방"] },
  ],
  restaurant: [
    { tts: "세 명이고요, 창가 자리로 부탁드려요.", q: "손님의 요청으로 알맞은 것은?", correct: "3명, 창가 자리", wrong: ["2명, 홀 자리", "4명, 룸", "3명, 포장"] },
    { tts: "김치찌개 둘, 된장찌개 하나 주세요. 김치찌개는 덜 맵게요.", q: "주문 내용으로 알맞은 것은?", correct: "김치찌개 2(덜 맵게), 된장찌개 1", wrong: ["김치찌개 1, 된장찌개 2", "김치찌개 2(더 맵게)", "된장찌개 3"] },
    { tts: "여기 반찬 리필 되나요?", q: "손님이 물어본 것은?", correct: "반찬을 더 받을 수 있는지", wrong: ["계산이 되는지", "포장이 되는지", "예약이 되는지"] },
    { tts: "남은 음식 포장해 주세요.", q: "손님이 원하는 것은?", correct: "남은 음식 포장", wrong: ["환불", "새 음식 주문", "메뉴 추천"] },
    { tts: "음식이 아직 안 나왔는데 얼마나 걸릴까요?", q: "이때 알맞은 대답은?", correct: "확인해 보겠습니다. 잠시만 기다려 주세요", wrong: ["안녕히 가세요", "어서오세요", "맛있게 드세요"] },
  ],
};

export const KOREAN_INDUSTRIES = [
  { key: "convenience", label: "🏪 편의점" },
  { key: "cafe", label: "☕ 커피전문점" },
  { key: "restaurant", label: "🍽 음식점" },
];

/** 업종별 직무 한국어 20~30문항 생성 (표현 의미·상황 + 읽기 + 듣기) */
export function generateIndustryKoreanQuiz(industry, { max = 30 } = {}) {
  const exprs = EXPRS[industry] || [];
  const readings = READINGS[industry] || [];
  const listenings = LISTENINGS[industry] || [];
  const out = [];

  // 표현: 의미 + 상황 (10개 표현 × 2 = 20)
  for (const e of exprs) {
    out.push(mcq({ type: "expr", q: `'${e.ko}'의 의미로 알맞은 것은?`, auto: true }, e.en, shuffle(exprs.filter((x) => x !== e).map((x) => x.en)).slice(0, 3)));
    out.push(mcq({ type: "usage", q: `${e.when} 알맞은 표현은?`, auto: true }, e.ko, shuffle(exprs.filter((x) => x !== e).map((x) => x.ko)).slice(0, 3)));
  }
  // 읽기 (5)
  for (const r of readings) {
    out.push(mcq({ type: "reading", q: r.q, passage: r.passage, auto: true }, r.correct, r.wrong));
  }
  // 듣기 (5)
  for (const l of listenings) {
    out.push(mcq({ type: "listening", q: l.q, tts: l.tts, auto: true }, l.correct, l.wrong));
  }

  return out.filter(Boolean).slice(0, max);
}
