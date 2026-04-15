"use client";
import Link from "next/link";
import { T } from "@/lib/theme";

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 20px", color: T.g700, lineHeight: 1.8, fontSize: 14 }}>
      <Link href="/" style={{ color: T.g500, fontSize: 14, marginBottom: 16, display: "inline-block", textDecoration: "none" }}>← 홈으로</Link>

      <h1 style={{ fontSize: 28, fontWeight: 800, color: T.navy, marginBottom: 8 }}>개인정보처리방침</h1>
      <p style={{ color: T.g500, fontSize: 13, marginBottom: 32 }}>
        최종 개정일: 2026년 04월 15일 · 시행일: 2026년 04월 15일
      </p>

      <Section title="제1조 (총칙)">
        <p>
          미림미디어랩 주식회사(이하 "회사")는 K-ALBA 서비스(이하 "서비스")를 운영함에 있어 「개인정보 보호법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련 법령을 준수하며, 이용자의 개인정보를 소중히 다루고 보호하기 위하여 본 개인정보처리방침을 수립·공개합니다.
        </p>
        <p>
          본 서비스는 한국에 거주하는 외국인(유학생, 결혼이민자, 취업비자 소지자, 워킹홀리데이 참여자 등)과 사업주를 연결하는 구인구직 플랫폼이며, 근로계약 체결을 지원합니다.
        </p>
      </Section>

      <Section title="제2조 (수집하는 개인정보 항목)">
        <p>회사는 서비스 제공을 위하여 다음과 같은 개인정보를 수집합니다.</p>
        <SubTitle>1. 회원가입 및 관리</SubTitle>
        <ul>
          <li><strong>공통</strong>: 이름(또는 외국명), 이메일 주소, 비밀번호, 휴대전화번호, 프로필 이미지(선택)</li>
          <li><strong>Google OAuth 가입 시</strong>: Google 계정 이메일, 이름, 프로필 사진</li>
          <li><strong>카카오 OAuth 가입 시</strong>: 카카오 계정 이메일, 닉네임, 프로필 사진</li>
        </ul>

        <SubTitle>2. 외국인 구직자 (회원)</SubTitle>
        <ul>
          <li>국적, 생년월일, 성별</li>
          <li>비자 종류 및 체류기간 만료일</li>
          <li>한국어 능력 수준</li>
          <li>소속 교육기관(유학생인 경우)</li>
          <li>학력 및 경력 사항(선택)</li>
          <li>희망 근무지역, 희망 업종, 희망 급여</li>
          <li>계좌정보(급여 수령용, 근로계약 체결 시)</li>
        </ul>

        <SubTitle>3. 사업주 (회원)</SubTitle>
        <ul>
          <li>사업자명, 사업자등록번호</li>
          <li>대표자명, 업종</li>
          <li>사업장 주소, 연락처</li>
        </ul>

        <SubTitle>4. 근로계약 체결 시 추가 수집</SubTitle>
        <ul>
          <li>근로계약서 기재사항(근로조건, 임금, 근무시간 등)</li>
          <li>전자서명 정보</li>
          <li>4대보험 가입 관련 정보(해당하는 경우)</li>
        </ul>

        <SubTitle>5. 서비스 이용 과정에서 자동 수집되는 정보</SubTitle>
        <ul>
          <li>접속 IP 주소, 쿠키, 접속 로그, 방문 일시</li>
          <li>서비스 이용 기록, 접속 기기 정보(기기 종류, OS 버전, 브라우저 종류)</li>
        </ul>
      </Section>

      <Section title="제3조 (개인정보의 수집 및 이용 목적)">
        <p>회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다.</p>
        <ul>
          <li>회원가입 및 본인확인, 회원자격 유지·관리</li>
          <li>외국인 구직자와 사업주 간 매칭 서비스 제공</li>
          <li>비자 조건에 맞는 합법적 알바 추천 및 비자 위반 방지</li>
          <li>근로계약서 작성, 서명, 보관 및 관리</li>
          <li>서비스 내 채팅 및 커뮤니케이션 지원</li>
          <li>고객 문의 대응, 분쟁 해결, 민원 처리</li>
          <li>서비스 이용 통계 분석 및 서비스 개선</li>
          <li>부정 이용 방지 및 법령상 의무 이행</li>
          <li>마케팅 및 광고 활용(이용자가 동의한 경우에 한함)</li>
        </ul>
      </Section>

      <Section title="제4조 (개인정보의 보유 및 이용 기간)">
        <p>회사는 원칙적으로 개인정보의 수집·이용 목적이 달성된 후에는 해당 정보를 지체없이 파기합니다. 단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다.</p>
        <SubTitle>1. 회사 내부 방침에 의한 정보 보유</SubTitle>
        <ul>
          <li>부정이용 기록: 1년</li>
        </ul>
        <SubTitle>2. 관련 법령에 의한 정보 보유</SubTitle>
        <ul>
          <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
          <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</li>
          <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)</li>
          <li>표시·광고에 관한 기록: 6개월 (전자상거래법)</li>
          <li>근로계약서 및 임금 관련 서류: 3년 (근로기준법 제42조)</li>
          <li>웹사이트 방문 기록(로그): 3개월 (통신비밀보호법)</li>
        </ul>
      </Section>

      <Section title="제5조 (개인정보의 제3자 제공)">
        <p>회사는 이용자의 개인정보를 본 개인정보처리방침에서 명시한 범위 내에서만 처리하며, 이용자의 사전 동의 없이는 동 범위를 초과하여 이용하거나 원칙적으로 외부에 공개하지 않습니다. 단, 다음의 경우는 예외로 합니다.</p>
        <ul>
          <li>이용자가 사전에 동의한 경우</li>
          <li><strong>구인구직 매칭</strong>: 외국인 구직자가 특정 공고에 지원한 경우, 해당 사업주에게 구직자의 이름, 국적, 비자 종류, 한국어 수준, 지원 메시지를 제공</li>
          <li><strong>근로계약 체결 시</strong>: 근로계약 당사자 간(구직자-사업주) 계약 체결에 필요한 정보 공유</li>
          <li>법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
        </ul>
      </Section>

      <Section title="제6조 (개인정보 처리의 위탁)">
        <p>회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.</p>
        <div style={{ overflowX: "auto", marginTop: 10, marginBottom: 10 }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>수탁업체</th>
                <th style={thStyle}>위탁 업무 내용</th>
                <th style={thStyle}>개인정보 보유 및 이용기간</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>Supabase Inc.</td>
                <td style={tdStyle}>회원 데이터베이스 호스팅, 인증 처리</td>
                <td style={tdStyle} rowSpan={4}>회원탈퇴 또는 위탁계약 종료 시까지</td>
              </tr>
              <tr>
                <td style={tdStyle}>Vercel Inc.</td>
                <td style={tdStyle}>웹 서비스 호스팅</td>
              </tr>
              <tr>
                <td style={tdStyle}>Google LLC</td>
                <td style={tdStyle}>Google OAuth 로그인 서비스</td>
              </tr>
              <tr>
                <td style={tdStyle}>Kakao Corp.</td>
                <td style={tdStyle}>카카오 OAuth 로그인, 카카오톡 알림 발송</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="제7조 (개인정보의 국외 이전)">
        <p>회사는 원활한 서비스 제공을 위해 개인정보를 국외로 이전할 수 있으며, 관련 사항은 다음과 같습니다.</p>
        <ul>
          <li><strong>이전받는 자</strong>: Supabase Inc. (미국), Vercel Inc. (미국), Google LLC (미국)</li>
          <li><strong>이전 항목</strong>: 본 개인정보처리방침 제2조의 수집 항목</li>
          <li><strong>이전 국가 및 일시</strong>: 서비스 이용 시점 / 미국</li>
          <li><strong>이전 방법</strong>: 네트워크를 통한 전송</li>
          <li><strong>이용 목적</strong>: 서비스 제공, 데이터 저장 및 관리</li>
          <li><strong>보유 기간</strong>: 회원탈퇴 또는 위탁계약 종료 시까지</li>
        </ul>
      </Section>

      <Section title="제8조 (이용자의 권리와 행사 방법)">
        <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
        <ul>
          <li>개인정보 열람 요구</li>
          <li>개인정보 정정·삭제 요구 (단, 다른 법령에서 수집을 명시한 경우 삭제가 제한될 수 있음)</li>
          <li>개인정보 처리정지 요구</li>
          <li>동의 철회(회원탈퇴)</li>
        </ul>
        <p>권리 행사는 서비스 내 '마이페이지'에서 직접 하시거나, 아래 개인정보 보호책임자에게 서면, 이메일 등으로 연락하시면 지체없이 조치하겠습니다.</p>
      </Section>

      <Section title="제9조 (개인정보의 파기)">
        <p>회사는 원칙적으로 개인정보 처리 목적이 달성된 경우에는 지체없이 해당 개인정보를 파기합니다.</p>
        <ul>
          <li><strong>파기 절차</strong>: 이용자가 입력한 정보는 목적 달성 후 내부 방침 및 관련 법령에 따라 일정 기간 저장된 후 파기됩니다.</li>
          <li><strong>파기 방법</strong>: 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제하며, 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각합니다.</li>
        </ul>
      </Section>

      <Section title="제10조 (쿠키의 운영 및 거부)">
        <p>
          회사는 이용자에게 개인화되고 맞춤화된 서비스를 제공하기 위해 쿠키(cookie)를 사용할 수 있습니다. 이용자는 쿠키 설치에 대한 선택권을 가지고 있으며, 웹브라우저에서 옵션을 설정함으로써 모든 쿠키를 허용하거나 거부할 수 있습니다. 단, 쿠키 설치를 거부할 경우 일부 서비스 이용에 제한이 있을 수 있습니다.
        </p>
      </Section>

      <Section title="제11조 (개인정보의 안전성 확보 조치)">
        <p>회사는 개인정보를 안전하게 보호하기 위해 다음과 같은 조치를 취하고 있습니다.</p>
        <ul>
          <li>개인정보 접근 권한 관리 및 접근 통제 시스템 운영</li>
          <li>개인정보 암호화 전송(HTTPS/SSL) 및 저장 시 암호화</li>
          <li>해킹 등에 대비한 보안 프로그램 설치 및 주기적 갱신</li>
          <li>개인정보 취급 직원의 최소화 및 교육</li>
          <li>개인정보 접속기록의 보관 및 위·변조 방지</li>
        </ul>
      </Section>

      <Section title="제12조 (개인정보 보호책임자)">
        <p>회사는 이용자의 개인정보를 보호하고 개인정보와 관련한 불만을 처리하기 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
        <div style={{ background: T.g100, padding: 16, borderRadius: 10, marginTop: 8 }}>
          <p style={{ margin: 0 }}>
            <strong>회사명</strong>: 미림미디어랩 주식회사<br />
            <strong>개인정보 보호책임자</strong>: 남기환 (대표이사)<br />
            <strong>이메일</strong>: privacy@k-alba.kr<br />
            <strong>문의</strong>: contact@k-alba.kr
          </p>
        </div>
      </Section>

      <Section title="제13조 (권익침해 구제방법)">
        <p>개인정보 관련 상담 및 신고는 아래의 기관에 문의하실 수 있습니다.</p>
        <ul>
          <li>개인정보 침해신고센터: (국번없이) 118 / <a href="https://privacy.kisa.or.kr" target="_blank" rel="noopener noreferrer" style={{ color: T.coral }}>privacy.kisa.or.kr</a></li>
          <li>개인정보 분쟁조정위원회: 1833-6972 / <a href="https://www.kopico.go.kr" target="_blank" rel="noopener noreferrer" style={{ color: T.coral }}>www.kopico.go.kr</a></li>
          <li>대검찰청 사이버수사과: (국번없이) 1301 / <a href="https://www.spo.go.kr" target="_blank" rel="noopener noreferrer" style={{ color: T.coral }}>www.spo.go.kr</a></li>
          <li>경찰청 사이버수사국: (국번없이) 182 / <a href="https://ecrm.police.go.kr" target="_blank" rel="noopener noreferrer" style={{ color: T.coral }}>ecrm.police.go.kr</a></li>
        </ul>
      </Section>

      <Section title="제14조 (개인정보처리방침의 변경)">
        <p>
          본 개인정보처리방침의 내용 추가, 삭제 및 수정이 있을 시에는 개정 최소 7일 전부터 서비스 내 '공지사항'을 통해 고지하며, 중요한 변경이 있을 경우 이용자에게 이메일로 개별 통지합니다.
        </p>
        <ul>
          <li>공고일자: 2026년 04월 15일</li>
          <li>시행일자: 2026년 04월 15일</li>
        </ul>
      </Section>

      <div style={{ marginTop: 40, padding: 20, background: T.coralL, borderRadius: 12, textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 13, color: T.navy }}>
          본 방침에 대한 의견이나 문의사항은 <a href="mailto:privacy@k-alba.kr" style={{ color: T.coral, fontWeight: 700 }}>privacy@k-alba.kr</a> 로 연락 주시기 바랍니다.
        </p>
      </div>

      <div style={{ marginTop: 20, paddingBottom: 40, display: "flex", gap: 12, justifyContent: "center", fontSize: 13 }}>
        <Link href="/terms" style={{ color: T.g500, textDecoration: "underline" }}>이용약관 보기</Link>
        <span style={{ color: T.g300 }}>|</span>
        <Link href="/" style={{ color: T.g500, textDecoration: "underline" }}>홈으로</Link>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: T.navy, marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${T.coral}` }}>
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

function SubTitle({ children }) {
  return (
    <h3 style={{ fontSize: 14, fontWeight: 700, color: T.navy, marginTop: 14, marginBottom: 6 }}>
      {children}
    </h3>
  );
}

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  marginTop: 8,
};

const thStyle = {
  background: T.navy,
  color: "#fff",
  padding: "10px 12px",
  border: `1px solid ${T.navy}`,
  textAlign: "left",
  fontWeight: 700,
};

const tdStyle = {
  padding: "10px 12px",
  border: `1px solid ${T.g200}`,
  verticalAlign: "top",
};
