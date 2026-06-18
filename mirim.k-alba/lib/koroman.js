/**
 * 한글 → 로마자(국립국어원 로마자 표기법 근사) 변환.
 *  - 지역/주소/회사명 "읽는 법"을 LLM 없이 즉시·일관되게 표기하기 위함.
 *  - 음절 단위 매핑(연음/동화 일부 생략) + 행정구역 접미사 하이픈 처리.
 */
const CHO = ["g","kk","n","d","tt","r","m","b","pp","s","ss","","j","jj","ch","k","t","p","h"];
const JUNG = ["a","ae","ya","yae","eo","e","yeo","ye","o","wa","wae","oe","yo","u","wo","we","wi","yu","eu","ui","i"];
const JONG = ["","k","kk","ks","n","nj","nh","t","l","lk","lm","lb","ls","lt","lp","lh","m","p","ps","t","t","ng","t","t","k","t","p","h"];

// 시·도 공식 표기(정확도 보장용 오버라이드)
const OVERRIDE = {
  "서울":"Seoul","서울특별시":"Seoul","부산":"Busan","대구":"Daegu","인천":"Incheon",
  "광주":"Gwangju","대전":"Daejeon","울산":"Ulsan","세종":"Sejong",
  "경기":"Gyeonggi","경기도":"Gyeonggi-do","강원":"Gangwon","강원도":"Gangwon-do",
  "충북":"Chungbuk","충청북도":"Chungcheongbuk-do","충남":"Chungnam","충청남도":"Chungcheongnam-do",
  "전북":"Jeonbuk","전라북도":"Jeollabuk-do","전남":"Jeonnam","전라남도":"Jeollanam-do",
  "경북":"Gyeongbuk","경상북도":"Gyeongsangbuk-do","경남":"Gyeongnam","경상남도":"Gyeongsangnam-do",
  "제주":"Jeju","제주도":"Jeju-do","제주특별자치도":"Jeju-do",
};

const SUFFIX = new Set(["도","시","군","구","읍","면","동","리","로","길","가","읍면"]);

function romanizeSyllable(code) {
  const s = code - 0xac00;
  const cho = Math.floor(s / 588);
  const jung = Math.floor((s % 588) / 28);
  const jong = s % 28;
  return CHO[cho] + JUNG[jung] + JONG[jong];
}

function isHangul(ch) {
  const c = ch.charCodeAt(0);
  return c >= 0xac00 && c <= 0xd7a3;
}

function capitalizeWords(str) {
  return str.replace(/(^|[\s(])([a-z])/g, (m, p, c) => p + c.toUpperCase());
}

/**
 * 임의의 한글 문자열을 로마자로. 한글이 아니면 그대로 통과.
 * 행정구역 접미사(도/시/군/구 등) 앞에는 하이픈을 넣어 가독성을 높임.
 */
export function romanizeKo(text) {
  if (!text) return "";
  let out = "";
  const chars = Array.from(String(text));
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (isHangul(ch)) {
      let roman = romanizeSyllable(ch.charCodeAt(0));
      // 접미사면 앞에 하이픈(앞 글자가 한글일 때만)
      if (SUFFIX.has(ch) && i > 0 && isHangul(chars[i - 1])) {
        out += "-" + roman;
      } else {
        out += roman;
      }
    } else {
      out += ch;
    }
  }
  return capitalizeWords(out);
}

/**
 * 지역 문자열 로마자화: 토큰별 오버라이드 우선, 없으면 romanizeKo.
 * 예) "경기도 화성시 만세구" → "Gyeonggi-do Hwaseong-si Manse-gu"
 */
export function romanizeRegion(text) {
  if (!text) return "";
  return String(text)
    .split(/\s+/)
    .map((tok) => OVERRIDE[tok] || romanizeKo(tok))
    .join(" ")
    .trim();
}

/**
 * 회사명 읽는 법: 법인 형태 표기를 제거하고 로마자화.
 * 예) "주식회사 코진테크" → "Kojintekeu"
 */
export function romanizeCompany(text) {
  if (!text) return "";
  const cleaned = String(text)
    .replace(/주식회사|유한회사|합자회사|합명회사|\(주\)|（주）|㈜|\(유\)|㈜/g, " ")
    .trim();
  return romanizeRegion(cleaned);
}
