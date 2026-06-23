"use client";
import Link from "next/link";
import { T } from "@/lib/theme";

/**
 * 개인정보처리방침 (Privacy Policy)
 *
 * URL: /privacy
 *
 * 미림미디어랩 주식회사가 K-ALBA 서비스를 운영하면서 개인정보를 어떻게
 * 처리·보유·파기하는지 명시. (조항 구조는 TRAX 처리방침과 정렬)
 *
 * 정보:
 *   회사명:          미림미디어랩 주식회사
 *   대표자:          남기환
 *   사업자등록번호:  119-86-61402
 *   주소:            서울특별시 강서구 양천로 583 우림블루나인비즈니스센터 A동 406호
 *   고객문의:        k-alba@naver.com
 *   개인정보보호책임자: 남기환 (대표 겸임)
 */
export default function PrivacyPage() {
  return (
    <div
      style={{
        minHeight: "calc(100vh - 56px)",
        background: T.cream,
        padding: "32px 20px 64px",
      }}
    >
      <div
        style={{
          maxWidth: 820,
          margin: "0 auto",
          padding: "clamp(32px, 5vw, 56px) clamp(24px, 4vw, 48px)",
          background: T.paper,
          color: T.ink,
          lineHeight: 1.7,
          fontSize: 14,
          borderRadius: 16,
          boxShadow:
            "0 4px 20px rgba(10, 22, 40, 0.08), 0 1px 4px rgba(10, 22, 40, 0.04)",
        }}
      >
      <style>{`
        .terms-sub { list-style: disc; margin: 8px 0 12px; padding-left: 22px; }
        .terms-sub li { margin: 4px 0; }
        .terms-sub li::marker { color: ${T.gold}; }
      `}</style>

      {/* 헤더 */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: T.navy, marginBottom: 4, letterSpacing: "-0.02em" }}>
          개인정보처리방침
        </h1>
        <p style={{ margin: 0, color: T.ink2, fontSize: 13 }}>시행일: 2026년 6월 22일</p>
      </div>

      <Section title="제1조 (개인정보의 처리 목적)">
        <p>
          미림미디어랩 주식회사(이하 "회사")는 K-ALBA 서비스(이하 "서비스") 제공을 위해 다음의 목적으로
          개인정보를 처리합니다. 처리하는 개인정보는 아래 목적 이외의 용도로는 이용되지 않으며, 목적이
          변경되는 경우 「개인정보 보호법」 제18조에 따라 별도의 조치를 이행합니다.
        </p>
        <ul className="terms-sub">
          <li><strong>회원 식별 및 관리</strong>: 본인 확인, 부정 이용 방지, 회원자격 유지·관리</li>
          <li><strong>서비스 제공</strong>: 구인·구직 매칭, 근로계약 체결 지원, 다국어 서류 자동 생성, 시간제취업 신청 처리</li>
          <li><strong>비자 합법성 확인</strong>: 비자 유형별 합법 취업 가능 여부 자동 검증</li>
          <li><strong>고용주 인증</strong>: 사업자등록번호 진위 확인(국세청 API)</li>
          <li><strong>알림 발송</strong>: 지원 결과, 합격 통보, 계약서 서명 요청, 시간제취업 검토 결과 등 카카오톡·이메일 알림</li>
          <li><strong>고객 지원</strong>: 문의 응대 및 분쟁 처리</li>
          <li><strong>통계 분석</strong>: 서비스 개선을 위한 익명화된 통계 작성</li>
          <li><strong>법령상 의무 이행</strong>: 직업안정법, 직업정보제공사업 관련 법령 준수</li>
        </ul>
      </Section>

      <Section title="제2조 (처리하는 개인정보의 항목)">
        <p>회사는 다음의 개인정보 항목을 처리하고 있습니다.</p>
        <Sub title="1. 회원 가입 및 서비스 이용 시 처리 항목">
          <ul className="terms-sub">
            <li>구직회원: 이메일, 이름(닉네임), 연락처, 국적, 비자 유형, 한국어 능력, 거주 지역, 프로필 사진(선택)</li>
            <li>사장님(고용주) 회원: 이메일, 이름, 연락처, 사업자등록번호, 사업장명, 사업장 주소, 업종</li>
            <li>유학생(D-2/D-4) 시간제취업 신청자: 위 구직회원 항목에 더하여 재학 대학명, 학번, 학과, 학기, 외국인등록번호 일부, TOPIK 등급, 직전 학기 성적</li>
            <li>학교 담당자: 이메일(학교 도메인), 이름, 소속 부서, 직위</li>
          </ul>
        </Sub>
        <Sub title="2. 자동 수집 항목">
          <ul className="terms-sub">
            <li>접속 IP, 쿠키, 접속 기록, 기기 정보(OS, 브라우저), 이용 일시, 위치 정보(이용자 동의 시)</li>
          </ul>
        </Sub>
        <Sub title="3. 수집 방법">
          <ul className="terms-sub">
            <li>홈페이지 회원가입, 카카오톡/구글 소셜 로그인</li>
            <li>카카오톡 채널 챗봇을 통한 입력</li>
            <li>구인 공고 등록, 알바 지원, 시간제취업 신청 등 서비스 이용 과정</li>
            <li>고객문의 이메일 및 1:1 채팅</li>
          </ul>
        </Sub>
      </Section>

      <Section title="제3조 (개인정보의 처리 및 보유 기간)">
        <p>
          회사는 법령에 따른 개인정보 보유·이용 기간 또는 정보주체로부터 동의받은 기간 내에서 개인정보를
          처리·보유하며, 회원 탈퇴 시 또는 처리 목적이 달성된 후에는 지체 없이 파기합니다. 단, 다음의 정보는
          관련 법령에 따라 일정 기간 보관합니다.
        </p>
        <ul className="terms-sub">
          <li>계약 또는 청약철회 등에 관한 기록: <strong>5년</strong> (전자상거래법)</li>
          <li>대금결제 및 재화 등의 공급에 관한 기록: <strong>5년</strong> (전자상거래법)</li>
          <li>소비자의 불만 또는 분쟁처리에 관한 기록: <strong>3년</strong> (전자상거래법)</li>
          <li>표시·광고에 관한 기록: <strong>6개월</strong> (전자상거래법)</li>
          <li>접속 로그: <strong>3개월</strong> (통신비밀보호법)</li>
          <li>근로계약 관련 자료: <strong>3년</strong> (근로기준법 제42조)</li>
        </ul>
      </Section>

      <Section title="제4조 (개인정보의 제3자 제공)">
        <p>
          회사는 정보주체의 개인정보를 제1조에서 명시한 목적 범위 내에서만 처리하며, 정보주체의 동의,
          법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게
          제공합니다.
        </p>
        <ul className="terms-sub">
          <li>이용자가 사전에 동의한 경우 (예: 구인 공고에 지원 시 사장님에게 프로필 정보 제공)</li>
          <li>법령의 규정에 의하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
          <li>유학생 시간제취업 신청 시 소속 대학 담당자에게 신청서 정보 제공 (이용자 동의 후)</li>
        </ul>
        <p style={{ marginTop: 12 }}>
          또한 회사는 동일 운영사(미림미디어랩) 계열 플랫폼과의 연계 서비스 제공을 위해 아래와 같이
          개인정보를 제공합니다.
        </p>
        <table style={tableStyle}>
          <tbody>
            <tr><th style={thLabel}>제공받는 자</th><td style={tdStyle}>미림미디어랩 주식회사가 운영하는 플랫폼 — TRAX(trax.mirimmedialab.co.kr), K-UNIV(k-univ.kr), E-7(e-7.kr)</td></tr>
            <tr><th style={thLabel}>제공 목적</th><td style={tdStyle}>계열 플랫폼 간 통합 회원 관리, 연계 서비스 제공</td></tr>
            <tr><th style={thLabel}>제공 항목</th><td style={tdStyle}>이름, 이메일 주소, 비자 유형, 서비스 이용 이력</td></tr>
            <tr><th style={thLabel}>보유·이용 기간</th><td style={tdStyle}>회원 탈퇴 시 또는 제공 목적 달성 시까지</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="제5조 (개인정보 처리의 위탁)">
        <p>회사는 원활한 서비스 제공을 위하여 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.</p>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>수탁업체</th>
              <th style={thStyle}>위탁 업무</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdStyle}>Supabase Inc.</td><td style={tdStyle}>회원 데이터베이스 호스팅, 인증, 파일 저장</td></tr>
            <tr><td style={tdStyle}>Vercel Inc.</td><td style={tdStyle}>웹 서비스 호스팅 및 배포</td></tr>
            <tr><td style={tdStyle}>(주)카카오</td><td style={tdStyle}>카카오 로그인, 카카오톡 채널 알림 발송, 챗봇 운영</td></tr>
            <tr><td style={tdStyle}>Google LLC</td><td style={tdStyle}>구글 로그인 인증</td></tr>
            <tr><td style={tdStyle}>Resend Inc.</td><td style={tdStyle}>이메일 발송 서비스</td></tr>
            <tr><td style={tdStyle}>국세청</td><td style={tdStyle}>사업자등록 진위 확인 API</td></tr>
          </tbody>
        </table>
        <p style={{ marginTop: 12, fontSize: 13, color: T.ink2 }}>
          회사는 위탁계약 체결 시 개인정보 보호법 제26조에 따라 위탁업무 수행 목적 외 개인정보
          처리 금지, 기술적·관리적 보호조치, 재위탁 제한, 손해배상 등을 명시하고 수탁자를 관리·감독합니다.
        </p>
      </Section>

      <Section title="제6조 (개인정보의 국외 이전)">
        <p>
          회사는 AI 기반 다국어 번역 기능 제공을 위해, 이용자가 등록한 공고 콘텐츠의 텍스트를 아래와 같이
          국외로 이전(처리위탁)합니다. 이용자는 서비스 이용 시 위 국외 이전에 동의한 것으로 보며, 동의를
          거부할 수 있으나 이 경우 다국어 번역 기능 이용이 제한될 수 있습니다.
        </p>
        <table style={tableStyle}>
          <tbody>
            <tr><th style={thLabel}>이전받는 자</th><td style={tdStyle}>Anthropic, PBC (Claude API) 또는 OpenAI, L.L.C. (환경 설정에 따라 선택 이용)</td></tr>
            <tr><th style={thLabel}>이전 국가</th><td style={tdStyle}>미국</td></tr>
            <tr><th style={thLabel}>이전 항목</th><td style={tdStyle}>번역을 위해 처리되는 공고 텍스트(제목·설명·근무지역·회사명·업종·근무조건·복리후생 등)</td></tr>
            <tr><th style={thLabel}>이전 목적</th><td style={tdStyle}>AI 기반 다국어 번역 처리</td></tr>
            <tr><th style={thLabel}>보유·이용 기간</th><td style={tdStyle}>번역 처리에 필요한 기간 (각 사의 API 정책에 따라 처리)</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="제7조 (개인정보의 파기 절차 및 방법)">
        <p>
          회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이
          해당 개인정보를 파기합니다.
        </p>
        <p style={{ marginTop: 12 }}>
          전자적 파일 형태의 정보는 복구·재생할 수 없는 기술적 방법으로 삭제하며, 종이에 출력된 개인정보는
          분쇄하거나 소각하여 파기합니다.
        </p>
      </Section>

      <Section title="제8조 (정보주체의 권리·의무 및 행사 방법)">
        <p>
          정보주체는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지 요구 등의 권리를 행사할 수 있습니다.
        </p>
        <p style={{ marginTop: 12 }}>
          위 권리 행사는 서비스 내 "프로필 → 계정 관리" 설정을 통해 직접 처리하거나, 개인정보 보호책임자에게
          <a href="mailto:k-alba@naver.com" style={linkStyle}> k-alba@naver.com</a>으로 연락하시면 지체 없이 조치합니다.
          이용자가 개인정보의 오류 등에 대한 정정을 요청한 경우, 회사는 정정을 완료할 때까지 해당 개인정보를
          이용하거나 제공하지 않습니다.
        </p>
      </Section>

      <Section title="제9조 (개인정보의 안전성 확보 조치)">
        <p>회사는 개인정보의 안전성 확보를 위해 다음의 조치를 취하고 있습니다.</p>
        <ul className="terms-sub">
          <li><strong>비밀번호 보호</strong>: 이용자의 비밀번호는 인증 시스템에서 안전하게 암호화(해시)되어 저장·관리되며, 회사도 원문을 알 수 없습니다.</li>
          <li><strong>접근 권한 관리</strong>: 개인정보를 처리하는 시스템에 대한 접근 권한을 최소한으로 부여·관리하고, 민감 정보는 사용자에게 노출되지 않도록 접근을 제한합니다.</li>
          <li><strong>통신 암호화</strong>: HTTPS(SSL/TLS) 프로토콜을 사용하여 데이터 전송 구간을 암호화합니다.</li>
          <li><strong>데이터 격리</strong>: Row Level Security(RLS) 데이터베이스 정책으로 사용자별 데이터를 격리합니다.</li>
          <li>접속 기록 보관 및 위·변조 방지, 보안 프로그램의 설치 및 주기적 점검.</li>
        </ul>
      </Section>

      <Section title="제10조 (쿠키의 사용)">
        <p>
          회사는 이용자의 로그인 상태 유지 및 서비스 이용 편의를 위해 쿠키(Cookie)를 사용합니다.
        </p>
        <p style={{ marginTop: 12 }}>
          이용자는 웹 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 이 경우 로그인이 필요한 일부
          서비스 이용에 어려움이 있을 수 있습니다.
        </p>
      </Section>

      <Section title="제11조 (개인정보 보호책임자)">
        <p>
          회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한
          이용자의 불만 처리 및 피해 구제 등을 위하여 다음과 같이 개인정보 보호책임자를 지정하고 있습니다.
        </p>
        <table style={tableStyle}>
          <tbody>
            <tr><th style={thLabel}>개인정보 보호책임자</th><td style={tdStyle}>남기환 (대표이사 겸임)</td></tr>
            <tr><th style={thLabel}>소속</th><td style={tdStyle}>미림미디어랩 주식회사</td></tr>
            <tr><th style={thLabel}>이메일</th><td style={tdStyle}><a href="mailto:k-alba@naver.com" style={linkStyle}>k-alba@naver.com</a></td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="제12조 (권익침해 구제 방법)">
        <p>
          정보주체는 개인정보 침해로 인한 구제를 받기 위하여 아래 기관에 분쟁 해결이나 상담 등을
          신청할 수 있습니다.
        </p>
        <table style={tableStyle}>
          <thead>
            <tr><th style={thStyle}>기관</th><th style={thStyle}>연락처</th><th style={thStyle}>웹사이트</th></tr>
          </thead>
          <tbody>
            <tr><td style={tdStyle}>개인정보분쟁조정위원회</td><td style={tdStyle}>1833-6972</td><td style={tdStyle}><a href="https://www.kopico.go.kr" target="_blank" rel="noopener noreferrer" style={linkStyle}>www.kopico.go.kr</a></td></tr>
            <tr><td style={tdStyle}>개인정보침해신고센터</td><td style={tdStyle}>118</td><td style={tdStyle}><a href="https://privacy.kisa.or.kr" target="_blank" rel="noopener noreferrer" style={linkStyle}>privacy.kisa.or.kr</a></td></tr>
            <tr><td style={tdStyle}>대검찰청</td><td style={tdStyle}>1301</td><td style={tdStyle}><a href="https://www.spo.go.kr" target="_blank" rel="noopener noreferrer" style={linkStyle}>www.spo.go.kr</a></td></tr>
            <tr><td style={tdStyle}>경찰청</td><td style={tdStyle}>182</td><td style={tdStyle}><a href="https://ecrm.cyber.go.kr" target="_blank" rel="noopener noreferrer" style={linkStyle}>ecrm.cyber.go.kr</a></td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="제13조 (개인정보 처리방침의 변경)">
        <p>
          이 개인정보 처리방침은 2026년 6월 22일부터 적용되며, 법령 및 방침에 따른 변경 내용의 추가·삭제
          및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 서비스 공지사항을 통하여 고지합니다.
        </p>
      </Section>

      <p style={{ marginTop: 32, textAlign: "center", fontSize: 13, color: T.ink2 }}>
        문의: <a href="mailto:k-alba@naver.com" style={linkStyle}>k-alba@naver.com</a>
      </p>
      </div>
    </div>
  );
}

// ─── 스타일 ───
const ulStyle = { paddingLeft: 20, marginTop: 8, marginBottom: 12 };
const linkStyle = { color: "#1A56F0", textDecoration: "none" };
const tableStyle = { width: "100%", borderCollapse: "collapse", marginTop: 12, fontSize: 13 };
const thStyle = { border: "1px solid #D4D0CA", padding: "8px 12px", background: "#F7F5F0", textAlign: "left", fontWeight: 700, color: "#0A1628" };
const tdStyle = { border: "1px solid #D4D0CA", padding: "8px 12px", color: "#3F5273" };
const thLabel = { ...thStyle, width: 130, whiteSpace: "nowrap", verticalAlign: "top" };

// ─── 섹션 컴포넌트 ───
function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0A1628", marginBottom: 12, paddingBottom: 8, borderBottom: "2px solid #B8944A" }}>
        {title}
      </h2>
      <div style={{ color: "#3F5273" }}>{children}</div>
    </section>
  );
}

function Sub({ title, children }) {
  return (
    <div style={{ marginTop: 14, marginBottom: 8 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0A1628", marginBottom: 6 }}>{title}</h3>
      <div>{children}</div>
    </div>
  );
}
