"use client";
import { useState } from "react";
import { T, TYPE, L, VISA, SEMANTIC, SLOGAN, COMPANY, ICON_SIZES } from "@/lib/theme";
import {
  KWordmark, KIcon,
  Button, Badge, VisaBadge,
  Card, CardTitle, CardSubtitle, CardDivider, CardFooter,
  Input, Select,
  Form, FormSection, FormField, FormActions, FormGroup, FormError, validators,
  PageLoading, Spinner, InlineLoading, ButtonLoading, Skeleton, SkeletonCard,
  Modal, ToastProvider, useToast, Empty,
  Avatar, AvatarGroup,
  ChatBubble, QuickReplies, ChatCard, ChatTypingIndicator, ChatContainer,
} from "@/components/ui";

/**
 * /design-system - K-ALBA 디자인 시스템 카탈로그 v2
 *
 * Step 3-A (Brand 6개) + Step 3-B (Form 4개) + Step 3-C (UX 5개) = 15개 컴포넌트 전체.
 */
export default function DesignSystemPage() {
  return (
    <ToastProvider position="bottom-center">
      <DesignSystemContent />
    </ToastProvider>
  );
}

function DesignSystemContent() {
  const [activeTab, setActiveTab] = useState("foundations");

  const tabs = [
    { id: "foundations", label: "Foundations" },
    { id: "brand", label: "Brand (BI)" },
    { id: "buttons", label: "Buttons" },
    { id: "badges", label: "Badges" },
    { id: "visa", label: "Visa" },
    { id: "cards", label: "Cards" },
    { id: "forms", label: "Forms" },
    { id: "loading", label: "Loading" },
    { id: "modal", label: "Modal" },
    { id: "toast", label: "Toast" },
    { id: "empty", label: "Empty" },
    { id: "avatar", label: "Avatar" },
    { id: "chat", label: "Chat" },
    { id: "examples", label: "Examples" },
  ];

  return (
    <div style={{ background: T.cream, minHeight: "100vh", padding: "32px 20px 80px" }}>
      <div style={{ maxWidth: L.container, margin: "0 auto" }}>
        {/* 헤더 */}
        <div style={{ marginBottom: 32, display: "flex", alignItems: "center", gap: 16 }}>
          <KIcon size="lg" />
          <div>
            <h1 style={{ ...TYPE.h1Style, color: T.navy, marginBottom: 4 }}>
              K-ALBA Design System
            </h1>
            <p style={{ fontSize: 14, color: T.ink3 }}>
              BI v2 · Step 3 완료 · 15 components ready
            </p>
          </div>
        </div>

        {/* 탭 */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 32,
            background: T.paper,
            padding: 4,
            borderRadius: L.rLg,
            border: L.border,
            overflowX: "auto",
            flexWrap: "nowrap",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 18px",
                fontSize: 13,
                fontWeight: 700,
                background: activeTab === tab.id ? T.navy : "transparent",
                color: activeTab === tab.id ? T.paper : T.ink2,
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: TYPE.family,
                whiteSpace: "nowrap",
                transition: "all 0.15s",
                flexShrink: 0,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 콘텐츠 */}
        {activeTab === "foundations" && <FoundationsSection />}
        {activeTab === "brand" && <BrandSection />}
        {activeTab === "buttons" && <ButtonsSection />}
        {activeTab === "badges" && <BadgesSection />}
        {activeTab === "visa" && <VisaSection />}
        {activeTab === "cards" && <CardsSection />}
        {activeTab === "forms" && <FormsSection />}
        {activeTab === "loading" && <LoadingSection />}
        {activeTab === "modal" && <ModalSection />}
        {activeTab === "toast" && <ToastSection />}
        {activeTab === "empty" && <EmptySection />}
        {activeTab === "avatar" && <AvatarSection />}
        {activeTab === "chat" && <ChatSection />}
        {activeTab === "examples" && <ExamplesSection />}
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════
// Foundations
// ════════════════════════════════════════════════════════════════════

function FoundationsSection() {
  return (
    <>
      <SectionTitle>Color — Primary</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 32 }}>
        <ColorSwatch name="Coral" hex="#FF6B5A" desc="Primary CTA, K 글자" />
        <ColorSwatch name="Coral Dark" hex="#E85A4D" desc="사장님 페이지" />
        <ColorSwatch name="Mint" hex="#0BD8A2" desc="성공, D-2 비자" />
        <ColorSwatch name="Navy" hex="#0A1628" desc="본문, 배경" textColor="#FFFFFF" />
        <ColorSwatch name="Gold" hex="#B8944A" desc="신뢰 액센트, F-2" />
      </div>

      <SectionTitle>Color — Neutral</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 32 }}>
        <ColorSwatch name="Paper" hex="#FFFFFF" desc="카드, 모달" />
        <ColorSwatch name="Cream" hex="#FAF8F3" desc="페이지 배경" />
        <ColorSwatch name="Ink" hex="#0A1628" desc="본문" textColor="#FFFFFF" />
        <ColorSwatch name="Ink 2" hex="#3F5273" desc="2차 텍스트" textColor="#FFFFFF" />
        <ColorSwatch name="Ink 3" hex="#6B7A95" desc="라벨" textColor="#FFFFFF" />
      </div>

      <SectionTitle>Color — Semantic</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 32 }}>
        <ColorSwatch name="Success" hex="#0BD8A2" desc="합격, 승인" />
        <ColorSwatch name="Warning" hex="#F59E0B" desc="검토 중" />
        <ColorSwatch name="Error" hex="#DC2626" desc="거절, 오류" textColor="#FFFFFF" />
        <ColorSwatch name="Info" hex="#1E40AF" desc="알림" textColor="#FFFFFF" />
      </div>

      <SectionTitle>Typography Scale</SectionTitle>
      <Card>
        <div style={TYPE.displayStyle}>Display 48px</div>
        <SwatchLabel>Pretendard 800 · -0.04em · 1.1</SwatchLabel>

        <div style={{ ...TYPE.h1Style, marginTop: 20 }}>H1 한국에서 일하는 외국인을 위한</div>
        <SwatchLabel>800 · 36px · -0.03em · 1.2</SwatchLabel>

        <div style={{ ...TYPE.h2Style, marginTop: 16 }}>H2 카카오톡으로 3분만에</div>
        <SwatchLabel>700 · 24px · -0.02em · 1.3</SwatchLabel>

        <div style={{ ...TYPE.h3Style, marginTop: 16 }}>H3 알바 매칭 · 시간제취업</div>
        <SwatchLabel>600 · 18px · 1.4</SwatchLabel>

        <div style={{ ...TYPE.bodyStyle, marginTop: 16, color: T.ink2 }}>
          Body 한국에 거주하는 외국인 260만 명을 위한 통합 디지털 인프라.
        </div>
        <SwatchLabel>400 · 15px · 1.7 (다국어 친화)</SwatchLabel>

        <div style={{ marginTop: 16, display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ ...TYPE.numberStyle, color: T.coral }}>12,000</span>
          <span style={{ fontSize: 14, color: T.ink3 }}>원/시간</span>
        </div>
        <SwatchLabel>Number 800 · 28px · 코랄</SwatchLabel>
      </Card>
    </>
  );
}


// ════════════════════════════════════════════════════════════════════
// Brand
// ════════════════════════════════════════════════════════════════════

function BrandSection() {
  return (
    <>
      <SectionTitle>Wordmark — KWordmark</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 32 }}>
        <DemoBox label="Light (default)">
          <KWordmark size={32} />
        </DemoBox>
        <DemoBox label="Dark" bg={T.navy}>
          <KWordmark variant="dark" size={32} />
        </DemoBox>
        <DemoBox label="Mono" bg={T.cream}>
          <KWordmark variant="mono" size={32} />
        </DemoBox>
      </div>

      <SectionTitle>K Icon — KIcon</SectionTitle>
      <Card padding="lg">
        <DemoLabel>Standard (앱 아이콘, 일반 UI)</DemoLabel>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginBottom: 24 }}>
          {["xl", "lg", "md", "sm", "xs", "fav"].map((s) => (
            <div key={s} style={{ textAlign: "center" }}>
              <KIcon variant="standard" size={s} />
              <div style={{ fontSize: 11, color: T.ink3, marginTop: 6 }}>{s}</div>
            </div>
          ))}
        </div>

        <DemoLabel>Kakao (챗봇 아바타 — 알비)</DemoLabel>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginBottom: 24 }}>
          {["lg", "md", "sm", "xs"].map((s) => (
            <div key={s} style={{ textAlign: "center" }}>
              <KIcon variant="kakao" size={s} />
              <div style={{ fontSize: 11, color: T.ink3, marginTop: 6 }}>{s}</div>
            </div>
          ))}
        </div>

        <DemoLabel>Coral (마케팅, 강조)</DemoLabel>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
          {["lg", "md", "sm"].map((s) => (
            <div key={s} style={{ textAlign: "center" }}>
              <KIcon variant="coral" size={s} />
              <div style={{ fontSize: 11, color: T.ink3, marginTop: 6 }}>{s}</div>
            </div>
          ))}
        </div>
      </Card>

      <SectionTitle>Slogan</SectionTitle>
      <Card padding="lg">
        {Object.entries(SLOGAN).map(([lang, text]) => (
          <div key={lang} style={{ display: "flex", gap: 16, marginBottom: 12, alignItems: "baseline" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.coral, minWidth: 28, textTransform: "uppercase" }}>
              {lang}
            </span>
            <span style={{ fontSize: 14, color: T.ink2 }}>{text}</span>
          </div>
        ))}
      </Card>
    </>
  );
}


// ════════════════════════════════════════════════════════════════════
// Buttons
// ════════════════════════════════════════════════════════════════════

function ButtonsSection() {
  return (
    <>
      <SectionTitle>Inapp — 인앱 버튼</SectionTitle>
      <Card padding="lg">
        <DemoRow label="primary (코랄, 알바생/공통)">
          <Button variant="primary" size="sm">소형</Button>
          <Button variant="primary" size="md">중형 (기본)</Button>
          <Button variant="primary" size="lg">대형</Button>
        </DemoRow>

        <DemoRow label="primaryDark (차분 코랄, 사장님)">
          <Button variant="primaryDark" size="md">공고 등록</Button>
          <Button variant="primaryDark" size="md" disabled>비활성</Button>
        </DemoRow>

        <DemoRow label="secondary (외곽선)">
          <Button variant="secondary">취소</Button>
          <Button variant="secondary">자세히 보기</Button>
        </DemoRow>

        <DemoRow label="ghost (투명)">
          <Button variant="ghost">자세히 보기 →</Button>
        </DemoRow>

        <DemoRow label="destructive (삭제)">
          <Button variant="destructive">계정 삭제</Button>
        </DemoRow>
      </Card>

      <SectionTitle>Landing — 랜딩 페이지</SectionTitle>
      <Card padding="lg" style={{ background: T.navy }}>
        <DemoRow label="landingPrimary (골드)">
          <Button variant="landingPrimary">사장님으로 시작</Button>
        </DemoRow>
        <DemoRow label="landingDark (네이비)">
          <Button variant="landingDark" style={{ background: "#1B365D" }}>학교 담당자 등록</Button>
        </DemoRow>
      </Card>
    </>
  );
}


// ════════════════════════════════════════════════════════════════════
// Badges
// ════════════════════════════════════════════════════════════════════

function BadgesSection() {
  return (
    <>
      <SectionTitle>Semantic</SectionTitle>
      <Card padding="lg">
        <DemoRow label="solid (채움)">
          <Badge variant="success" style_="solid">합격</Badge>
          <Badge variant="warning" style_="solid">검토 중</Badge>
          <Badge variant="error" style_="solid">거절</Badge>
          <Badge variant="info" style_="solid">알림</Badge>
          <Badge variant="neutral" style_="solid">대기</Badge>
        </DemoRow>

        <DemoRow label="soft (연한 배경)">
          <Badge variant="success">합격</Badge>
          <Badge variant="warning">검토 중</Badge>
          <Badge variant="error">거절</Badge>
          <Badge variant="info">알림</Badge>
          <Badge variant="neutral">대기</Badge>
        </DemoRow>

        <DemoRow label="outline (외곽선)">
          <Badge variant="success" style_="outline">합격</Badge>
          <Badge variant="warning" style_="outline">검토 중</Badge>
          <Badge variant="error" style_="outline">거절</Badge>
        </DemoRow>

        <DemoRow label="with icon">
          <Badge variant="success" icon="✓">합격</Badge>
          <Badge variant="warning" icon="⏰">기한 임박</Badge>
          <Badge variant="info" icon="📩">새 메시지</Badge>
        </DemoRow>
      </Card>
    </>
  );
}


// ════════════════════════════════════════════════════════════════════
// Visa
// ════════════════════════════════════════════════════════════════════

function VisaSection() {
  const codes = ["D-2", "D-4", "E-9", "F-2", "F-4", "F-5", "H-2"];
  return (
    <>
      <SectionTitle>VisaBadge — 비자 7종</SectionTitle>
      <Card padding="lg">
        <DemoRow label="solid">
          {codes.map((c) => <VisaBadge key={c} code={c} variant="solid" />)}
        </DemoRow>
        <DemoRow label="soft">
          {codes.map((c) => <VisaBadge key={c} code={c} variant="soft" />)}
        </DemoRow>
        <DemoRow label="outline">
          {codes.map((c) => <VisaBadge key={c} code={c} variant="outline" />)}
        </DemoRow>
        <DemoRow label="with label (라벨 포함)">
          <VisaBadge code="E-9" showLabel size="lg" />
          <VisaBadge code="D-2" showLabel size="lg" />
          <VisaBadge code="F-2" showLabel size="lg" />
        </DemoRow>
      </Card>

      <SectionTitle>Color Map</SectionTitle>
      <Card padding="lg">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          {Object.values(VISA).map((v) => (
            <div key={v.code} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: v.bg, borderRadius: 8 }}>
              <VisaBadge code={v.code} size="lg" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: v.color }}>{v.label}</div>
                <div style={{ fontSize: 11, color: T.ink3 }}>{v.color}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}


// ════════════════════════════════════════════════════════════════════
// Cards
// ════════════════════════════════════════════════════════════════════

function CardsSection() {
  return (
    <>
      <SectionTitle>Variants</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        <Card variant="default">
          <CardTitle>Default</CardTitle>
          <CardSubtitle>기본 카드</CardSubtitle>
        </Card>
        <Card variant="employer">
          <CardTitle>Employer</CardTitle>
          <CardSubtitle>사장님 페이지 (골드 라인)</CardSubtitle>
        </Card>
        <Card variant="empty">
          <div style={{ padding: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <CardTitle>Empty State</CardTitle>
            <CardSubtitle>아직 데이터 없음</CardSubtitle>
          </div>
        </Card>
        <Card variant="highlight">
          <CardTitle style={{ color: T.paper }}>Highlight</CardTitle>
          <CardSubtitle style={{ color: "rgba(255,255,255,0.85)" }}>강조 카드</CardSubtitle>
        </Card>
      </div>
    </>
  );
}


// ════════════════════════════════════════════════════════════════════
// Forms (Step 3-B)
// ════════════════════════════════════════════════════════════════════

function FormsSection() {
  const [text, setText] = useState("");
  const [number, setNumber] = useState("");
  const [search, setSearch] = useState("");
  const [select1, setSelect1] = useState("");
  const [select2, setSelect2] = useState([]);

  const visaOptions = [
    { value: "D-2", label: "D-2 유학" },
    { value: "D-4", label: "D-4 어학연수" },
    { value: "E-9", label: "E-9 비전문취업" },
    { value: "F-2", label: "F-2 거주" },
    { value: "F-4", label: "F-4 재외동포" },
    { value: "F-5", label: "F-5 영주" },
    { value: "H-2", label: "H-2 방문취업" },
  ];

  return (
    <>
      <SectionTitle>Input — 입력 필드</SectionTitle>
      <Card padding="lg">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input
            label="이름"
            placeholder="이름을 입력하세요"
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Input
            label="시급"
            type="number"
            placeholder="9860"
            hint="최저시급 9,860원 이상이어야 합니다"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            iconRight={<span style={{ fontSize: 13, color: T.ink3 }}>원</span>}
          />
          <Input
            label="이메일"
            type="email"
            placeholder="example@email.com"
            error="올바른 이메일이 아닙니다"
          />
          <Input
            label="연락처"
            success="✓ 사용 가능한 번호입니다"
            defaultValue="010-1234-5678"
          />
          <Input
            label="비활성"
            disabled
            defaultValue="수정 불가"
          />
        </div>
      </Card>

      <SectionTitle>Input — Search Variant</SectionTitle>
      <Card padding="lg">
        <Input
          variant="search"
          placeholder="알바 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          clearable
          onClear={() => setSearch("")}
          iconLeft={<span>🔍</span>}
        />
      </Card>

      <SectionTitle>Select — 드롭다운</SectionTitle>
      <Card padding="lg">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Select
            label="비자 유형 (단일)"
            options={visaOptions}
            value={select1}
            onChange={setSelect1}
            placeholder="비자를 선택하세요"
          />
          <Select
            label="비자 (다중 선택)"
            mode="multi"
            options={visaOptions}
            value={select2}
            onChange={setSelect2}
            placeholder="여러 개 선택 가능"
            searchable
          />
        </div>
      </Card>

      <SectionTitle>Form Layout</SectionTitle>
      <Card padding="lg">
        <Form maxWidth="normal" onSubmit={(e) => e.preventDefault()}>
          <FormSection title="기본 정보" description="필수 항목을 입력해주세요" divider>
            <FormField label="이름" required>
              <Input placeholder="홍길동" />
            </FormField>
            <FormGroup>
              <FormField label="국적">
                <Input placeholder="한국" />
              </FormField>
              <FormField label="비자">
                <Select options={visaOptions} placeholder="선택" />
              </FormField>
            </FormGroup>
          </FormSection>

          <FormSection title="연락처">
            <FormField label="이메일" required>
              <Input type="email" placeholder="example@email.com" />
            </FormField>
            <FormField label="연락처" hint="010-XXXX-XXXX 형식">
              <Input type="tel" placeholder="010-1234-5678" />
            </FormField>
          </FormSection>

          <FormError message="제출 중 오류가 발생했습니다. 다시 시도해주세요." />

          <FormActions align="right">
            <Button variant="secondary">취소</Button>
            <Button variant="primary" type="submit">저장</Button>
          </FormActions>
        </Form>
      </Card>

      <SectionTitle>Validators</SectionTitle>
      <Card padding="lg">
        <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.8, fontFamily: "monospace", background: T.cream, padding: 16, borderRadius: 8 }}>
          {`import { validators } from '@/components/ui';

validators.required("")           // "필수 입력 항목입니다"
validators.email("invalid")       // "올바른 이메일 형식이 아닙니다"
validators.phone("123")           // "전화번호는 10-11자리 숫자입니다"
validators.minLength(5)("abc")    // "최소 5자 이상 입력해주세요"
validators.numberRange(1, 100)(150)  // "100 이하여야 합니다"
validators.businessNumber("123")  // "사업자등록번호는 10자리입니다"
validators.minWage()(8000)        // "최저시급(9,860원) 이상이어야 합니다"

// 여러 검증 조합
validators.combine(
  validators.required,
  validators.email
)("invalid")  // "올바른 이메일 형식이 아닙니다"`}
        </div>
      </Card>
    </>
  );
}


// ════════════════════════════════════════════════════════════════════
// Loading
// ════════════════════════════════════════════════════════════════════

function LoadingSection() {
  const [showButton, setShowButton] = useState(false);

  return (
    <>
      <SectionTitle>Spinner</SectionTitle>
      <Card padding="lg">
        <DemoRow label="다양한 사이즈">
          <Spinner size={16} />
          <Spinner size={24} />
          <Spinner size={36} />
          <Spinner size={48} thickness={3} />
        </DemoRow>
      </Card>

      <SectionTitle>InlineLoading</SectionTitle>
      <Card padding="lg">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <InlineLoading message="데이터 가져오는 중..." />
          <InlineLoading message="잠시만요" size="sm" />
          <InlineLoading />
        </div>
      </Card>

      <SectionTitle>ButtonLoading</SectionTitle>
      <Card padding="lg">
        <DemoRow>
          <Button variant="primary" onClick={() => setShowButton(!showButton)}>
            {showButton ? <ButtonLoading text="저장 중..." /> : "저장 클릭해보기"}
          </Button>
          <Button variant="primaryDark" disabled>
            <ButtonLoading text="처리 중..." />
          </Button>
        </DemoRow>
      </Card>

      <SectionTitle>Skeleton</SectionTitle>
      <Card padding="lg">
        <DemoLabel>Title + Text 3 lines</DemoLabel>
        <div style={{ marginBottom: 24 }}>
          <Skeleton variant="title" />
          <div style={{ height: 8 }} />
          <Skeleton lines={3} />
        </div>

        <DemoLabel>Avatar + Image + Button</DemoLabel>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24 }}>
          <Skeleton variant="avatar" />
          <Skeleton variant="image" width="200px" height={100} />
          <Skeleton variant="button" />
        </div>

        <DemoLabel>SkeletonCard (Job Card 모양)</DemoLabel>
        <div style={{ maxWidth: 320 }}>
          <SkeletonCard />
        </div>
      </Card>

      <SectionTitle>PageLoading</SectionTitle>
      <Card padding="lg" style={{ background: T.cream, padding: 0 }}>
        <PageLoading message="잠시만 기다려주세요" minHeight={200} />
      </Card>
    </>
  );
}


// ════════════════════════════════════════════════════════════════════
// Modal
// ════════════════════════════════════════════════════════════════════

function ModalSection() {
  const [open1, setOpen1] = useState(false);
  const [open2, setOpen2] = useState(false);
  const [open3, setOpen3] = useState(false);

  return (
    <>
      <SectionTitle>Modal — 자동 분기 (데스크톱: 모달, 모바일: 바텀시트)</SectionTitle>
      <Card padding="lg">
        <DemoRow label="기본 (auto + md)">
          <Button onClick={() => setOpen1(true)}>모달 열기</Button>
          <Button variant="secondary" onClick={() => setOpen2(true)}>큰 모달 (lg)</Button>
          <Button variant="ghost" onClick={() => setOpen3(true)}>강제 바텀시트</Button>
        </DemoRow>
      </Card>

      <Modal
        open={open1}
        onClose={() => setOpen1(false)}
        title="공고 등록"
        description="외국인 채용 공고를 등록합니다"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen1(false)}>취소</Button>
            <Button variant="primary" onClick={() => setOpen1(false)}>등록</Button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: T.ink2, lineHeight: 1.6 }}>
          공고 등록 시 사업자번호 검증이 진행됩니다.
          국세청 API를 통해 자동으로 확인되며 약 5초가 소요됩니다.
        </p>
        <p style={{ fontSize: 14, color: T.ink2, lineHeight: 1.6, marginTop: 12 }}>
          최저시급 (9,860원) 이상의 시급만 등록 가능합니다.
        </p>
      </Modal>

      <Modal
        open={open2}
        onClose={() => setOpen2(false)}
        title="지원자 상세"
        size="lg"
        footer={<Button variant="primary" onClick={() => setOpen2(false)}>닫기</Button>}
      >
        <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          <Avatar name="Linh" size="lg" />
          <div>
            <h3 style={{ ...TYPE.h3Style, marginBottom: 4 }}>Linh T.</h3>
            <CardSubtitle>베트남 · 28세 · TOPIK 2급</CardSubtitle>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <VisaBadge code="E-9" showLabel />
          <Badge variant="neutral">한국 거주 2년차</Badge>
        </div>
        <p style={{ fontSize: 14, color: T.ink2, lineHeight: 1.7 }}>
          한국에서 카페 일을 2년 했습니다. 라떼 아트 가능하고 한국어로 손님 응대 가능합니다.
          성실하게 일하겠습니다!
        </p>
      </Modal>

      <Modal
        open={open3}
        onClose={() => setOpen3(false)}
        variant="sheet"
        title="필터"
      >
        <p style={{ fontSize: 14, color: T.ink2 }}>
          모바일 바텀시트 강제. 폰에서 자연스러운 UX.
        </p>
      </Modal>
    </>
  );
}


// ════════════════════════════════════════════════════════════════════
// Toast
// ════════════════════════════════════════════════════════════════════

function ToastSection() {
  const toast = useToast();

  return (
    <>
      <SectionTitle>Toast — useToast() 훅으로 호출</SectionTitle>
      <Card padding="lg">
        <DemoRow label="기본 4종 시맨틱">
          <Button variant="secondary" onClick={() => toast.success("저장되었습니다")}>
            success
          </Button>
          <Button variant="secondary" onClick={() => toast.warning("기한이 임박했습니다")}>
            warning
          </Button>
          <Button variant="secondary" onClick={() => toast.error("저장에 실패했습니다")}>
            error
          </Button>
          <Button variant="secondary" onClick={() => toast.info("새 알림이 있어요")}>
            info
          </Button>
        </DemoRow>

        <DemoRow label="제목 + 메시지">
          <Button variant="secondary" onClick={() => toast.show({
            variant: "success",
            title: "지원 완료",
            message: "결과는 카카오톡으로 알려드릴게요",
          })}>
            제목 포함 토스트
          </Button>
        </DemoRow>

        <DemoRow label="액션 버튼">
          <Button variant="secondary" onClick={() => toast.show({
            variant: "info",
            title: "새 메시지",
            message: "사장님이 답장을 보냈어요",
            action: { label: "확인하러 가기", onClick: () => alert("이동") },
          })}>
            액션 토스트
          </Button>
        </DemoRow>

        <DemoRow label="긴 시간 (10초)">
          <Button variant="secondary" onClick={() => toast.show({
            variant: "warning",
            message: "이 토스트는 10초 동안 보입니다",
            duration: 10000,
          })}>
            긴 토스트
          </Button>
        </DemoRow>
      </Card>

      <SectionTitle>사용법</SectionTitle>
      <Card padding="lg">
        <pre style={{ fontSize: 12, color: T.ink2, lineHeight: 1.7, fontFamily: "monospace", background: T.cream, padding: 16, borderRadius: 8, overflow: "auto" }}>
{`// 1. layout.jsx에 Provider 감싸기
import { ToastProvider } from "@/components/ui";

export default function Layout({ children }) {
  return <ToastProvider>{children}</ToastProvider>;
}

// 2. 어떤 컴포넌트에서든 사용
import { useToast } from "@/components/ui";

function MyComponent() {
  const toast = useToast();

  return <Button onClick={() => toast.success("저장됨")}>저장</Button>;
}`}
        </pre>
      </Card>
    </>
  );
}


// ════════════════════════════════════════════════════════════════════
// Empty
// ════════════════════════════════════════════════════════════════════

function EmptySection() {
  return (
    <>
      <SectionTitle>Empty States</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <Empty variant="no-data" />
        <Empty variant="no-results" />
        <Empty variant="no-permission" />
        <Empty variant="error" />
        <Empty variant="coming-soon" />
      </div>

      <SectionTitle>With Action</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <Empty
          variant="no-results"
          description="다른 검색어로 시도해보세요"
          action={<Button>필터 초기화</Button>}
        />
        <Empty
          variant="error"
          title="공고를 불러오지 못했어요"
          description="네트워크 연결을 확인해주세요"
          action={<Button variant="secondary">다시 시도</Button>}
        />
      </div>
    </>
  );
}


// ════════════════════════════════════════════════════════════════════
// Avatar
// ════════════════════════════════════════════════════════════════════

function AvatarSection() {
  return (
    <>
      <SectionTitle>User Avatar</SectionTitle>
      <Card padding="lg">
        <DemoLabel>다양한 사이즈 + 이름 기반 자동 색상</DemoLabel>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <Avatar name="Linh" size="xl" />
          <Avatar name="Bayar" size="lg" />
          <Avatar name="Wang" size="md" />
          <Avatar name="Park" size="sm" />
          <Avatar name="Kim" size="xs" />
        </div>
      </Card>

      <SectionTitle>Online Indicator</SectionTitle>
      <Card padding="lg">
        <DemoRow label="online / offline">
          <Avatar name="Linh" size="lg" online />
          <Avatar name="Bayar" size="lg" online={false} />
        </DemoRow>
      </Card>

      <SectionTitle>Company Avatar (사각형 라운드)</SectionTitle>
      <Card padding="lg">
        <DemoRow label="회사">
          <Avatar variant="company" name="블루보틀" size="lg" />
          <Avatar variant="company" name="GS25" size="lg" />
          <Avatar variant="company" name="스타벅스" size="md" />
        </DemoRow>
      </Card>

      <SectionTitle>K Icon Avatar (챗봇)</SectionTitle>
      <Card padding="lg">
        <DemoRow label="K Avatar 변형 — 챗봇 알비">
          <Avatar variant="k" kVariant="kakao" size="lg" />
          <Avatar variant="k" kVariant="standard" size="lg" />
          <Avatar variant="k" kVariant="coral" size="lg" />
        </DemoRow>
      </Card>

      <SectionTitle>Avatar Group</SectionTitle>
      <Card padding="lg">
        <DemoLabel>3명 이상은 +N 표시 (max=3)</DemoLabel>
        <AvatarGroup max={3}>
          <Avatar name="Linh" />
          <Avatar name="Bayar" />
          <Avatar name="Wang" />
          <Avatar name="Park" />
          <Avatar name="Kim" />
        </AvatarGroup>
      </Card>
    </>
  );
}


// ════════════════════════════════════════════════════════════════════
// Chat
// ════════════════════════════════════════════════════════════════════

function ChatSection() {
  const [step, setStep] = useState(0);

  return (
    <>
      <SectionTitle>Chat Components — 카카오톡 챗봇 알비 흐름</SectionTitle>
      <div style={{ maxWidth: 360 }}>
        <ChatContainer>
          <ChatBubble variant="bot">
            <strong>안녕하세요! 알비예요</strong>
            <br />
            K-ALBA의 알바 도우미입니다.
            <br />
            무엇을 도와드릴까요?
          </ChatBubble>

          <QuickReplies
            options={["알바 찾기", "공고 등록", "시간제취업", "내 정보"]}
            onSelect={(v) => alert(v)}
          />

          {step >= 1 && (
            <ChatBubble variant="user" timestamp="오후 3:42">
              알바 찾기
            </ChatBubble>
          )}

          {step >= 2 && (
            <ChatBubble variant="bot">
              <strong>Linh님께 추천하는 알바 3개를 찾았어요!</strong>
            </ChatBubble>
          )}

          {step >= 3 && (
            <ChatCard
              visa="E-9"
              location="강남구"
              title="카페 바리스타"
              subtitle="블루보틀 강남점"
              wage={12000}
              primaryAction={{ label: "지원하기", onClick: () => alert("지원") }}
              secondaryAction={{ label: "자세히", onClick: () => alert("자세히") }}
            />
          )}

          {step === 4 && <ChatTypingIndicator />}
        </ChatContainer>

        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <Button size="sm" onClick={() => setStep(Math.max(0, step - 1))}>← 이전</Button>
          <Button size="sm" variant="primary" onClick={() => setStep(Math.min(4, step + 1))}>다음 →</Button>
          <Button size="sm" variant="ghost" onClick={() => setStep(0)}>처음으로</Button>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: T.ink3 }}>
          단계: {step}/4 · 다음 버튼으로 챗봇 흐름 시뮬레이션
        </div>
      </div>
    </>
  );
}


// ════════════════════════════════════════════════════════════════════
// Examples
// ════════════════════════════════════════════════════════════════════

function ExamplesSection() {
  return (
    <>
      <SectionTitle>Job Card</SectionTitle>
      <div style={{ maxWidth: 360, marginBottom: 32 }}>
        <Card hoverable>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <VisaBadge code="E-9" />
            <Badge variant="neutral" size="sm">한국어 초급</Badge>
          </div>
          <CardTitle>카페 바리스타</CardTitle>
          <CardSubtitle>블루보틀 강남점 · 강남구</CardSubtitle>
          <CardFooter>
            <div>
              <div style={{ fontSize: 11, color: T.ink3 }}>시급</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ ...TYPE.numberStyle, fontSize: 20, color: T.coral }}>12,000</span>
                <span style={{ fontSize: 12, color: T.ink3 }}>원</span>
              </div>
            </div>
            <Button variant="primary" size="sm">지원하기</Button>
          </CardFooter>
        </Card>
      </div>

      <SectionTitle>Application Status List</SectionTitle>
      <div style={{ maxWidth: 360, display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
        <Card padding="sm">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>카페 바리스타</div>
              <div style={{ fontSize: 11, color: T.ink3 }}>블루보틀 강남점</div>
            </div>
            <Badge variant="warning">검토 중</Badge>
          </div>
        </Card>
        <Card padding="sm">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>편의점 야간</div>
              <div style={{ fontSize: 11, color: T.ink3 }}>GS25 강남역점</div>
            </div>
            <Badge variant="success" icon="✓">합격</Badge>
          </div>
        </Card>
      </div>

      <SectionTitle>Brand Header</SectionTitle>
      <Card padding="md">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <KWordmark size={24} />
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Avatar name="Linh" size="xs" />
            <Button variant="ghost" size="sm">로그인</Button>
            <Button variant="primary" size="sm">시작하기</Button>
          </div>
        </div>
      </Card>
    </>
  );
}


// ════════════════════════════════════════════════════════════════════
// 헬퍼
// ════════════════════════════════════════════════════════════════════

function SectionTitle({ children }) {
  return (
    <h2 style={{
      ...TYPE.h2Style,
      color: T.navy,
      marginBottom: 12,
      marginTop: 32,
      paddingBottom: 8,
      borderBottom: `2px solid ${T.gold}`,
    }}>
      {children}
    </h2>
  );
}

function ColorSwatch({ name, hex, desc, textColor = "#0A1628" }) {
  return (
    <div style={{ borderRadius: 8, overflow: "hidden", border: L.border }}>
      <div style={{ background: hex, color: textColor, padding: 16, fontWeight: 700, fontSize: 13 }}>{name}</div>
      <div style={{ background: T.paper, padding: 12 }}>
        <div style={{ fontSize: 11, color: T.ink, fontFamily: "monospace", fontWeight: 700 }}>{hex}</div>
        <div style={{ fontSize: 11, color: T.ink3, marginTop: 2 }}>{desc}</div>
      </div>
    </div>
  );
}

function SwatchLabel({ children }) {
  return <div style={{ fontSize: 11, color: T.ink3, marginTop: 4, fontFamily: "monospace" }}>{children}</div>;
}

function DemoBox({ label, children, bg = T.paper }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{
        background: bg,
        padding: 24,
        borderRadius: 8,
        border: bg === T.paper ? L.border : "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 80,
      }}>
        {children}
      </div>
      <div style={{ fontSize: 11, color: T.ink3, textAlign: "center" }}>{label}</div>
    </div>
  );
}

function DemoRow({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <DemoLabel>{label}</DemoLabel>}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

function DemoLabel({ children }) {
  return (
    <div style={{ fontSize: 11, color: T.ink3, marginBottom: 8, fontWeight: 600 }}>
      {children}
    </div>
  );
}
