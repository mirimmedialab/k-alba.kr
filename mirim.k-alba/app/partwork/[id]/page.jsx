"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { supabase, getCurrentUser } from "@/lib/supabase";
import FileUpload from "@/components/FileUpload";

/**
 * /partwork/[id] — 시간제취업 신청 상세 페이지
 *
 * 기능:
 *   - 신청 상태 및 심사 진행 표시
 *   - 국제처 담당자가 요청한 추가 서류 업로드
 *   - 확인서 PDF 다운로드 (승인 시)
 *
 * 상태별 UI:
 *   submitted         — 검토 대기
 *   reviewing         — 검토 중
 *   documents_needed  — 추가 서류 요청 (업로드 UI 활성화)
 *   approved          — 승인 완료 (PDF 다운로드)
 *   rejected          — 반려 (사유 표시)
 */

const STATUS_INFO = {
  draft:             { label: "작성 중",      color: "#888",    bg: "#F7F5F0", icon: "📝" },
  submitted:         { label: "제출됨",        color: "#1A56F0", bg: "#DBEAFE", icon: "📤" },
  reviewing:         { label: "검토 중",       color: "#A17810", bg: "#FEF3C7", icon: "🔍" },
  documents_needed:  { label: "추가 서류 요청", color: "#F07820", bg: "#FFEDD5", icon: "📋" },
  approved:          { label: "승인 완료",     color: "#00B37E", bg: "#D1FAE5", icon: "✅" },
  rejected:          { label: "반려",          color: "#E03030", bg: "#FEE2E2", icon: "❌" },
  cancelled:         { label: "취소됨",       color: "#888",    bg: "#F7F5F0", icon: "⊘" },
};

const DOCUMENT_LABELS = {
  transcript: { label: "성적증명서", icon: "📊", desc: "대학에서 발급한 공식 성적증명서" },
  attendance: { label: "출석확인서", icon: "📅", desc: "재학 중인 학기의 출석 확인서" },
  other:      { label: "기타 서류", icon: "📎", desc: "담당자가 추가 요청한 서류" },
};

export default function PartWorkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const u = await getCurrentUser();
      if (!u) {
        router.push("/login");
        return;
      }

      if (!supabase) {
        setError("서비스를 초기화할 수 없습니다.");
        setLoading(false);
        return;
      }

      const { data, error: err } = await supabase
        .from("partwork_applications")
        .select("*")
        .eq("id", params.id)
        .eq("user_id", u.id)
        .single();

      if (cancelled) return;

      if (err || !data) {
        setError("신청서를 찾을 수 없습니다.");
        setLoading(false);
        return;
      }

      setApplication(data);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [params.id, router, refreshKey]);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: T.ink3 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <div>신청 정보 불러오는 중...</div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>
          {error || "신청서를 찾을 수 없습니다."}
        </div>
        <Link
          href="/partwork"
          style={{
            display: "inline-block",
            padding: "10px 20px",
            background: T.n9,
            color: T.gold,
            textDecoration: "none",
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          목록으로
        </Link>
      </div>
    );
  }

  const st = STATUS_INFO[application.status] || STATUS_INFO.submitted;
  const needsDocs = application.status === "documents_needed";
  const requestedDocs = application.requested_documents || [];

  return (
    <div style={{ padding: "32px 20px", maxWidth: 720, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: T.ink3,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        marginBottom: 8,
      }}>
        PartWork Application · {application.id.substring(0, 8)}
      </div>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: 24,
          fontWeight: 800,
          color: T.ink,
          letterSpacing: "-0.025em",
          marginBottom: 8,
          lineHeight: 1.25,
        }}>
          {application.employer_name}
        </h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{
            padding: "4px 12px",
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 700,
            background: st.bg,
            color: st.color,
            letterSpacing: "0.02em",
          }}>
            {st.icon} {st.label}
          </span>
          <span style={{ fontSize: 12, color: T.ink3 }}>
            제출: {new Date(application.submitted_at || application.created_at).toLocaleDateString("ko-KR")}
          </span>
        </div>
      </div>

      {/* 🆕 추가 서류 요청 상자 */}
      {needsDocs && (
        <DocumentRequestCard
          application={application}
          requestedDocs={requestedDocs}
          onUploaded={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {/* 반려 사유 */}
      {application.status === "rejected" && application.reviewer_note && (
        <div style={{
          padding: 16,
          background: "#FEE2E2",
          borderLeft: "3px solid #E03030",
          borderRadius: "0 4px 4px 0",
          marginBottom: 24,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#991B1B",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}>
            반려 사유
          </div>
          <div style={{ fontSize: 13, color: "#991B1B", lineHeight: 1.6 }}>
            {application.reviewer_note}
          </div>
        </div>
      )}

      {/* 승인 + PDF */}
      {application.status === "approved" && application.confirmation_pdf_url && (
        <div style={{
          padding: 20,
          background: "#D1FAE5",
          border: "1.5px solid #6EE7B7",
          borderRadius: 8,
          marginBottom: 24,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#065F46", marginBottom: 6 }}>
            승인 완료
          </div>
          <div style={{ fontSize: 12, color: "#065F46", marginBottom: 16, lineHeight: 1.6 }}>
            출입국·외국인청에 제출할 확인서가 발급되었습니다
          </div>
          <a
            href={application.confirmation_pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              background: "#065F46",
              color: "#FFF",
              textDecoration: "none",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            📄 시간제취업확인서 PDF 다운로드
          </a>
        </div>
      )}

      {/* 신청 정보 요약 */}
      <SectionCard title="INFORMATION · 신청 정보">
        <InfoRow label="비자" value={application.visa} />
        <InfoRow label="재학 대학" value={application.university_name} />
        <InfoRow label="대학 인증" value={application.university_certified ? "✓ 인증대학" : "비인증"} />
        <InfoRow label="TOPIK" value={application.topik_level === 0 ? "없음" : `${application.topik_level}급`} />
        <InfoRow label="신청 시점" value={application.season === "semester" ? "학기 중" : "방학 중"} />
      </SectionCard>

      <SectionCard title="WORKPLACE · 근무처">
        <InfoRow label="근무처" value={application.employer_name} />
        {application.position && <InfoRow label="업무" value={application.position} />}
        <InfoRow label="주당 근무" value={`${application.weekly_hours}시간`} />
        <InfoRow label="시급" value={`₩${Number(application.hourly_pay || 0).toLocaleString()}`} />
        <InfoRow label="계약 기간" value={`${application.contract_start || "-"} ~ ${application.contract_end || "-"}`} />
        <InfoRow label="허용 한도" value={application.validation_max_hours == null ? "무제한" : `주 ${application.validation_max_hours}시간`} />
      </SectionCard>

      <SectionCard title="DOCUMENTS · 제출 서류">
        <DocFileRow
          label="여권"
          icon="🛂"
          uploaded={!!application.passport_file_url}
          fileName={application.passport_file_name}
          uploadedAt={application.passport_uploaded_at}
          storagePath={application.passport_file_url}
        />
        <DocFileRow
          label="외국인등록증"
          icon="🪪"
          uploaded={!!application.arc_file_url}
          fileName={application.arc_file_name}
          uploadedAt={application.arc_uploaded_at}
          storagePath={application.arc_file_url}
        />
        {application.transcript_file_url && (
          <DocFileRow
            label="성적증명서"
            icon="📊"
            uploaded={true}
            fileName={application.transcript_file_name}
            uploadedAt={application.transcript_uploaded_at}
            storagePath={application.transcript_file_url}
          />
        )}
        {application.attendance_file_url && (
          <DocFileRow
            label="출석확인서"
            icon="📅"
            uploaded={true}
            fileName={application.attendance_file_name}
            uploadedAt={application.attendance_uploaded_at}
            storagePath={application.attendance_file_url}
          />
        )}
      </SectionCard>

      <div style={{ marginTop: 32, textAlign: "center" }}>
        <Link
          href="/partwork"
          style={{
            display: "inline-block",
            padding: "10px 20px",
            background: T.cream,
            color: T.ink,
            textDecoration: "none",
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 700,
            border: `1px solid ${T.border}`,
          }}
        >
          ← 목록으로
        </Link>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 추가 서류 요청 카드
// ═══════════════════════════════════════════════
function DocumentRequestCard({ application, requestedDocs, onUploaded }) {
  const [uploads, setUploads] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const requiredUploads = requestedDocs.filter((d) => {
    // 이미 업로드된 것은 제외
    if (d === "transcript" && application.transcript_file_url) return false;
    if (d === "attendance" && application.attendance_file_url) return false;
    return true;
  });

  const allUploaded = requiredUploads.every((d) => uploads[d]);

  const handleSubmit = async () => {
    if (!allUploaded || submitting) return;
    setSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      // 각 파일은 이미 FileUpload에서 업로드 완료된 상태 → application에만 저장
      // FileUpload의 applicationId prop으로 이미 저장됐지만, 상태 변경은 수동으로
      const { error } = await supabase
        .from("partwork_applications")
        .update({
          status: "reviewing", // 담당자에게 재검토 요청
          updated_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      if (error) {
        alert("제출 실패: " + error.message);
        setSubmitting(false);
        return;
      }

      alert("✓ 추가 서류가 제출되었습니다!\n담당자가 재검토 후 알림을 보내드립니다.");
      onUploaded?.();
    } catch (err) {
      alert("오류: " + err.message);
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      padding: 20,
      background: "#FFEDD5",
      border: "2px solid #F07820",
      borderRadius: 8,
      marginBottom: 24,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>📋</span>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#9A3412" }}>
          국제처에서 추가 서류를 요청했습니다
        </div>
      </div>

      {application.documents_request_note && (
        <div style={{
          padding: 12,
          background: "#FFF7ED",
          borderRadius: 6,
          marginBottom: 16,
          fontSize: 12,
          color: "#9A3412",
          lineHeight: 1.6,
        }}>
          💬 <strong>담당자 메모:</strong> {application.documents_request_note}
        </div>
      )}

      <div style={{ marginBottom: 12, fontSize: 12, color: "#9A3412" }}>
        요청된 서류를 업로드해 주세요 ({requiredUploads.length}건)
      </div>

      {requiredUploads.map((docType) => {
        const info = DOCUMENT_LABELS[docType];
        return (
          <FileUpload
            key={docType}
            docType={docType}
            label={info.label}
            subtitle={info.desc}
            icon={info.icon}
            required
            applicationId={application.id}
            onChange={(f) => setUploads((u) => ({ ...u, [docType]: f }))}
          />
        );
      })}

      {requiredUploads.length === 0 && (
        <div style={{
          padding: 12,
          background: "#FFF7ED",
          borderRadius: 6,
          fontSize: 12,
          color: "#9A3412",
          textAlign: "center",
        }}>
          ✓ 요청된 서류를 모두 업로드하셨습니다
        </div>
      )}

      {requiredUploads.length > 0 && (
        <button
          onClick={handleSubmit}
          disabled={!allUploaded || submitting}
          style={{
            width: "100%",
            padding: "12px 16px",
            marginTop: 12,
            background: allUploaded && !submitting ? "#F07820" : "#E4E2DE",
            color: allUploaded && !submitting ? "#FFF" : "#888",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 800,
            cursor: allUploaded && !submitting ? "pointer" : "not-allowed",
            fontFamily: "inherit",
          }}
        >
          {submitting ? "제출 중..." : "추가 서류 제출하기 →"}
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// 헬퍼 컴포넌트
// ═══════════════════════════════════════════════
function SectionCard({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        color: T.gold,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        marginBottom: 8,
      }}>
        {title}
      </div>
      <div style={{
        padding: 16,
        background: "#FFF",
        border: `1px solid ${T.border}`,
        borderRadius: 4,
      }}>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "8px 0",
      borderBottom: `1px solid ${T.cream}`,
    }}>
      <span style={{ fontSize: 12, color: T.ink3 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{value}</span>
    </div>
  );
}

function DocFileRow({ label, icon, uploaded, fileName, uploadedAt, storagePath }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  const fetchUrl = async () => {
    if (signedUrl || loadingUrl || !storagePath) return;
    setLoadingUrl(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`/api/partwork/upload?path=${encodeURIComponent(storagePath)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) setSignedUrl(data.file_url);
    } catch (e) {
      console.error(e);
    }
    setLoadingUrl(false);
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 0",
      borderBottom: `1px solid ${T.cream}`,
    }}>
      <span style={{ fontSize: 20, width: 28 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>
          {label}
        </div>
        {uploaded ? (
          <div style={{ fontSize: 11, color: T.ink3, marginTop: 2 }}>
            {fileName || "업로드됨"} ·{" "}
            {uploadedAt && new Date(uploadedAt).toLocaleDateString("ko-KR")}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "#E03030", marginTop: 2 }}>
            미업로드
          </div>
        )}
      </div>
      {uploaded && storagePath && (
        <button
          onClick={async () => {
            await fetchUrl();
            if (signedUrl) window.open(signedUrl, "_blank");
          }}
          style={{
            padding: "6px 12px",
            background: T.cream,
            color: T.ink,
            border: `1px solid ${T.border}`,
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {loadingUrl ? "로딩..." : "보기"}
        </button>
      )}
    </div>
  );
}
