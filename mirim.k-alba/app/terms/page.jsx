"use client";
import Link from "next/link";
import { T } from "@/lib/theme";

/**
 * 이용약관 (Terms of Service)
 *
 * URL: /terms
 *
 * K-ALBA는 두 사업을 함께 운영합니다:
 *   1. 유료직업소개사업 (구인-구직 매칭)
 *   2. 직업정보제공사업 (공고 정보 제공) - 신고번호 J1204020260002
 *
 * 본 약관은 두 사업 영역을 모두 포함하되, 결제·동의·영수증 단계에서
 * 이용자가 명확히 구분할 수 있도록 사업 유형을 명시합니다.
 *
 * 정보:
 *   회사명:          미림미디어랩 주식회사
 *   대표자:          남기환
 *   사업자등록번호:  119-86-61402
 *   직업정보제공사업 신고번호: J1204020260002
 *   주소:            서울특별시 강서구 양천로 583 우림블루나인비즈니스센터 A동 406호
 *   고객문의:        contact@k-alba.kr
 */
export default function TermsPage() {
  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "40px 24px 80px",
        background: T.paper,
        color: T.ink,
        lineHeight: 1.7,
        fontSize: 14,
      }}
    >
      {/* 헤더 */}
      <div style={{ marginBottom: 32, borderBottom: `2px solid ${T.gold}`, paddingBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: T.navy, marginBottom: 8, letterSpacing: "-0.02em" }}>
          이용약관
        </h1>
      </div>

      {/* 서문 */}
      <div
        style={{
          padding: 16,
          background: T.cream,
          border: `1px solid ${T.g200}`,
          borderRadius: 10,
          marginBottom: 28,
          fontSize: 13,
          color: T.ink2,
        }}
      >
        <strong style={{ color: T.navy }}>안내</strong> · K-ALBA는 「유료직업소개사업」과
        「직업정보제공사업」을 함께 운영합니다. 본 약관은 두 사업 영역에 대한 이용자의 권리와 의무를
        함께 규정하며, 각 서비스의 결제·정산은 별도로 분리되어 진행됩니다.
      </div>

      <Section title="제1장 총칙">
        <Article num={1} title="목적">
          <p>
            본 약관은 미림미디어랩 주식회사(이하 "회사")가 운영하는 K-ALBA 서비스(이하 "서비스")의
            이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을
            규정함을 목적으로 합니다.
          </p>
        </Article>

        <Article num={2} title="용어의 정의">
          <ul style={ulStyle}>
            <li><strong>"서비스"</strong>: 회사가 제공하는 K-ALBA 웹사이트(k-alba.kr), 카카오톡 채널, 모바일 앱 등 K-ALBA 브랜드로 제공되는 모든 서비스를 의미합니다.</li>
            <li><strong>"이용자"</strong>: 회사의 서비스에 접속하여 본 약관에 따라 회사가 제공하는 서비스를 받는 회원 및 비회원을 말합니다.</li>
            <li><strong>"구직회원"</strong>: 한국에서 일자리를 찾는 외국인 이용자를 말합니다.</li>
            <li><strong>"고용주 회원"</strong>: 외국인을 채용하고자 하는 사업주 이용자를 말합니다.</li>
            <li><strong>"유료직업소개"</strong>: 회사가 구직자와 고용주 간의 고용계약 체결을 알선하고 그 대가로 수수료를 받는 사업을 말합니다.</li>
            <li><strong>"직업정보제공"</strong>: 회사가 구인·구직 정보를 게시·열람하게 하는 사업을 말합니다 (신고번호: J1204020260002).</li>
          </ul>
        </Article>

        <Article num={3} title="약관의 효력과 변경">
          <ol style={olStyle}>
            <li>본 약관은 서비스 화면에 게시하거나 기타 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
            <li>회사는 관련 법령을 준수하는 범위 내에서 본 약관을 변경할 수 있으며, 변경된 약관은 시행일 7일 전(이용자에게 불리한 변경의 경우 30일 전)에 공지합니다.</li>
            <li>이용자가 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 회원 탈퇴할 수 있습니다.</li>
          </ol>
        </Article>
      </Section>

      <Section title="제2장 회원가입 및 계정 관리">
        <Article num={4} title="회원가입">
          <ol style={olStyle}>
            <li>회원가입은 이용자가 본 약관과 개인정보처리방침에 동의하고, 회사가 정한 절차에 따라 가입 신청을 완료한 시점에 성립합니다.</li>
            <li>회사는 다음의 경우 가입을 거절하거나 사후 해지할 수 있습니다.
              <ul style={ulStyle}>
                <li>타인의 명의를 도용한 경우</li>
                <li>허위 정보를 기재하거나 회사가 제시한 내용을 기재하지 않은 경우</li>
                <li>고용주 회원이 사업자등록번호 진위 확인에 실패한 경우</li>
                <li>이전에 본 약관 위반으로 회원자격이 상실된 적이 있는 경우</li>
                <li>법령 또는 사회질서에 위반될 우려가 있는 경우</li>
              </ul>
            </li>
          </ol>
        </Article>

        <Article num={5} title="회원 정보의 변경">
          <p>
            이용자는 회원가입 시 입력한 정보가 변경된 경우 즉시 서비스 내에서 수정해야 하며,
            정보 미변경으로 인한 불이익에 대해 회사는 책임지지 않습니다.
          </p>
        </Article>

        <Article num={6} title="회원 탈퇴 및 자격 상실">
          <ol style={olStyle}>
            <li>이용자는 언제든지 서비스 내 "프로필 → 계정 관리"에서 탈퇴를 요청할 수 있습니다.</li>
            <li>회사는 다음의 경우 회원 자격을 제한·정지·상실시킬 수 있습니다.
              <ul style={ulStyle}>
                <li>본 약관을 위반한 경우</li>
                <li>다른 이용자의 권리나 명예, 신용을 침해한 경우</li>
                <li>허위 공고를 게시하거나 비자 요건에 부적합한 채용을 시도한 경우</li>
                <li>금전 사기, 명의 도용 등 불법 행위를 한 경우</li>
              </ul>
            </li>
          </ol>
        </Article>
      </Section>

      <Section title="제3장 서비스 이용">
        <Article num={7} title="서비스의 내용">
          <p>회사는 다음과 같은 서비스를 제공합니다.</p>
          <ul style={ulStyle}>
            <li><strong>구인·구직 정보 제공 (직업정보제공사업)</strong>: 외국인 대상 구인 공고 게시 및 검색</li>
            <li><strong>매칭 서비스 (유료직업소개사업)</strong>: 비자·언어·지역 기반 자동 매칭, 챗봇 기반 지원 흐름</li>
            <li>다국어(한국어, 영어, 중국어, 베트남어, 우즈벡어, 몽골어, 일본어) 근로계약서 자동 생성 및 전자 서명</li>
            <li>D-2/D-4 비자 유학생을 위한 시간제취업 신청서 자동 작성 및 학교 담당자 검토</li>
            <li>지원 결과·계약 진행 상황 등에 관한 카카오톡 알림</li>
            <li>1:1 채팅 및 평가 시스템</li>
          </ul>
        </Article>

        <Article num={8} title="서비스의 운영시간">
          <p>
            서비스는 연중무휴 24시간 이용 가능한 것을 원칙으로 합니다. 다만 시스템 점검, 통신장애,
            천재지변 등 불가항력적인 사유로 일시 중단될 수 있으며, 회사는 사전 또는 사후에 이를 공지합니다.
          </p>
        </Article>

        <Article num={9} title="이용자의 의무">
          <p>이용자는 다음 행위를 하여서는 안 됩니다.</p>
          <ul style={ulStyle}>
            <li>회원가입 시 또는 정보 변경 시 허위 사실을 기재하는 행위</li>
            <li>타인의 정보를 도용하는 행위</li>
            <li>회사의 운영진, 직원 또는 관계자를 사칭하는 행위</li>
            <li>회사가 게시한 정보의 변경, 회사가 정하지 않은 정보의 송신·게시</li>
            <li>회사 또는 제3자의 저작권 등 지적재산권을 침해하는 행위</li>
            <li>다른 이용자의 명예를 손상시키거나 불이익을 주는 행위</li>
            <li>외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개·게시하는 행위</li>
            <li>고용주 회원이 비자 요건에 부적합한 채용 또는 허위 공고를 등록하는 행위</li>
            <li>구직회원이 위·변조된 비자 또는 신분 정보로 지원하는 행위</li>
            <li>정상적인 서비스 운영을 의도적으로 방해하는 행위</li>
          </ul>
        </Article>
      </Section>

      <Section title="제4장 고용주 회원의 의무">
        <Article num={10} title="공고 등록 시 준수사항">
          <ol style={olStyle}>
            <li>고용주 회원은 「근로기준법」, 「출입국관리법」, 「외국인근로자의 고용 등에 관한 법률」 및 관련 법령을 준수하여 공고를 등록하여야 합니다.</li>
            <li>공고에는 다음 사항이 정확히 기재되어야 합니다.
              <ul style={ulStyle}>
                <li>업무 내용, 근로 시간, 근무지, 임금</li>
                <li>채용 가능한 비자 유형</li>
                <li>한국어 능력 요구 수준 (필요한 경우)</li>
                <li>근로계약 체결 의사</li>
              </ul>
            </li>
            <li>최저임금법에 미달하는 임금을 제시하는 공고는 등록할 수 없습니다.</li>
          </ol>
        </Article>

        <Article num={11} title="채용 후 의무">
          <ol style={olStyle}>
            <li>고용주 회원은 채용 확정 후 합법적인 근로계약서를 체결하여야 합니다.</li>
            <li>회사가 제공하는 표준 다국어 근로계약서를 활용할 수 있으나, 구체적 조건은 양 당사자 간 합의에 따릅니다.</li>
            <li>고용주 회원은 외국인 근로자의 4대 보험 가입 등 법령상 의무를 준수하여야 합니다.</li>
          </ol>
        </Article>
      </Section>

      <Section title="제5장 구직회원의 의무">
        <Article num={12} title="비자 정보의 정확성">
          <ol style={olStyle}>
            <li>구직회원은 본인의 실제 비자 유형을 정확히 입력해야 하며, 허위 정보 기재로 인한 불이익은 본인이 부담합니다.</li>
            <li>비자별 합법 취업 가능 업종에 대해서는 회사가 제공하는 안내를 참고하되, 최종 확인 책임은 구직회원에게 있습니다.</li>
            <li>D-2/D-4 비자 유학생의 경우 시간제취업 허가 절차를 준수하여야 합니다.</li>
          </ol>
        </Article>
      </Section>

      <Section title="제6장 수수료 및 환불">
        <Article num={13} title="수수료 정책">
          <ol style={olStyle}>
            <li><strong>구직회원</strong>: 회원가입 및 알바 검색·지원은 전액 무료입니다.</li>
            <li><strong>고용주 회원</strong>: 공고 등록은 무료이며, 매칭 성사 시 별도의 수수료 정책이 적용될 수 있습니다.</li>
            <li>유료 서비스가 도입되는 경우, 결제 전에 별도 동의를 받으며 영수증에 다음과 같이 사업 유형이 명시됩니다.
              <ul style={ulStyle}>
                <li>매칭 수수료: "유료직업소개 서비스 이용료"</li>
                <li>구독·광고: "직업정보제공 서비스 이용료"</li>
              </ul>
            </li>
          </ol>
        </Article>

        <Article num={14} title="환불 정책">
          <p>
            유료 서비스 결제 후 환불 정책은 「전자상거래 등에서의 소비자보호에 관한 법률」 및
            「콘텐츠산업진흥법」을 따르며, 구체적인 사항은 별도 환불 정책을 통해 공지합니다.
          </p>
        </Article>
      </Section>

      <Section title="제7장 책임의 제한">
        <Article num={15} title="회사의 면책">
          <ol style={olStyle}>
            <li>회사는 천재지변, 전쟁 등 불가항력적인 사유로 인해 서비스를 제공할 수 없는 경우 책임을 지지 않습니다.</li>
            <li>회사는 이용자 간에 발생한 분쟁(예: 근로조건 불이행, 임금 미지급 등)에 대해 직접적인 당사자가 아니므로 분쟁 해결의 의무를 지지 않습니다. 다만 이용자 보호를 위한 중재 역할을 수행할 수 있습니다.</li>
            <li>회사는 이용자가 게시한 정보(공고, 프로필 등)의 정확성·신뢰성에 대해 보증하지 않습니다.</li>
            <li>회사는 무료로 제공되는 서비스 이용과 관련하여 관련 법령에 특별한 규정이 없는 한 책임을 지지 않습니다.</li>
          </ol>
        </Article>

        <Article num={16} title="이용자 간 분쟁 해결">
          <ol style={olStyle}>
            <li>이용자 간 분쟁이 발생한 경우 당사자 간의 합의로 해결함을 원칙으로 합니다.</li>
            <li>합의가 이루어지지 않을 경우 회사는 분쟁 조정을 위한 자료(채팅 기록, 계약서 등)를 제공할 수 있으며, 필요 시 관련 기관(고용노동부, 외국인노동자지원센터 등)에 안내합니다.</li>
          </ol>
        </Article>
      </Section>

      <Section title="제8장 기타">
        <Article num={17} title="저작권의 귀속">
          <ol style={olStyle}>
            <li>회사가 작성한 저작물에 대한 저작권은 회사에 귀속됩니다.</li>
            <li>이용자가 서비스 내에 게시한 게시물에 대한 저작권은 이용자에게 귀속되나, 회사는 서비스 운영·홍보 등을 위해 이를 무상으로 사용할 수 있습니다.</li>
          </ol>
        </Article>

        <Article num={18} title="준거법 및 관할">
          <ol style={olStyle}>
            <li>본 약관의 해석 및 회사와 이용자 간의 분쟁에 대해서는 대한민국 법령을 적용합니다.</li>
            <li>분쟁 발생 시 관할 법원은 민사소송법에 따라 정합니다.</li>
          </ol>
        </Article>
      </Section>
    </div>
  );
}

// ─── 스타일 ───
const ulStyle = { paddingLeft: 20, marginTop: 8, marginBottom: 12 };
const olStyle = { paddingLeft: 20, marginTop: 8, marginBottom: 12 };
const linkStyle = { color: "#1A56F0", textDecoration: "none" };

// ─── 섹션 컴포넌트 ───
function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: "#0A1628",
          marginBottom: 16,
          paddingBottom: 8,
          borderBottom: "2px solid #B8944A",
        }}
      >
        {title}
      </h2>
      <div style={{ color: "#3F5273" }}>{children}</div>
    </section>
  );
}

function Article({ num, title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0A1628", marginBottom: 8 }}>
        제{num}조 ({title})
      </h3>
      <div style={{ paddingLeft: 4 }}>{children}</div>
    </div>
  );
}
