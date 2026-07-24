"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { PageLoading } from "@/components/ui";

/**
 * /training — 알바생 온보딩 교육 목록
 *
 * RLS로 자동 필터: 지원한 사장님(open_to_applicants) 또는 계약 맺은 사장님의 활성 과정만 보임.
 * 응시 결과가 있으면 점수 배지 표시.
 */
export default function TrainingListPage() {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [results, setResults] = useState({}); // course_id → result

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace("/login"); return; }
      const { data: cs } = await supabase
        .from("training_courses")
        .select("id, title, description, owner:profiles!training_courses_owner_id_fkey(company_name, name), sections, questions")
        .order("created_at", { ascending: false });
      setCourses(cs || []);
      const { data: rs } = await supabase
        .from("training_results")
        .select("course_id, job_score, job_total, korean_score, korean_total")
        .eq("worker_id", u.id);
      const map = {};
      for (const r of rs || []) map[r.course_id] = r;
      setResults(map);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <PageLoading />;

  return (
    <div style={{ padding: "24px 20px 80px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: T.ink, margin: "6px 0 4px" }}>🎓 {t("training.title")}</h1>
      <p style={{ fontSize: 13, color: T.ink3, margin: "0 0 20px" }}>{t("training.subtitle")}</p>

      {courses.length === 0 ? (
        <div style={{ background: T.cream, borderRadius: 12, padding: 20, fontSize: 13.5, color: T.ink2, lineHeight: 1.7 }}>
          {t("training.noCourses")}
        </div>
      ) : (
        courses.map((c) => {
          const r = results[c.id];
          const nQ = (c.questions || []).length;
          return (
            <Link key={c.id} href={`/training/${c.id}`} style={{ textDecoration: "none" }}>
              <div style={{
                background: T.paper, border: `1px solid ${T.border}`, borderRadius: 12,
                padding: "16px 18px", marginBottom: 12, cursor: "pointer",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15.5, fontWeight: 800, color: T.ink }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: T.ink3, marginTop: 3 }}>
                      {t("training.by")}: {c.owner?.company_name || c.owner?.name || "-"}
                      {" · "}{(c.sections || []).length} {t("training.sections")} · {nQ} {t("training.quiz")}
                    </div>
                    {c.description && <div style={{ fontSize: 12.5, color: T.ink2, marginTop: 6, lineHeight: 1.6 }}>{c.description}</div>}
                  </div>
                  {r ? (
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#0E7A3D", background: "#DDF3E4", borderRadius: 999, padding: "5px 11px", whiteSpace: "nowrap" }}>
                      ✓ {t("training.done")} {r.job_score + r.korean_score}/{r.job_total + r.korean_total}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 800, color: T.coral, background: "#FFF1EC", borderRadius: 999, padding: "5px 11px", whiteSpace: "nowrap" }}>
                      {t("training.start")}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}
