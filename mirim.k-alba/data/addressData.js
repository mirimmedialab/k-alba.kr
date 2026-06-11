// 카카오 주소 검색 샘플 데이터 (실제 배포 시 Daum Postcode API로 교체)
export const KAKAO_ADDR_DB = [
  { addr: "서울 강남구 테헤란로 152", road: "테헤란로 152", jibun: "역삼동 737", zip: "06236", building: "강남파이낸스센터" },
  { addr: "서울 강남구 역삼로 180", road: "역삼로 180", jibun: "역삼동 825", zip: "06253", building: "" },
  { addr: "서울 용산구 이태원로 200", road: "이태원로 200", jibun: "이태원동 34-86", zip: "04348", building: "" },
  { addr: "서울 중구 을지로 100", road: "을지로 100", jibun: "을지로2가 50", zip: "04513", building: "파인에비뉴 B동" },
  { addr: "서울 서대문구 연세로 50", road: "연세로 50", jibun: "신촌동 134", zip: "03722", building: "연세대학교" },
  { addr: "서울 마포구 양화로 45", road: "양화로 45", jibun: "서교동 489", zip: "04157", building: "메세나폴리스" },
  { addr: "서울 관악구 관악로 1", road: "관악로 1", jibun: "신림동 산 56-1", zip: "08826", building: "서울대학교" },
  { addr: "경기 수원시 팔달구 인계로 178", road: "인계로 178", jibun: "인계동 1126-6", zip: "16438", building: "" },
  { addr: "경기 안산시 단원구 고잔로 51", road: "고잔로 51", jibun: "고잔동 536", zip: "15335", building: "OO산업단지" },
  { addr: "경기 평택시 평남로 1036", road: "평남로 1036", jibun: "동삭동 495", zip: "17914", building: "농업기술센터" },
  { addr: "경기 이천시 마장면 덕이로 154", road: "덕이로 154", jibun: "덕이리 15", zip: "17388", building: "쿠팡 물류센터" },
  { addr: "경기 화성시 동탄지성로 180", road: "동탄지성로 180", jibun: "청계동 541", zip: "18469", building: "" },
  { addr: "인천 남동구 구월로 120", road: "구월로 120", jibun: "구월동 1129", zip: "21554", building: "" },
  { addr: "부산 해운대구 해운대로 570", road: "해운대로 570", jibun: "우동 620", zip: "48094", building: "" },
  { addr: "대구 북구 대학로 80", road: "대학로 80", jibun: "산격동 1370", zip: "41566", building: "" },
  { addr: "충남 논산시 강경읍 계백로 99", road: "계백로 99", jibun: "홍교리 65", zip: "32944", building: "OO농장" },
  { addr: "충남 천안시 동남구 대흥로 215", road: "대흥로 215", jibun: "대흥동 400", zip: "31143", building: "" },
  { addr: "전남 해남군 해남읍 중앙1로 330", road: "중앙1로 330", jibun: "성내리 1", zip: "59042", building: "" },
  { addr: "경북 안동시 경동로 1375", road: "경동로 1375", jibun: "송천동 388", zip: "36729", building: "" },
  { addr: "경남 통영시 산양읍 산양일주로 1115", road: "산양일주로 1115", jibun: "남평리 80", zip: "53003", building: "OO수산" },
  { addr: "제주 제주시 제주대학로 102", road: "제주대학로 102", jibun: "아라일동 1", zip: "63243", building: "제주대학교" },
];

export function searchAddress(query) {
  if (!query || query.length < 1) return [];
  const q = query.trim();
  return KAKAO_ADDR_DB.filter(a =>
    a.addr.includes(q) || a.road.includes(q) || (a.building && a.building.includes(q))
  ).slice(0, 8);
}
