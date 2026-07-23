"use client";
// 상호 평가 페이지 — 알림톡 「평가 남기기」 버튼 랜딩
// /reviews/[id] (id = 계약 ID)
// 계약 당사자만 접근 (contracts RLS). 역할에 따라 평가 대상 자동 결정:
//   알바생 → 근무처(사장님) 평가, 사장님 → 알바생 평가
// 별점(필수) + 한줄평(선택). 제출 후 재제출 불가(UNIQUE), 본인 작성분만 조회 가능.
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { useT } from "@/lib/i18n";
import { getCurrentUser, getContract, supabase } from "@/lib/supabase";
import { PageLoading } from "@/components/ui";

export default function ReviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const t = useT();

  const [phase, setPhase] = useState("loading"); // loading | form | done | already | error
  const [contract, setContract] = useState(null);
  const [me, setMe] = useState(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.replace(`/login?next=${encodeURIComponent(`/reviews/${id}`)}`);
          return;
        }
        const c = await getContract(id);
        if (!c || (user.id !== c.worker_id && user.id !== c.employer_id)) {
          setPhase("error");
          setErrMsg(t("review.notFound", null, "계약을 찾을 수 없거나 접근 권한이 없어요."));
          return;
        }
        setMe(user);
        setContract(c);
        // 이미 제출했는지 확인 (RLS: 본인 작성분만 보임)
        const direction = user.id === c.worker_id ? "worker_to_employer" : "employer_to_worker";
        const { data: existing } = await supabase
          .from("reviews").select("id, rating, comment")
          .eq("contract_id", c.id).eq("direction", direction).maybeSingle();
        if (existing) {
          setRating(existing.rating);
          setComment(existing.comment || "");
          setPhase("already");
        } else {
          setPhase("form");
        }
      } catch (e) {
        setPhase("error");
        setErrMsg(String(e.message || e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isWorker = me && contract && me.id === contract.worker_id;
  const targetName = contract
    ? isWorker
      ? contract.company_name || contract.business_name || t("review.workplace", null, "근무처")
      : contract.worker_name || t("review.worker", null, "알바생")
    : "";

  const submit = async () => {
    if (submitting || !rating) return;
    setSubmitting(true);
    setErrMsg("");
    try {
      const direction = isWorker ? "worker_to_employer" : "employer_to_worker";
      const reviewee_id = isWorker ? contract.employer_id : contract.worker_id;
      const { error } = await supabase.from("reviews").insert({
        contract_id: contract.id,
        reviewer_id: me.id,
        reviewee_id,
        direction,
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw new Error(error.message);
      setPhase("done");
    } catch (e) {
      setErrMsg(t("review.submitFail", null, "제출에 실패했어요") + ": " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === "loading") return <PageLoading message={t("review.loading", null, "불러오는 중...")} />;

  const card = {
    maxWidth: 480, margin: "0 auto", padding: "28px 20px 40px",
  };
  const box = {
    background: "#fff", border: `1px solid ${T.border}`, borderRadius: 12, padding: "26px 22px",
  };

  if (phase === "error") {
    return (
      <div style={card}><div style={box}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 8 }}>😥 {errMsg}</div>
        <button onClick={() => router.push("/")} style={{ marginTop: 10, background: T.green, color: "#fff", border: "none", borderRadius: 6, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          {t("review.goHome", null, "홈으로")}
        </button>
      </div></div>
    );
  }

  if (phase === "done" || phase === "already") {
    return (
      <div style={card}><div style={{ ...box, textAlign: "center" }}>
        <div style={{ fontSize: 34, marginBottom: 10 }}>🙏</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.ink, marginBottom: 6 }}>
          {phase === "done"
            ? t("review.thanks", null, "평가가 제출되었어요. 감사합니다!")
            : t("review.alreadyDone", null, "이미 평가를 제출하셨어요.")}
        </div>
        <div style={{ fontSize: 13, color: T.ink2, marginBottom: 4 }}>
          {"★".repeat(rating)}{"☆".repeat(5 - rating)}
        </div>
        {comment && <div style={{ fontSize: 13, color: T.ink2, marginTop: 6 }}>&ldquo;{comment}&rdquo;</div>}
        <button onClick={() => router.push("/jobs")} style={{ marginTop: 18, background: T.green, color: "#fff", border: "none", borderRadius: 6, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          {t("review.browseJobs", null, "공고 보러가기")}
        </button>
      </div></div>
    );
  }

  // form
  return (
    <div style={card}>
      <div style={box}>
        <div style={{ fontSize: 12, color: T.ink3, marginBottom: 4 }}>
          {contract.company_name || ""} · {contract.contract_start || ""} ~ {contract.contract_end || t("review.ongoing", null, "근무 중")}
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: T.ink, margin: "0 0 6px" }}>
          {isWorker
            ? t("review.titleWorker", null, "근무처는 어떠셨나요?")
            : t("review.titleEmployer", null, "함께한 알바생은 어떠셨나요?")}
        </h1>
        <div style={{ fontSize: 13, color: T.ink2, marginBottom: 18 }}>
          <strong>{targetName}</strong>{t("review.subtitle", null, "에 대한 솔직한 평가를 남겨주세요. 평가는 상대방에게 공개되지 않아요.")}
        </div>

        {/* 별점 */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 6 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${n} stars`}
              style={{ background: "none", border: "none", fontSize: 34, cursor: "pointer", padding: 2, lineHeight: 1, color: (hover || rating) >= n ? "#F5B301" : "#D8D8D8" }}>
              ★
            </button>
          ))}
        </div>
        <div style={{ textAlign: "center", fontSize: 12, color: T.ink3, marginBottom: 16, minHeight: 16 }}>
          {rating > 0 && [
            t("review.r1", null, "많이 아쉬워요"),
            t("review.r2", null, "아쉬워요"),
            t("review.r3", null, "보통이에요"),
            t("review.r4", null, "좋아요"),
            t("review.r5", null, "최고예요!"),
          ][rating - 1]}
        </div>

        {/* 한줄평 */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 200))}
          placeholder={isWorker
            ? t("review.phWorker", null, "예: 사장님이 친절하고 급여도 정확하게 주셨어요 (선택, 200자)")
            : t("review.phEmployer", null, "예: 시간 약속을 잘 지키고 성실하게 일했어요 (선택, 200자)")}
          rows={3}
          style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", resize: "vertical", marginBottom: 14 }}
        />

        {errMsg && <div style={{ fontSize: 12, color: "#C0392B", marginBottom: 10 }}>{errMsg}</div>}

        <button onClick={submit} disabled={!rating || submitting} style={{
          width: "100%", background: rating ? T.green : "#CFCFCF", color: "#fff", border: "none",
          borderRadius: 8, padding: "13px 0", fontSize: 14, fontWeight: 800,
          cursor: rating && !submitting ? "pointer" : "default", fontFamily: "inherit",
        }}>
          {submitting ? t("review.submitting", null, "제출 중...") : t("review.submit", null, "평가 제출하기")}
        </button>
      </div>
    </div>
  );
}
