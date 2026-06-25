import { createBrowserClient } from "@supabase/ssr";

// 브라우저/클라이언트 컴포넌트용 Supabase 클라이언트
// SSR 쿠키 기반 세션 관리
export const supabase = typeof window !== "undefined"
  ? createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  : null;

// ────────────────────────────────
// Auth
// ────────────────────────────────
export async function signUp(email, password, userType, name, extra = {}) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { user_type: userType, name, ...extra } },
  });
  // ✅ 널 안전성: data가 null일 수 있음
  if (data?.user && !error) {
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      email,
      name,
      user_type: userType,
      ...extra,
    }, { onConflict: "id" });
    // profiles insert 실패도 에러로 리턴
    if (profileError) return { data, error: profileError };
  }
  return { data, error };
}

export async function signIn(email, password) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithOAuth(provider, options = {}) {
  if (!supabase) return { error: { message: "Supabase not configured" } };

  // OAuth 콜백을 /auth/callback으로 받아서 거기서 user_type 처리 후 분기
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback`,
      // 카카오는 일부 추가 정보를 위해 scopes 권장 (선택)
      ...(options.scopes ? { scopes: options.scopes } : {}),
    },
  });
}

export async function signOut() {
  if (!supabase) return;
  return await supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

export async function isAccountDeactivated(userId) {
  if (!supabase || !userId) return false;
  try {
    const { data } = await supabase.from("profiles").select("deactivated_at").eq("id", userId).maybeSingle();
    return !!data?.deactivated_at;
  } catch (_) {
    return false;
  }
}

export async function getCurrentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  const user = data?.user || null;
  if (!user) return null;
  // 탈퇴(비활성화)된 계정이면 즉시 로그아웃 처리하여 접근 차단
  if (await isAccountDeactivated(user.id)) {
    try { await supabase.auth.signOut(); } catch (_) {}
    return null;
  }
  return user;
}

// ────────────────────────────────
// Profile
// ────────────────────────────────
export async function getProfile(userId) {
  if (!supabase) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return data;
}

export async function updateProfile(userId, updates) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  return await supabase.from("profiles").update(updates).eq("id", userId);
}

// ────────────────────────────────
// Jobs
// ────────────────────────────────
// 목록용 컬럼 (무거운 raw/geog 제외)
const JOB_LIST_COLUMNS =
  "id, employer_id, employer_external_name, title, job_type, work_type, pay_type, pay_amount, " +
  "address, address_detail, address_road, address_jibun, sido, sigungu, dong, work_hours, work_days, " +
  "korean_level, visa_types, headcount, benefits, description, status, created_at, updated_at, " +
  "latitude, longitude, transit_info, provides_housing, provides_shuttle, nearest_station, " +
  "walk_to_station_min, source_type, source_id, apply_url, expires_at, fetched_at, " +
  "employer:profiles(name, company_name)";

export async function getJobs(filters = {}) {
  if (!supabase) return [];
  let q = supabase
    .from("jobs")
    .select(JOB_LIST_COLUMNS)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (filters.jobType) q = q.eq("job_type", filters.jobType);
  if (filters.region) q = q.ilike("address", `%${filters.region}%`);
  if (filters.korean) q = q.eq("korean_level", filters.korean);
  const { data } = await q;
  return data || [];
}

export async function getJob(id) {
  if (!supabase) return null;
  const { data } = await supabase.from("jobs").select("*, employer:profiles(*)").eq("id", id).single();
  return data;
}

export async function createJob(jobData) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  return await supabase.from("jobs").insert(jobData).select().single();
}

export async function getMyJobs(employerId) {
  if (!supabase) return [];
  const { data } = await supabase.from("jobs").select("*").eq("employer_id", employerId).neq("status", "deleted").order("created_at", { ascending: false });
  return data || [];
}

export async function updateJob(id, updates) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  return await supabase.from("jobs").update(updates).eq("id", id).select().single();
}

export async function deleteJob(id) {
  // 소프트 삭제: status를 'deleted'로 변경 (지원/계약 데이터 보존, 복구 가능)
  if (!supabase) return { error: { message: "Supabase not configured" } };
  return await supabase.from("jobs").update({ status: "deleted" }).eq("id", id);
}

// ────────────────────────────────
// Favorites (관심공고 / 찜)
// ────────────────────────────────
// 특정 공고가 찜되어 있는지 확인
export async function isJobFavorited(userId, jobId) {
  if (!supabase || !userId || !jobId) return false;
  const { data } = await supabase
    .from("job_favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("job_id", jobId)
    .maybeSingle();
  return !!data;
}

// 찜 추가 (중복은 무시)
export async function addFavorite(userId, jobId) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  return await supabase
    .from("job_favorites")
    .upsert({ user_id: userId, job_id: jobId }, { onConflict: "user_id,job_id" });
}

// 찜 해제
export async function removeFavorite(userId, jobId) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  return await supabase
    .from("job_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("job_id", jobId);
}

// 내 관심공고 목록 (공고 정보 조인)
export async function getMyFavorites(userId) {
  if (!supabase) return [];
  const { data } = await supabase
    .from("job_favorites")
    .select("id, created_at, job_id, job:jobs(*, employer:profiles(name, company_name))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data || [];
}

// ────────────────────────────────
// Applications
// ────────────────────────────────
export async function applyJob(jobId, applicantId, message) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  return await supabase.from("applications").insert({
    job_id: jobId,
    applicant_id: applicantId,
    message,
    status: "pending",
  });
}

export async function getMyApplications(userId) {
  if (!supabase) return [];
  const { data } = await supabase
    .from("applications")
    .select("*, job:jobs(*)")
    .eq("applicant_id", userId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getJobApplicants(jobId) {
  if (!supabase) return [];
  const { data } = await supabase
    .from("applications")
    .select("*, applicant:profiles(*)")
    .eq("job_id", jobId);
  return data || [];
}

export async function updateApplicationStatus(id, status) {
  if (!supabase) return;
  return await supabase.from("applications").update({ status }).eq("id", id);
}

// ────────────────────────────────
// Messages
// ────────────────────────────────
export async function getMessages(senderId, receiverId) {
  if (!supabase) return [];
  const { data } = await supabase
    .from("messages")
    .select("*")
    .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
    .order("created_at", { ascending: true });
  return data || [];
}

export async function sendMessage(senderId, receiverId, text) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  return await supabase.from("messages").insert({
    sender_id: senderId,
    receiver_id: receiverId,
    text,
  });
}

export function subscribeMessages(userId, callback) {
  if (!supabase) return null;
  return supabase
    .channel(`messages-${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${userId}` },
      callback
    )
    .subscribe();
}

// ────────────────────────────────
// Work History (K-ALBA 인증 경력)
// ────────────────────────────────
export async function getWorkHistory(userId) {
  if (!supabase) return [];
  const { data } = await supabase
    .from("work_history")
    .select("*, job:jobs(*), employer:profiles(name, company_name)")
    .eq("worker_id", userId)
    .order("end_date", { ascending: false });
  return data || [];
}

// ────────────────────────────────
// Contracts (근로계약서)
// ────────────────────────────────
export async function createContract(contractData) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  return await supabase.from("contracts").insert(contractData).select().single();
}

export async function getContract(id) {
  if (!supabase) return null;
  const { data } = await supabase
    .from("contracts")
    .select("*, job:jobs(*), employer:profiles!contracts_employer_id_fkey(*), worker:profiles!contracts_worker_id_fkey(*)")
    .eq("id", id)
    .single();
  return data;
}

export async function updateContract(id, updates) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  return await supabase.from("contracts").update(updates).eq("id", id);
}

export async function getMyContracts(userId, role = "worker") {
  if (!supabase) return [];
  const column = role === "employer" ? "employer_id" : "worker_id";
  const { data } = await supabase
    .from("contracts")
    .select("*, job:jobs(title, job_type), employer:profiles!contracts_employer_id_fkey(name, company_name), worker:profiles!contracts_worker_id_fkey(name)")
    .eq(column, userId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function signContract(id, role, signatureData = null) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  const now = new Date().toISOString();
  const updates = role === "worker"
    ? { worker_signed: true, worker_sign_date: now, worker_signature: signatureData }
    : { employer_signed: true, employer_sign_date: now, employer_signature: signatureData };

  // 양측 모두 서명 완료 시 status를 completed로
  const { data: current } = await supabase.from("contracts").select("worker_signed, employer_signed").eq("id", id).single();
  if (current) {
    const willWorkerSign = role === "worker" || current.worker_signed;
    const willEmployerSign = role === "employer" || current.employer_signed;
    if (willWorkerSign && willEmployerSign) updates.status = "completed";
    else if (willWorkerSign) updates.status = "employer_signing";
    else if (willEmployerSign) updates.status = "worker_signing";
  }

  return await supabase.from("contracts").update(updates).eq("id", id);
}
