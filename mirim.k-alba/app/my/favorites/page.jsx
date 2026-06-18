"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { getCurrentUser, getMyFavorites, removeFavorite } from "@/lib/supabase";
import { useT, useLocale } from "@/lib/i18n";
import { romanizeRegion, romanizeCompany } from "@/lib/koroman";
import { ListPageSkel } from "@/components/Wireframe";
import { Empty, Button, PageLoading } from "@/components/ui";
import { useIsDesktop } from "@/lib/useIsDesktop";

/**
 * /my/favorites 관심공고(찜) 목록 — 알바생 전용
 * 지원내역(/my/applications) 패턴을 따름.
 *   - 카드 클릭 → 해당 공고 상세(/jobs/[id])로 이동
 *   - 하트(♥) 클릭 → 찜 해제 (리스트에서 즉시 제거)
 * 모바일 코드는 기존 패턴 그대로, 데스크탑은 2열 그리드 분기.
 */
export default function MyFavoritesPage() {
  const router = useRouter();
  const t = useT();
  const { locale } = useLocale();
  const [favorites, setFavorites] = useState([]);
  const [tr, setTr] = useState({});
  const [loading, setLoading] = useState(true);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    getCurrentUser().then(async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      const favs = await getMyFavorites(u.id);
      setFavorites(favs);
      setLoading(false);
    });
  }, [router]);

  // 제목 지연 배치 번역 (비한국어): 찜한 공고들의 제목을 한 번에 번역/캐시
  const idsKey = favorites.map((f) => f.job_id).join(",");
  useEffect(() => {
    if (locale === "ko" || !idsKey) return;
    const ids = idsKey.split(",").map(Number).filter(Boolean);
    if (ids.length === 0) return;
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/jobs/translate-batch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids, lang: locale }),
        });
        const d = await r.json();
        if (alive && d?.map) {
          setTr((prev) => {
            const n = { ...prev };
            for (const [k, v] of Object.entries(d.map)) n[`${locale}:${k}`] = v;
            return n;
          });
        }
      } catch (_) {}
    })();
    return () => { alive = false; };
  }, [idsKey, locale]);

  const handleRemove = async (e, fav) => {
    e.preventDefault();
    e.stopPropagation();
    const u = await getCurrentUser();
    if (!u) return;
    setFavorites((prev) => prev.filter((f) => f.id !== fav.id)); // 낙관적 제거
    const { error } = await removeFavorite(u.id, fav.job_id);
    if (error) {
      const favs = await getMyFavorites(u.id); // 실패 시 재동기화
      setFavorites(favs);
    }
  };

  if (loading) return isDesktop ? <PageLoading message={t("partwork.loading")} minHeight={400} /> : <ListPageSkel maxWidth={820} rows={3} />;

  const payText = (job) => {
    if (!job) return "";
    const amount = Number(job.pay_amount ?? job.pay ?? 0);
    if (!amount) return "";
    const pt = job.pay_type || "시급";
    if (locale === "ko") return `${pt} ${amount.toLocaleString()}${t("pay.won")}`;
    const period = ({ "시급": "hour", "일급": "day", "월급": "month", "연봉": "year" })[pt] || "hour";
    return `${amount.toLocaleString()} ${t("pay.won")} / ${t("pay." + period)}`;
  };
  const areaText = (job) => { const a = job?.sigungu || job?.address || job?.sido || ""; return locale !== "ko" ? romanizeRegion(a) : a; };
  const companyText = (job) => {
    const c = job?.employer?.company_name || job?.employer_external_name || job?.company_name || "";
    if (!c) return t("myApplications.companyUnknown");
    return locale !== "ko" ? `${c} (${romanizeCompany(c)})` : c;
  };

  const HeartBtn = ({ fav }) => (
    <button
      onClick={(e) => handleRemove(e, fav)}
      aria-label={t("favorites.remove")}
      title={t("favorites.remove")}
      style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 8, background: T.coralL, border: `1px solid ${T.coral}`, color: T.coral, fontSize: 16, cursor: "pointer", fontFamily: "inherit", lineHeight: 1 }}
    >
      ♥
    </button>
  );

  // ───────── 데스크탑(웹) 전용: 넓은 컨테이너 + 2열 카드 그리드 ─────────
  if (isDesktop) {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 28px 64px" }}>
        <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
          {t("favorites.header")}
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: T.ink, letterSpacing: "-0.025em", marginBottom: 6, lineHeight: 1.2 }}>
          {t("favorites.title").replace("{count}", favorites.length)}
        </h1>
        <p style={{ color: T.ink2, fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>{t("favorites.subtitle")}</p>

        {favorites.length === 0 ? (
          <Empty
            variant="no-data"
            icon="🤍"
            title={t("favorites.empty")}
            description={t("favorites.emptyDesc")}
            action={<Button variant="primary" href="/jobs">{t("myApplications.findJobsBtn")}</Button>}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {favorites.map((fav) => (
              <Link key={fav.id} href={`/jobs/${fav.job_id}`} style={{ textDecoration: "none" }}>
                <div
                  style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px", background: T.paper, transition: "box-shadow 0.15s, border-color 0.15s", height: "100%", boxSizing: "border-box" }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(10,22,40,0.08)"; e.currentTarget.style.borderColor = T.ink3; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = T.border; }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 15.5, fontWeight: 800, color: T.ink, letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                      {(tr[`${locale}:${fav.job_id}`] && tr[`${locale}:${fav.job_id}`].title) || fav.job?.title || t("jobs.title")}
                    </span>
                    <HeartBtn fav={fav} />
                  </div>
                  <div style={{ fontSize: 13, color: T.ink2, marginBottom: 6 }}>{companyText(fav.job)}</div>
                  <div style={{ fontSize: 12.5, color: T.ink3, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {payText(fav.job) && <span>{payText(fav.job)}</span>}
                    {areaText(fav.job) && <span>· {areaText(fav.job)}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 20px", maxWidth: 820, margin: "0 auto" }}>
      <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
      <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
        {t("favorites.header")}
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: T.ink, letterSpacing: "-0.025em", marginBottom: 6, lineHeight: 1.25 }}>
        {t("favorites.title").replace("{count}", favorites.length)}
      </h1>
      <p style={{ color: T.ink2, fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>{t("favorites.subtitle")}</p>

      {favorites.length === 0 ? (
        <Empty
          variant="no-data"
          icon="🤍"
          title={t("favorites.empty")}
          description={t("favorites.emptyDesc")}
          action={<Button variant="primary" href="/jobs">{t("myApplications.findJobsBtn")}</Button>}
        />
      ) : (
        <div>
          {favorites.map((fav) => (
            <Link key={fav.id} href={`/jobs/${fav.job_id}`} style={{ textDecoration: "none" }}>
              <div
                style={{ padding: "18px 0", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "flex-start", gap: 14, cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = T.cream)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: T.ink, letterSpacing: "-0.02em", marginBottom: 6 }}>
                    {(tr[`${locale}:${fav.job_id}`] && tr[`${locale}:${fav.job_id}`].title) || fav.job?.title || t("jobs.title")}
                  </div>
                  <div style={{ fontSize: 13, color: T.ink2, marginBottom: 4 }}>{companyText(fav.job)}</div>
                  <div style={{ fontSize: 12, color: T.ink3, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {payText(fav.job) && <span>{payText(fav.job)}</span>}
                    {areaText(fav.job) && <span>· {areaText(fav.job)}</span>}
                  </div>
                </div>
                <HeartBtn fav={fav} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
