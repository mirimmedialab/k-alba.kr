import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 환경변수 없을 때 빈 클라이언트 반환 (개발 중 에러 방지)
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
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
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      email,
      name,
      user_type: userType,
      ...extra,
    });
    // profiles insert 실패도 에러로 리턴
    if (profileError) return { data, error: profileError };
  }
  return { data, error };
}

export async function signIn(email, password) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithOAuth(provider) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  return await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: typeof window !== "undefined" ? `${window.location.origin}/jobs` : undefined },
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

export async function getCurrentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
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
export async function getJobs(filters = {}) {
  if (!supabase) return [];
  let q = supabase.from("jobs").select("*, employer:profiles(name, company_name)").order("created_at", { ascending: false });
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
  const { data } = await supabase.from("jobs").select("*").eq("employer_id", employerId).order("created_at", { ascending: false });
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
