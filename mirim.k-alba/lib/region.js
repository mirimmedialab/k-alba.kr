// 시/도 지역 유틸 — 알림 지역 타겟팅에 사용.
// jobs.sido 는 행정구역 풀네임("서울특별시","경기도"…)으로 저장되고,
// 알바생 관심지역(profiles.regions[])은 짧은 라벨("서울","경기 북부"…)로 저장된다.

export const SIDO_SHORT = {
  "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천",
  "광주광역시": "광주", "대전광역시": "대전", "울산광역시": "울산", "세종특별자치시": "세종",
  "경기도": "경기", "강원도": "강원", "강원특별자치도": "강원", "충청북도": "충북",
  "충청남도": "충남", "전라북도": "전북", "전북특별자치도": "전북", "전라남도": "전남",
  "경상북도": "경북", "경상남도": "경남", "제주특별자치도": "제주",
};

export function shortSido(s) {
  return SIDO_SHORT[s] || s || "";
}

// 알바생 관심지역(regions)이 공고 시/도(jobSido, 풀네임)와 맞는지.
//  - 미설정(빈 배열/null) → true (놓침 방지 정책상 발송)
//  - "전국 어디든" 포함 → 항상 true
//  - "경기 북부"/"경기 남부" 같은 세부 라벨은 앞 토큰("경기")으로 비교
export function regionMatchesJob(regions, jobSido) {
  const regs = Array.isArray(regions) ? regions.filter(Boolean) : [];
  if (regs.length === 0) return true;
  if (regs.includes("전국 어디든")) return true;
  if (!jobSido) return true;
  const js = shortSido(jobSido);
  return regs.some((r) => {
    const base = String(r).split(" ")[0];
    return base === js || r === js;
  });
}
