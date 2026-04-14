"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { T } from "@/lib/theme";
import { Card } from "@/components/UI";
import { getJobs } from "@/lib/supabase";
import { useT } from "@/lib/i18n";

const DEMO_JOBS = [
  { id: 1, icon: "☕", title: "카페 바리스타", company: "블루보틀 강남점", area: "강남구", hours: "주 20시간", pay: 12000, visa: ["D-2", "F-4", "H-2"], korean: "beginner", type: "카페", days: ["월", "수", "금"], time: "14:00~20:00", posted: "2일 전" },
  { id: 2, icon: "📚", title: "영어 과외 선생님", company: "에듀커넥트", area: "온라인", hours: "자유시간", pay: 25000, visa: ["D-2", "E-7", "F-2", "F-5"], korean: "none", type: "과외", days: ["화", "목"], time: "17:00~19:00", posted: "1일 전" },
  { id: 3, icon: "🍜", title: "한식당 서빙", company: "이태원 정", area: "이태원", hours: "주 15시간", pay: 11000, visa: ["D-2", "D-4", "E-9", "H-2", "F-6"], korean: "intermediate", type: "식당", days: ["금", "토", "일"], time: "17:00~22:00", posted: "3일 전" },
  { id: 4, icon: "🏭", title: "공장 생산직", company: "삼성전자 협력사", area: "수원", hours: "주 40시간", pay: 12500, visa: ["E-9", "H-2", "F-4"], korean: "beginner", type: "생산", days: ["월", "화", "수", "목", "금"], time: "08:00~17:00", posted: "오늘" },
  { id: 5, icon: "🌐", title: "중국어 번역 보조", company: "글로벌트레이드", area: "종로구", hours: "주 10시간", pay: 15000, visa: ["D-2", "F-2", "F-4", "F-5"], korean: "advanced", type: "번역", days: ["월", "수", "금"], time: "10:00~13:00", posted: "5일 전" },
  { id: 6, icon: "🏨", title: "호텔 프론트 데스크", company: "롯데호텔 명동", area: "명동", hours: "주 30시간", pay: 13000, visa: ["E-7", "F-2", "F-5", "H-1"], korean: "intermediate", type: "서비스", days: ["수", "목", "금", "토"], time: "15:00~23:00", posted: "4일 전" },
  { id: 7, icon: "🌾", title: "딸기 수확 작업자", company: "논산 딸기농장", area: "충남 논산", hours: "주 40시간", pay: 150000, visa: ["E-9", "H-2", "F-4"], korean: "none", type: "농업", days: ["월", "화", "수", "목", "금", "토"], time: "06:00~15:00", posted: "오늘" },
];

export default function JobsPage() {
  const t = useT();
  const [jobs, setJobs] = useState(DEMO_JOBS);
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("");
  const [korean, setKorean] = useState("");

  useEffect(() => {
    getJobs().then((data) => {
      if (data && data.length > 0) setJobs(data);
    });
  }, []);

  const filtered = jobs.filter(
    (j) =>
      (!search || (j.title && j.title.includes(search)) || (j.company && j.company.includes(search))) &&
      (!area || j.area === area) &&
      (!korean || j.korean === korean)
  );

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: T.navy, marginBottom: 4 }}>{t("jobs.title")}</h2>
      <p style={{ color: T.g500, fontSize: 13, marginBottom: 16 }}>{t("jobs.subtitle")}</p>

      {/* 알바생 챗봇 체험 배너 */}
      <Link href="/simulator?mode=worker&job=k1&autostart=1" style={{ textDecoration: "none" }}>
        <div
          style={{
            background: "#FEE500",
            color: "#1A1A2E",
            padding: "12px 16px",
            borderRadius: 12,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(254,229,0,0.4)",
          }}
        >
          <div style={{ fontSize: 24 }}>💬</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 13 }}>알바생 계약 챗봇 체험하기</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>합격 후 카톡 챗봇 → 서명 → PDF 다운로드</div>
          </div>
          <div style={{ fontSize: 18 }}>›</div>
        </div>
      </Link>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("jobs.searchPlaceholder")}
          style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `2px solid ${T.g200}`, fontSize: 14, fontFamily: "inherit", outline: "none" }}
        />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {["전체", "강남구", "이태원", "온라인", "종로구", "수원", "명동", "충남 논산"].map((a) => {
          const active = (!area && a === "전체") || area === a;
          return (
            <button
              key={a}
              onClick={() => setArea(a === "전체" ? "" : a)}
              style={{ padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${active ? T.mint + "50" : T.g200}`, background: active ? T.mintL : "#fff", color: active ? "#059669" : T.g700, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              {a}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {[["", t("jobs.koreanAll")], ["none", t("jobs.koreanNone")], ["beginner", t("jobs.koreanBeginner")], ["intermediate", t("jobs.koreanIntermediate")], ["advanced", t("jobs.koreanAdvanced")]].map(([v, l]) => (
          <button
            key={l}
            onClick={() => setKorean(v)}
            style={{ padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${korean === v ? T.coral + "40" : T.g200}`, background: korean === v ? T.coralL : "#fff", color: korean === v ? T.coral : T.g700, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            💬 {l}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: T.g500 }}>{t("jobs.noResults")}</div>
        ) : (
          filtered.map((j) => (
            <Link key={j.id} href={`/jobs/${j.id}`} style={{ textDecoration: "none" }}>
              <Card style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontSize: 32 }}>{j.icon || "💼"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: T.navy }}>{j.title}</div>
                  <div style={{ fontSize: 12, color: T.g500, marginTop: 2 }}>{j.company} · {j.area} · {j.hours}</div>
                  <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                    {(j.visa || []).slice(0, 3).map((v) => (
                      <span key={v} style={{ padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: "#EEF2FF", color: "#4F46E5" }}>{v}</span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: T.mint }}>₩{j.pay?.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: T.g500 }}>{j.posted || ""}</div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
