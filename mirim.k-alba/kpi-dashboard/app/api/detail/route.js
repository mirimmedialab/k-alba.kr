import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function sb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function fetchProfilesMap(client, ids) {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (uniq.length === 0) return {};
  const { data, error } = await client
    .from("profiles")
    .select("id,name,company_name,user_type")
    .in("id", uniq);
  if (error) throw new Error("profiles: " + error.message);
  const map = {};
  for (const p of data || []) map[p.id] = p;
  return map;
}

async function fetchJobsMap(client, ids) {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (uniq.length === 0) return {};
  const { data, error } = await client
    .from("jobs")
    .select("id,title,status")
    .in("id", uniq);
  if (error) throw new Error("jobs: " + error.message);
  const map = {};
  for (const j of data || []) map[j.id] = j;
  return map;
}

export async function GET(req) {
  const client = sb();
  if (!client) {
    return NextResponse.json(
      { error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }
  const type = new URL(req.url).searchParams.get("type") || "";

  try {
    /* ---------- 가입자 ---------- */
    if (type === "users") {
      const { data, error } = await client
        .from("profiles")
        .select("id,name,user_type,nationality,created_at,deactivated_at")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw new Error(error.message);
      return NextResponse.json({
        items: (data || []).map((p) => ({
          name: p.name || "(이름 없음)",
          userType: p.user_type || "",
          nationality: p.nationality || "",
          createdAt: p.created_at,
          deactivated: !!p.deactivated_at,
          deactivatedAt: p.deactivated_at,
        })),
      });
    }

    /* ---------- 직접/챗봇 등록 공고 ---------- */
    if (type === "jobs") {
      const { data, error } = await client
        .from("jobs")
        .select("id,title,created_at,source_type,status,employer_id")
        .in("source_type", ["direct", "chatbot"])
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw new Error(error.message);
      const pmap = await fetchProfilesMap(client, (data || []).map((j) => j.employer_id));
      return NextResponse.json({
        items: (data || []).map((j) => {
          const p = pmap[j.employer_id];
          return {
            id: j.id,
            title: j.title || "(제목 없음)",
            createdAt: j.created_at,
            sourceType: j.source_type,
            status: j.status,
            employer: p ? p.company_name || p.name || "(미상)" : "(미상)",
          };
        }),
      });
    }

    /* ---------- 지원 내역 ---------- */
    if (type === "applications") {
      const { data, error } = await client
        .from("applications")
        .select("id,created_at,status,job_id,applicant_id")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw new Error(error.message);
      const [pmap, jmap] = await Promise.all([
        fetchProfilesMap(client, (data || []).map((a) => a.applicant_id)),
        fetchJobsMap(client, (data || []).map((a) => a.job_id)),
      ]);
      return NextResponse.json({
        items: (data || []).map((a) => ({
          createdAt: a.created_at,
          status: a.status,
          applicant: pmap[a.applicant_id] ? pmap[a.applicant_id].name || "(미상)" : "(미상)",
          jobId: a.job_id,
          jobTitle: jmap[a.job_id] ? jmap[a.job_id].title || "(제목 없음)" : "(삭제된 공고)",
        })),
      });
    }

    /* ---------- 관심공고 ---------- */
    if (type === "favorites") {
      const { data, error } = await client
        .from("job_favorites")
        .select("id,created_at,job_id,user_id")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw new Error(error.message);
      const [pmap, jmap] = await Promise.all([
        fetchProfilesMap(client, (data || []).map((f) => f.user_id)),
        fetchJobsMap(client, (data || []).map((f) => f.job_id)),
      ]);
      return NextResponse.json({
        items: (data || []).map((f) => ({
          createdAt: f.created_at,
          user: pmap[f.user_id] ? pmap[f.user_id].name || "(미상)" : "(미상)",
          jobId: f.job_id,
          jobTitle: jmap[f.job_id] ? jmap[f.job_id].title || "(제목 없음)" : "(삭제된 공고)",
        })),
      });
    }

    return NextResponse.json({ error: "type 파라미터가 올바르지 않습니다." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String((e && e.message) || e) }, { status: 500 });
  }
}
