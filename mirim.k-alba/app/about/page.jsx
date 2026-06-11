"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { T } from "@/lib/theme";

/**
 * /about — K-ALBA 서비스 소개 페이지
 *
 * 웹 랜딩(k-alba-mckinsey-landing.html)을 Next.js로 포팅.
 * 외부 공유 / SEO 노출 / 외국인 타겟 마케팅용.
 *
 * 기존 `/` (앱 랜딩)과의 차이:
 *   - `/` — 로그인/가입 유도 (앱 진입용)
 *   - `/about` — 서비스 전체 소개 (마케팅/SEO용, 공유 링크)
 */
export default function AboutPage() {
  const [lang, setLang] = useState("ko");

  // 브라우저 언어 감지
  useEffect(() => {
    const stored = typeof localStorage !== "undefined" && localStorage.getItem("kalba_lang");
    if (stored) {
      setLang(stored);
      return;
    }
    const browserLang = typeof navigator !== "undefined" ? navigator.language.split("-")[0] : "ko";
    const supported = ["ko", "en", "zh", "vi", "uz", "mn", "ja"];
    if (supported.includes(browserLang)) setLang(browserLang);
  }, []);

  const content = CONTENT[lang] || CONTENT.ko;

  return (
    <div style={{ background: T.paper, color: T.ink, fontSize: 16, lineHeight: 1.6, letterSpacing: "-0.01em" }}>
      {/* HERO */}
      <section style={{
        padding: "130px 40px 70px",
        background: T.n9,
        color: T.paper,
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: 3,
          background: `linear-gradient(to right, ${T.gold} 40%, transparent 40%)`,
        }} />
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 50,
          alignItems: "center",
        }} className="hero-grid">
          <div>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: T.gold,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 14,
            }}>
              {content.hero.tag}
            </div>
            <h1 style={{
              fontWeight: 800,
              fontSize: "clamp(28px, 4.5vw, 48px)",
              lineHeight: 1.2,
              letterSpacing: "-0.03em",
              marginBottom: 20,
            }}>
              {content.hero.title.split("**").map((part, i) =>
                i % 2 === 1
                  ? <em key={i} style={{ fontStyle: "normal", color: T.gold }}>{part}</em>
                  : part
              )}
            </h1>
            <p style={{
              fontSize: 17,
              lineHeight: 1.65,
              color: "rgba(255,255,255,0.8)",
              marginBottom: 28,
            }}>
              {content.hero.sub}
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/signup" style={{
                padding: "14px 28px",
                background: T.gold,
                color: T.n9,
                textDecoration: "none",
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 4,
                letterSpacing: "-0.01em",
              }}>
                {content.hero.ctaPrimary}
              </Link>
              <Link href="#features" style={{
                padding: "14px 28px",
                background: "transparent",
                color: T.paper,
                border: `1px solid ${T.paper}`,
                textDecoration: "none",
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 4,
                letterSpacing: "-0.01em",
              }}>
                {content.hero.ctaSecondary}
              </Link>
            </div>
          </div>

          {/* 우측 수치 카드 */}
          <div style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(184,148,74,0.3)",
            padding: 30,
            borderRadius: 6,
          }}>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              color: T.gold,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}>
              By The Numbers
            </div>
            {content.hero.stats.map((stat, i) => (
              <div key={i} style={{
                padding: "14px 0",
                borderBottom: i < content.hero.stats.length - 1
                  ? "1px solid rgba(255,255,255,0.08)"
                  : "none",
              }}>
                <div style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: T.gold,
                  letterSpacing: "-0.02em",
                  marginBottom: 2,
                }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section style={{ padding: "80px 40px", background: T.paper }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: T.ink3,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}>
            Problem · 문제
          </div>
          <h2 style={{
            fontSize: "clamp(24px, 3.5vw, 36px)",
            fontWeight: 800,
            letterSpacing: "-0.025em",
            marginBottom: 18,
            color: T.ink,
            lineHeight: 1.3,
          }}>
            {content.problem.title}
          </h2>
          <p style={{
            fontSize: 16,
            color: T.ink2,
            maxWidth: 720,
            marginBottom: 40,
            lineHeight: 1.7,
          }}>
            {content.problem.sub}
          </p>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}>
            {content.problem.items.map((item, i) => (
              <div key={i} style={{
                padding: 26,
                background: T.cream,
                borderLeft: `3px solid ${T.accent}`,
                borderRadius: "0 4px 4px 0",
              }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{item.icon}</div>
                <div style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: T.ink,
                  marginBottom: 6,
                  letterSpacing: "-0.01em",
                }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.6 }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: "80px 40px", background: T.cream }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: T.ink3,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}>
            Features · 핵심 기능
          </div>
          <h2 style={{
            fontSize: "clamp(24px, 3.5vw, 36px)",
            fontWeight: 800,
            letterSpacing: "-0.025em",
            marginBottom: 40,
            color: T.ink,
            lineHeight: 1.3,
          }}>
            {content.features.title}
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 24,
          }}>
            {content.features.items.map((item, i) => (
              <div key={i} style={{
                padding: 28,
                background: T.paper,
                border: `1px solid ${T.border}`,
                borderRadius: 4,
              }}>
                <div style={{
                  width: 44,
                  height: 44,
                  background: T.n9,
                  color: T.gold,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  marginBottom: 16,
                }}>
                  {item.icon}
                </div>
                <div style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: T.ink,
                  marginBottom: 8,
                  letterSpacing: "-0.02em",
                }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.65 }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW */}
      <section style={{ padding: "80px 40px", background: T.paper }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: T.ink3,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}>
            How It Works · 이용 방법
          </div>
          <h2 style={{
            fontSize: "clamp(24px, 3.5vw, 36px)",
            fontWeight: 800,
            letterSpacing: "-0.025em",
            marginBottom: 40,
            color: T.ink,
            lineHeight: 1.3,
          }}>
            {content.how.title}
          </h2>
          <div style={{ maxWidth: 720 }}>
            {content.how.steps.map((step, i) => (
              <div key={i} style={{
                display: "flex",
                gap: 20,
                paddingBottom: 24,
                marginBottom: 24,
                borderBottom: i < content.how.steps.length - 1
                  ? `1px solid ${T.border}`
                  : "none",
              }}>
                <div style={{
                  fontSize: 26,
                  fontWeight: 800,
                  color: T.gold,
                  minWidth: 50,
                  letterSpacing: "-0.02em",
                }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <div style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: T.ink,
                    marginBottom: 6,
                    letterSpacing: "-0.02em",
                  }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: 14, color: T.ink2, lineHeight: 1.6 }}>
                    {step.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: "80px 40px",
        background: T.n9,
        color: T.paper,
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{
            fontSize: "clamp(24px, 3.5vw, 36px)",
            fontWeight: 800,
            letterSpacing: "-0.025em",
            marginBottom: 18,
            lineHeight: 1.3,
          }}>
            {content.cta.title.split("**").map((part, i) =>
              i % 2 === 1
                ? <em key={i} style={{ fontStyle: "normal", color: T.gold }}>{part}</em>
                : part
            )}
          </h2>
          <p style={{
            fontSize: 16,
            color: "rgba(255,255,255,0.75)",
            marginBottom: 32,
            lineHeight: 1.6,
          }}>
            {content.cta.sub}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Link href="/signup" style={{
              padding: "16px 32px",
              background: T.gold,
              color: T.n9,
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 700,
              borderRadius: 4,
              letterSpacing: "-0.01em",
            }}>
              {content.cta.primary}
            </Link>
            <Link href="/jobs" style={{
              padding: "16px 32px",
              background: "transparent",
              color: T.paper,
              border: `1px solid ${T.paper}`,
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 4,
              letterSpacing: "-0.01em",
            }}>
              {content.cta.secondary}
            </Link>
          </div>
        </div>
      </section>

      {/* 반응형 */}
      <style jsx>{`
        @media (max-width: 768px) {
          :global(.hero-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 다국어 컨텐츠 (inline — 마케팅 페이지는 번역 핵심)
// ═══════════════════════════════════════════════
const CONTENT = {
  ko: {
    hero: {
      tag: "FOR FOREIGN WORKERS IN KOREA",
      title: "한국의 **260만 외국인 주민**에게, 합법적이고 투명한 일자리를",
      sub: "비자별 맞춤 공고 매칭, 7개 언어 지원, 카카오톡 챗봇 기반 3분 근로계약. 법무법인 수성 김익환 변호사의 법적 검토를 거친 표준 계약서로 안전하게.",
      ctaPrimary: "무료로 시작하기",
      ctaSecondary: "서비스 살펴보기",
      stats: [
        { value: "260만명", label: "한국 거주 외국인 (2024)" },
        { value: "7개 언어", label: "한국어 장벽 해소" },
        { value: "3분", label: "카톡 챗봇 계약서 작성" },
        { value: "100%", label: "표준 근로계약 준수" },
      ],
    },
    problem: {
      title: "외국인 알바생에게 한국은 왜 어려울까요?",
      sub: "한국에 거주하는 외국인 주민은 260만 명. 그러나 기존 구인구직 플랫폼은 한국인을 위해 설계되어, 비자·언어·계약의 세 가지 벽이 외국인에게 큰 장애가 됩니다.",
      items: [
        { icon: "🛂", title: "비자 미스매치", desc: "비자에 따라 가능한 업종/시간이 다름. 기존 플랫폼은 이를 필터링하지 않아 불법 취업 위험." },
        { icon: "🗣️", title: "언어 장벽", desc: "한국어로 된 공고를 이해하기 어렵고, 계약서 내용 파악 불가능." },
        { icon: "📝", title: "구두 계약", desc: "60% 이상의 외국인이 근로계약서 없이 일함. 임금 체불, 부당해고 분쟁 시 보호 받기 어려움." },
      ],
    },
    features: {
      title: "K-ALBA가 제공하는 4가지 핵심 가치",
      items: [
        { icon: "🎯", title: "비자 자동 필터링", desc: "내 비자(D-2, D-4, E-9, H-2 등)에 맞는 공고만 자동으로 보여줍니다. 불법 취업 걱정 없음." },
        { icon: "🌐", title: "7개 언어 완전 지원", desc: "한국어 · 영어 · 중국어 · 베트남어 · 우즈벡어 · 몽골어 · 일본어. 공고 · 계약서 · 챗봇 모두." },
        { icon: "💬", title: "카카오톡 챗봇 계약", desc: "질문에 답하기만 하면 3분 안에 표준 근로계약서 완성. 사장님 서명 받고 PDF 보관." },
        { icon: "📍", title: "위치 기반 매칭", desc: "우리 집에서 대중교통으로 몇 분 걸리는지 자동 계산. 숙식 제공 공고 우선 표시 (E-9 비자용)." },
      ],
    },
    how: {
      title: "회원가입 후 30초 내에 첫 공고 지원",
      steps: [
        { title: "가입 + 비자 정보 입력", desc: "체류 비자와 한국어 수준, 거주지를 입력. 사장님은 사업자 번호로 국세청 자동 인증." },
        { title: "맞춤 공고 확인", desc: "내 위치와 비자에 맞는 공고가 가까운 순으로 정렬됨. 숙식 제공 여부, 대중교통 접근성 한눈에." },
        { title: "1분 챗봇 지원", desc: "공고 탭 → 카톡 스타일 챗봇이 5가지 질문. 답만 하면 지원 완료. 사장님에게 자동 알림톡." },
        { title: "합격 + 3분 계약서", desc: "사장님이 승인하면 다시 챗봇이 열려 계약 조건 확인. 양쪽 서명 후 PDF 자동 발급." },
      ],
    },
    cta: {
      title: "합법적인 알바, **안전한 계약서**,\n이제는 한국에서도 당연하게.",
      sub: "가입은 무료, 계약서 발급도 무료. 사장님과 알바생 모두 K-ALBA를 믿고 사용할 수 있도록 만들었습니다.",
      primary: "무료 회원가입",
      secondary: "공고 먼저 보기",
    },
  },
  en: {
    hero: {
      tag: "FOR FOREIGN WORKERS IN KOREA",
      title: "Legal, transparent jobs for Korea's **2.6 million foreign residents**",
      sub: "Visa-matched listings, 7-language support, 3-minute employment contracts via KakaoTalk chatbot. Legally reviewed standard contracts by Susung Law Firm.",
      ctaPrimary: "Get Started Free",
      ctaSecondary: "Explore Features",
      stats: [
        { value: "2.6M", label: "Foreign residents in Korea (2024)" },
        { value: "7 languages", label: "Break the language barrier" },
        { value: "3 minutes", label: "KakaoTalk chatbot contracts" },
        { value: "100%", label: "Standard labor law compliant" },
      ],
    },
    problem: {
      title: "Why is Korea hard for foreign part-time workers?",
      sub: "2.6 million foreign residents live in Korea, but existing job platforms are built for Koreans. Visa, language, and contract gaps block foreign workers.",
      items: [
        { icon: "🛂", title: "Visa Mismatch", desc: "Allowed industries/hours vary by visa. Traditional platforms don't filter, risking illegal employment." },
        { icon: "🗣️", title: "Language Barrier", desc: "Korean-only listings and contracts are hard to understand fully." },
        { icon: "📝", title: "Verbal Contracts", desc: "60%+ of foreign workers have no written contract. Little protection for wage theft or unfair dismissal." },
      ],
    },
    features: {
      title: "Four core values K-ALBA offers",
      items: [
        { icon: "🎯", title: "Automatic Visa Filtering", desc: "See only jobs your visa allows (D-2, D-4, E-9, H-2, etc). No risk of illegal work." },
        { icon: "🌐", title: "Full 7-Language Support", desc: "Korean, English, Chinese, Vietnamese, Uzbek, Mongolian, Japanese. Listings, contracts, chatbot." },
        { icon: "💬", title: "KakaoTalk Chatbot Contract", desc: "Answer questions, get a standard contract in 3 minutes. Employer signs, PDF saved." },
        { icon: "📍", title: "Location-Based Matching", desc: "See how many minutes by transit. Housing-provided jobs prioritized (E-9 visa friendly)." },
      ],
    },
    how: {
      title: "Apply to your first job within 30 seconds of signup",
      steps: [
        { title: "Sign Up + Visa Info", desc: "Enter visa type, Korean level, address. Employers verified via Korea's National Tax Service API." },
        { title: "See Matched Jobs", desc: "Listings matched to your visa and location, sorted by distance. Housing and transit info at a glance." },
        { title: "1-Minute Chatbot Apply", desc: "Tap a listing → KakaoTalk-style chatbot asks 5 questions. Employer gets notified automatically." },
        { title: "Hire + 3-Min Contract", desc: "Employer approves, chatbot reopens to confirm terms. Both sign, PDF auto-generated." },
      ],
    },
    cta: {
      title: "Legal jobs, **safe contracts** —\nnormal in Korea at last.",
      sub: "Free signup, free contract generation. Built so both employers and workers can trust K-ALBA.",
      primary: "Sign Up Free",
      secondary: "Browse Jobs",
    },
  },
  // 중국어 간단 버전
  zh: {
    hero: {
      tag: "专为在韩外国人打造",
      title: "为韩国**260万外国居民**提供合法透明的就业机会",
      sub: "签证匹配推荐 · 7种语言支持 · 基于KakaoTalk聊天机器人的3分钟劳动合同。秀成律师事务所法律审核。",
      ctaPrimary: "免费开始",
      ctaSecondary: "了解功能",
      stats: [
        { value: "260万", label: "在韩外国居民(2024)" },
        { value: "7种语言", label: "打破语言障碍" },
        { value: "3分钟", label: "聊天机器人签约" },
        { value: "100%", label: "符合劳动法标准" },
      ],
    },
    problem: {
      title: "为什么外国兼职者在韩国很难?",
      sub: "260万外国居民居住韩国,但现有招聘平台是为韩国人设计的。签证、语言和合同三道墙成为外国人的障碍。",
      items: [
        { icon: "🛂", title: "签证不匹配", desc: "不同签证允许的行业/工时不同。传统平台不过滤,存在非法就业风险。" },
        { icon: "🗣️", title: "语言障碍", desc: "韩文招聘和合同难以完全理解。" },
        { icon: "📝", title: "口头合同", desc: "60%以上外国工人无书面合同。欠薪或不公平解雇时难获保护。" },
      ],
    },
    features: {
      title: "K-ALBA提供的四大核心价值",
      items: [
        { icon: "🎯", title: "签证自动筛选", desc: "只显示您签证允许的招聘。无非法就业风险。" },
        { icon: "🌐", title: "7种语言完全支持", desc: "韩中英越乌蒙日。招聘·合同·聊天机器人全覆盖。" },
        { icon: "💬", title: "KakaoTalk聊天机器人签约", desc: "回答问题,3分钟生成标准合同。老板签字后PDF保存。" },
        { icon: "📍", title: "基于位置的匹配", desc: "自动计算公交通勤时间。食宿提供优先显示(E-9适用)。" },
      ],
    },
    how: {
      title: "注册后30秒内申请首份工作",
      steps: [
        { title: "注册+签证信息", desc: "输入签证、韩语水平、住址。老板通过韩国国税厅API验证。" },
        { title: "查看匹配招聘", desc: "按距离排序的签证匹配招聘。食宿和公交信息一目了然。" },
        { title: "1分钟聊天机器人申请", desc: "点击招聘→KakaoTalk式机器人问5个问题。老板自动收到通知。" },
        { title: "录用+3分钟合同", desc: "老板批准后聊天机器人重新打开确认条件。双方签字,PDF自动生成。" },
      ],
    },
    cta: {
      title: "合法的工作,**安全的合同**——\n韩国也应成为常态。",
      sub: "注册免费,合同生成免费。老板和工人都能信任K-ALBA。",
      primary: "免费注册",
      secondary: "浏览招聘",
    },
  },
  // 나머지 4개 언어는 ko를 fallback으로 사용하되, 필요시 CONTENT.vi/uz/mn/ja로 확장 가능
};
// vi/uz/mn/ja는 ko와 동일 (필요 시 개별 번역 추가)
CONTENT.vi = CONTENT.ko;
CONTENT.uz = CONTENT.ko;
CONTENT.mn = CONTENT.ko;
CONTENT.ja = CONTENT.ko;
// 참고: 위 할당은 const 객체의 프로퍼티 추가이므로 런타임 합법
// ESLint no-param-reassign 경고 나오면 eslint-disable-next-line 추가 가능
