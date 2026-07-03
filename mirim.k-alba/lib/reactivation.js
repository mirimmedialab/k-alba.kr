// 탈퇴 후 재가입(정책 A: 재활성화) 공용 로직.
// 사용자에겐 "이전 데이터가 삭제된 새 계정"으로 보이게 하되, 데이터는 DB에 보관(노출 금지).
//  - deactivated_at 해제(로그인 차단 풀기)
//  - data_reset_at = now → 이전 지원내역/찜/계약서 등은 이 경계로 화면에서만 숨김(삭제 X)
//  - reactivated_at / resignup_count → 관리자만 재가입자임을 확인
//  - 개인/매칭 프로필 필드 초기화 → 새 계정처럼 보임
// (약관 동의도 초기화 → 재가입 시 다시 동의 게이트를 거치게 함. 이메일 재가입은 폼 값으로 덮어씀.)

export function reactivationFields(nextResignupCount) {
  const now = new Date().toISOString();
  return {
    deactivated_at: null,
    reactivated_at: now,
    data_reset_at: now,
    resignup_count: nextResignupCount,
    // 약관 동의 초기화(재동의 유도)
    agreed_terms_at: null,
    agreed_privacy_at: null,
    agreed_marketing_at: null,
    // 개인/매칭 정보 초기화
    phone: null, visa: null, country: null, organization: null, address: null,
    korean_level: null, work_types: null, regions: null, job_types: null,
    home_experience: null, korea_experience: null,
    company_name: null, business_number: null, business_address: null,
    home_latitude: null, home_longitude: null,
    home_address_road: null, home_address_detail: null,
    home_sido: null, home_sigungu: null, home_dong: null,
    search_radius_km: null, location_opted_in: false,
  };
}
