"use client";
import Link from "next/link";
import { T } from "@/lib/theme";

export default function TermsPage() {
  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 20px", color: T.g700, lineHeight: 1.8, fontSize: 14 }}>
      <Link href="/" style={{ color: T.g500, fontSize: 14, marginBottom: 16, display: "inline-block", textDecoration: "none" }}>← 홈으로</Link>

      <h1 style={{ fontSize: 28, fontWeight: 800, color: T.navy, marginBottom: 8 }}>이용약관</h1>
      <p style={{ color: T.g500, fontSize: 13, marginBottom: 32 }}>
        최종 개정일: 2026년 04월 15일 · 시행일: 2026년 04월 15일
      </p>

      <Section title="제1장 총칙">
        <Article num="1" title="목적">
          <p>
            본 약관은 미림미디어랩 주식회사(이하 "회사")가 제공하는 K-ALBA 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
          </p>
        </Article>

        <Article num="2" title="정의">
          <p>본 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
          <ul>
            <li><strong>"서비스"</strong>란 회사가 운영하는 외국인 대상 구인구직 매칭 및 근로계약 지원 플랫폼 K-ALBA(k-alba.kr)를 의미합니다.</li>
            <li><strong>"이용자"</strong>란 본 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
            <li><strong>"회원"</strong>이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 서비스를 이용할 수 있는 자를 말합니다.</li>
            <li><strong>"구직자"</strong>란 한국에 합법적으로 체류하는 외국인으로서 일자리를 찾기 위해 서비스에 가입한 회원을 말합니다.</li>
            <li><strong>"사업주"</strong>란 외국인 근로자를 고용하고자 서비스에 가입한 사업자 또는 그 대리인을 말합니다.</li>
            <li><strong>"근로계약"</strong>이란 구직자와 사업주 간에 체결되는 노동력 제공 및 임금 지급에 관한 계약을 말합니다.</li>
            <li><strong>"콘텐츠"</strong>란 서비스 내에 게시되는 모든 정보, 텍스트, 이미지, 영상 등의 자료를 의미합니다.</li>
          </ul>
        </Article>

        <Article num="3" title="약관의 게시 및 개정">
          <ol>
            <li>회사는 본 약관의 내용을 이용자가 쉽게 알 수 있도록 서비스 초기화면에 게시합니다.</li>
            <li>회사는 「전자상거래 등에서의 소비자보호에 관한 법률」 등 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.</li>
            <li>약관을 개정할 경우 적용일자 및 개정사유를 명시하여 현행 약관과 함께 시행일 7일 전부터(이용자에게 불리하거나 중대한 사항은 30일 전부터) 공지합니다.</li>
            <li>이용자는 변경된 약관에 동의하지 않을 권리가 있으며, 동의하지 않을 경우 서비스 이용을 중단하고 회원탈퇴를 할 수 있습니다. 공지된 시행일까지 거부 의사를 표시하지 않으면 약관에 동의한 것으로 봅니다.</li>
          </ol>
        </Article>

        <Article num="4" title="약관 외 준칙">
          <p>
            본 약관에 명시되지 않은 사항은 「전자상거래 등에서의 소비자보호에 관한 법률」, 「약관의 규제에 관한 법률」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」, 「근로기준법」, 「출입국관리법」 등 관계 법령 또는 상관례에 따릅니다.
          </p>
        </Article>
      </Section>

      <Section title="제2장 서비스 이용계약">
        <Article num="5" title="회원가입">
          <ol>
            <li>이용자는 회사가 정한 가입양식에 따라 회원정보를 기입한 후 본 약관에 동의함으로써 회원가입을 신청합니다.</li>
            <li>회사는 다음 각 호에 해당하는 신청에 대해서는 승낙하지 않거나 사후에 이용계약을 해지할 수 있습니다.
              <ul>
                <li>타인의 정보를 도용하거나 허위 정보를 기재한 경우</li>
                <li>14세 미만 아동이 법정대리인의 동의 없이 신청한 경우</li>
                <li>사회의 안녕, 질서 또는 미풍양속을 저해할 목적으로 신청한 경우</li>
                <li>이전에 회원자격을 상실한 적이 있는 경우</li>
                <li>기타 회사가 정한 이용신청 요건이 미비된 경우</li>
              </ul>
            </li>
            <li>회원가입은 회사의 승낙이 이용자에게 도달한 시점에 성립합니다.</li>
          </ol>
        </Article>

        <Article num="6" title="회원 정보의 변경">
          <p>회원은 서비스 내 '마이페이지' 또는 '프로필' 메뉴를 통해 언제든지 자신의 개인정보를 열람하고 수정할 수 있습니다. 다만, 이름, 생년월일 등 실명 관련 정보와 비자 관련 정보는 관리자 확인이 필요할 수 있습니다.</p>
        </Article>

        <Article num="7" title="회원탈퇴 및 자격상실">
          <ol>
            <li>회원은 언제든지 서비스 내 탈퇴 기능을 통해 회원탈퇴를 요청할 수 있으며, 회사는 즉시 회원탈퇴를 처리합니다.</li>
            <li>회원이 다음 각 호의 사유에 해당하는 경우, 회사는 회원자격을 제한 또는 정지시킬 수 있습니다.
              <ul>
                <li>가입 시 허위 내용을 등록한 경우</li>
                <li>타인의 서비스 이용을 방해하거나 정보를 도용하는 경우</li>
                <li>서비스를 이용하여 법령 또는 본 약관이 금지하는 행위를 하는 경우</li>
                <li>불법 체류 외국인이 서비스를 이용하는 경우</li>
                <li>비자 조건에 위배되는 업종의 알바를 반복적으로 지원하는 경우</li>
              </ul>
            </li>
          </ol>
        </Article>
      </Section>

      <Section title="제3장 서비스 이용">
        <Article num="8" title="서비스의 제공">
          <p>회사는 회원에게 다음과 같은 서비스를 제공합니다.</p>
          <ul>
            <li>구직자와 사업주 간 매칭 서비스</li>
            <li>비자별 합법 알바 필터링 및 추천</li>
            <li>7개 언어(한국어, 영어, 중국어, 베트남어, 우즈벡어, 몽골어, 일본어) 지원</li>
            <li>근로계약서 자동 생성 및 전자서명</li>
            <li>PDF 형식의 근로계약서 다운로드</li>
            <li>카카오톡 챗봇 기반 공고 등록 및 계약 진행</li>
            <li>구인 사이트 내 채팅 기능</li>
            <li>기타 회사가 추가 개발하거나 다른 회사와의 제휴를 통해 제공하는 서비스</li>
          </ul>
        </Article>

        <Article num="9" title="서비스 이용 시간">
          <ol>
            <li>서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다.</li>
            <li>회사는 시스템 정기점검, 증설 및 교체, 천재지변 등의 사유로 서비스 제공을 일시 중단할 수 있으며, 이 경우 사전에 공지합니다.</li>
          </ol>
        </Article>

        <Article num="10" title="서비스의 변경 및 중단">
          <p>
            회사는 합리적인 사유가 있을 경우 제공하고 있는 서비스의 전부 또는 일부를 변경 또는 중단할 수 있습니다. 서비스의 내용, 이용방법, 이용시간에 대하여 변경이 있는 경우에는 변경 사유, 변경 내용 및 제공일자 등을 변경 전 서비스 내에 공지합니다.
          </p>
        </Article>
      </Section>

      <Section title="제4장 근로계약 관련 특칙">
        <Article num="11" title="근로계약의 당사자">
          <ol>
            <li>서비스를 통해 체결되는 근로계약의 당사자는 구직자(근로자)와 사업주(고용주)이며, 회사는 계약 당사자가 아닙니다.</li>
            <li>회사는 근로계약 체결을 기술적으로 지원하는 플랫폼 역할만 수행합니다.</li>
          </ol>
        </Article>

        <Article num="12" title="비자 준수 의무">
          <ol>
            <li>구직자는 자신의 비자 종류 및 체류기간 내에서 「출입국관리법」 및 「외국인근로자의 고용 등에 관한 법률」을 준수하여 합법적으로 근로할 의무가 있습니다.</li>
            <li>유학생(D-2, D-4 비자) 등 일부 비자 소지자는 시간제 취업허가 또는 체류자격외활동허가를 받아야 할 수 있으며, 이는 구직자 본인의 책임입니다.</li>
            <li>사업주는 외국인 채용 시 비자 적법성을 확인할 의무가 있으며, 불법 고용에 따른 책임을 부담합니다.</li>
            <li>회사는 기술적으로 비자 조건에 부합하는 공고만 표시하도록 필터링하지만, 최종적인 법적 적합성 판단은 계약 당사자의 책임입니다.</li>
          </ol>
        </Article>

        <Article num="13" title="최저임금 및 근로조건 준수">
          <ol>
            <li>사업주는 「최저임금법」에 따라 고시된 최저임금(2026년 기준 시간당 10,030원) 이상의 임금을 지급하여야 합니다.</li>
            <li>서비스는 최저임금 미달 공고에 대해 경고를 표시하며, 상습적으로 최저임금을 위반하는 사업주의 공고를 차단할 수 있습니다.</li>
            <li>주 15시간 이상 근로 시 주휴수당을 지급해야 하며, 4대 보험 가입 의무가 발생할 수 있습니다.</li>
          </ol>
        </Article>

        <Article num="14" title="전자서명 및 계약 효력">
          <ol>
            <li>서비스 내에서 진행된 전자서명은 「전자서명법」에 따라 법적 효력을 가집니다.</li>
            <li>근로계약서는 근로기준법 제17조에 따른 서면 계약 요건을 충족하며, 회사는 이를 시스템 내에 안전하게 보관합니다.</li>
            <li>근로자는 언제든지 자신이 체결한 근로계약서를 PDF로 다운로드할 수 있습니다.</li>
          </ol>
        </Article>
      </Section>

      <Section title="제5장 이용자의 의무">
        <Article num="15" title="이용자의 의무">
          <p>이용자는 다음 행위를 하여서는 안 됩니다.</p>
          <ul>
            <li>신청 또는 변경 시 허위 내용의 등록</li>
            <li>타인의 정보 도용</li>
            <li>회사가 게시한 정보의 변경</li>
            <li>회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등)의 송신 또는 게시</li>
            <li>회사 및 기타 제3자의 저작권 등 지식재산권에 대한 침해</li>
            <li>회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
            <li>외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 공개 또는 게시하는 행위</li>
            <li>불법 체류, 비자 위반, 허위 공고 등 법령 위반 행위</li>
            <li>기타 불법적이거나 부당한 행위</li>
          </ul>
        </Article>

        <Article num="16" title="이용자 ID 및 비밀번호 관리">
          <ol>
            <li>회원의 ID와 비밀번호에 관한 관리책임은 회원에게 있으며, 이를 제3자에게 이용하게 해서는 안 됩니다.</li>
            <li>회원은 자신의 ID와 비밀번호가 도용되거나 제3자에 의해 사용되고 있음을 인지한 경우, 즉시 회사에 통보하고 회사의 안내에 따라야 합니다.</li>
          </ol>
        </Article>
      </Section>

      <Section title="제6장 회사의 의무와 책임">
        <Article num="17" title="회사의 의무">
          <ol>
            <li>회사는 법령과 본 약관이 금지하거나 공서양속에 반하는 행위를 하지 않으며, 안정적이고 지속적으로 서비스를 제공하기 위해 최선을 다합니다.</li>
            <li>회사는 이용자가 안전하게 서비스를 이용할 수 있도록 개인정보 보호를 위한 보안 시스템을 갖추고 개인정보처리방침을 공시하고 준수합니다.</li>
            <li>회사는 서비스 이용과 관련하여 이용자로부터 제기되는 의견이나 불만이 정당하다고 인정될 경우, 적절한 절차를 거쳐 처리하여야 합니다.</li>
          </ol>
        </Article>

        <Article num="18" title="면책사항">
          <ol>
            <li>회사는 구직자와 사업주 간의 거래에 대해 직접적인 당사자가 아니며, 거래와 관련하여 발생한 분쟁에 대한 책임을 지지 않습니다. 단, 회사의 고의 또는 중대한 과실이 있는 경우는 예외로 합니다.</li>
            <li>회사는 이용자 상호간 또는 이용자와 제3자 간에 서비스를 매개로 발생한 분쟁에 대해 개입할 의무가 없습니다.</li>
            <li>회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우 서비스 제공에 관한 책임이 면제됩니다.</li>
            <li>회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대해서는 책임을 지지 않습니다.</li>
            <li>회사는 이용자가 서비스를 이용하여 기대하는 수익을 얻지 못하거나 상실한 것에 대해 책임을 지지 않습니다.</li>
            <li>근로계약 조건의 적법성, 최저임금 준수 여부, 비자 적합성 등에 대한 최종적인 책임은 계약 당사자에게 있습니다.</li>
          </ol>
        </Article>
      </Section>

      <Section title="제7장 기타">
        <Article num="19" title="저작권의 귀속 및 이용제한">
          <ol>
            <li>회사가 작성한 저작물에 대한 저작권 기타 지식재산권은 회사에 귀속합니다.</li>
            <li>이용자는 서비스를 이용함으로써 얻은 정보 중 회사에게 지식재산권이 귀속된 정보를 회사의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안 됩니다.</li>
          </ol>
        </Article>

        <Article num="20" title="분쟁 해결">
          <ol>
            <li>회사는 이용자의 불만사항 및 의견을 반영하기 위하여 고객센터를 운영합니다.</li>
            <li>회사와 이용자 간에 발생한 분쟁은 상호 협의에 의해 해결함을 원칙으로 합니다.</li>
            <li>협의를 통하여 분쟁이 해결되지 않을 경우, 양 당사자는 「전자문서 및 전자거래 기본법」에 따른 전자거래분쟁조정위원회 또는 「소비자기본법」에 따른 소비자분쟁조정위원회에 조정을 신청할 수 있습니다.</li>
          </ol>
        </Article>

        <Article num="21" title="재판권 및 준거법">
          <ol>
            <li>본 약관은 대한민국 법령에 따라 해석되고 이행됩니다.</li>
            <li>서비스 이용과 관련하여 회사와 이용자 간에 발생한 분쟁에 관한 소송은 민사소송법상의 관할법원에 제소합니다.</li>
          </ol>
        </Article>
      </Section>

      <Section title="부칙">
        <p style={{ marginBottom: 8 }}><strong>제1조 (시행일)</strong></p>
        <p>본 약관은 2026년 04월 15일부터 시행됩니다.</p>
      </Section>

      <div style={{ marginTop: 40, padding: 20, background: T.coralL, borderRadius: 12 }}>
        <p style={{ margin: 0, fontSize: 13, color: T.navy, lineHeight: 1.7 }}>
          <strong>회사 정보</strong><br />
          상호: 미림미디어랩 주식회사<br />
          대표: 남기환<br />
          이메일: contact@k-alba.kr<br />
          서비스 문의: <a href="mailto:contact@k-alba.kr" style={{ color: T.coral, fontWeight: 700 }}>contact@k-alba.kr</a>
        </p>
      </div>

      <div style={{ marginTop: 20, paddingBottom: 40, display: "flex", gap: 12, justifyContent: "center", fontSize: 13 }}>
        <Link href="/privacy" style={{ color: T.g500, textDecoration: "underline" }}>개인정보처리방침 보기</Link>
        <span style={{ color: T.g300 }}>|</span>
        <Link href="/" style={{ color: T.g500, textDecoration: "underline" }}>홈으로</Link>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: T.navy, marginBottom: 16, paddingBottom: 10, borderBottom: `3px solid ${T.coral}` }}>
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

function Article({ num, title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 8 }}>
        제{num}조 ({title})
      </h3>
      <div style={{ paddingLeft: 4 }}>{children}</div>
    </div>
  );
}
