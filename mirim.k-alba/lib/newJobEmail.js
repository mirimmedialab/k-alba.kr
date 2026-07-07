import crypto from "node:crypto";

/**
 * 신규 공고 알림 메일 — 발송 코어 (서버 전용)
 *
 * 공고가 등록되면:
 *   1) 동의한 알바생에게 "새 공고가 올라왔어요" 광고성 메일 (ko/en)
 *      · 제목 "(광고)" 접두어, 수신거부 링크, 발송자 정보, 야간(23~08 KST) 발송 차단
 *      · 대상: profiles.user_type='worker' AND deactivated_at IS NULL
 *              AND agreed_marketing_at IS NOT NULL  (동의자 = 동의 도입 이후 가입자)
 *   2) 사장님에게 "공유 완료" 서비스 메일 (트랜잭셔널 — (광고)·동의·야간차단 불필요)
 *
 * 중복 방지: jobs.email_notified_at 을 발송 직전 claim(원자적 update)해서 공고당 1회만.
 * 야간 등록분: claim 안 하고 deferred 반환 → /api/cron/flush-new-job-emails 가 아침에 재시도.
 *
 * 환경변수(호출부에서 주입):
 *   RESEND_API_KEY, NEXT_PUBLIC_SITE_URL, EMAIL_UNSUB_SECRET(없으면 SERVICE_ROLE_KEY)
 */

const RESEND_API = "https://api.resend.com/emails";
const FROM = "K-ALBA <no-reply@k-alba.kr>";
const REPLY_TO = "k-alba@naver.com";

const NAVY = "#3F5273";
const CORAL = "#C2512A";
const MUTED = "#6B7A95";
const LINE = "#D9D4C7";

// ────────── 야간 발송 차단 (KST 08:00~23:00) ──────────
export function isBusinessHoursKST(now = new Date()) {
  const kstHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      hour12: false,
    }).format(now)
  ) % 24;
  return kstHour >= 8 && kstHour < 23;
}

// ────────── 수신거부 토큰 (HMAC, DB 컬럼 없이 검증) ──────────
export function unsubToken(profileId, secret) {
  const sig = crypto
    .createHmac("sha256", String(secret || ""))
    .update(String(profileId))
    .digest("hex")
    .slice(0, 32);
  return `${profileId}.${sig}`;
}

export function verifyUnsubToken(token, secret) {
  const parts = String(token || "").split(".");
  if (parts.length !== 2) return null;
  const [id, sig] = parts;
  const expected = crypto
    .createHmac("sha256", String(secret || ""))
    .update(id)
    .digest("hex")
    .slice(0, 32);
  try {
    if (
      sig.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return id;
    }
  } catch {
    return null;
  }
  return null;
}

// ────────── 표시용 헬퍼 ──────────
function payLabel(job, lang) {
  const amount = Number(job.pay_amount || 0).toLocaleString("ko-KR");
  const type = job.pay_type || (lang === "ko" ? "시급" : "Pay");
  return `${type} ₩${amount}`;
}

function regionLabel(job) {
  return job.sigungu || job.sido || job.address || "";
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ────────── 알바생 메일 (광고성) ──────────
export function buildWorkerEmail(job, lang, unsubUrl, siteUrl) {
  const ko = lang === "ko";
  const jobUrl = `${siteUrl}/jobs/${job.id}`;
  const title = esc(job.title || (ko ? "새 알바 공고" : "New job"));
  const region = esc(regionLabel(job));
  const pay = esc(payLabel(job, lang));

  const subject = ko
    ? `새 알바 공고가 올라왔어요 — ${job.title || ""}`.trim()
    : `A new job was just posted — ${job.title || ""}`.trim();

  const t = ko
    ? {
        pre: "K-ALBA에 딱 맞을지도 모를 새 공고가 등록됐어요.",
        cta: "공고 보고 지원하기",
        hi: "안녕하세요,",
        lead: "새로운 아르바이트 공고가 K-ALBA에 올라왔어요. 마음에 들면 바로 지원해보세요!",
        payL: "급여",
        regionL: "근무지",
        foot: "본 메일은 K-ALBA 마케팅 정보 수신에 동의하신 회원님께 발송되었습니다.",
        unsub: "수신 거부",
      }
    : {
        pre: "A new job that might fit you was just posted on K-ALBA.",
        cta: "View & Apply",
        hi: "Hello,",
        lead: "A new part-time job was just posted on K-ALBA. If it looks good, apply right away!",
        payL: "Pay",
        regionL: "Location",
        foot: "You are receiving this because you agreed to receive marketing information from K-ALBA.",
        unsub: "Unsubscribe",
      };

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F1EA;font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:24px;">
    <div style="font-size:20px;font-weight:800;color:${NAVY};letter-spacing:-0.5px;margin-bottom:4px;">K-ALBA</div>
    <div style="font-size:12px;color:${MUTED};margin-bottom:20px;">${esc(t.pre)}</div>

    <div style="background:#ffffff;border:1px solid ${LINE};border-radius:16px;padding:24px;">
      <div style="font-size:14px;color:${NAVY};margin-bottom:12px;">${esc(t.hi)}</div>
      <div style="font-size:14px;color:#333;line-height:1.6;margin-bottom:20px;">${esc(t.lead)}</div>

      <div style="font-size:18px;font-weight:700;color:${NAVY};line-height:1.4;margin-bottom:14px;">${title}</div>
      <table style="width:100%;font-size:13px;color:#444;border-collapse:collapse;">
        <tr><td style="padding:4px 0;color:${MUTED};width:64px;">${esc(t.payL)}</td><td style="padding:4px 0;font-weight:600;">${pay}</td></tr>
        <tr><td style="padding:4px 0;color:${MUTED};">${esc(t.regionL)}</td><td style="padding:4px 0;font-weight:600;">${region}</td></tr>
      </table>

      <a href="${jobUrl}" style="display:block;margin-top:22px;background:${CORAL};color:#ffffff;text-decoration:none;text-align:center;font-weight:700;font-size:15px;padding:14px 0;border-radius:12px;">${esc(t.cta)} →</a>
    </div>

    <div style="margin-top:24px;padding-top:16px;border-top:1px solid ${LINE};font-size:11px;color:${MUTED};line-height:1.7;">
      <strong style="color:${NAVY};">미림미디어랩 주식회사</strong> · 대표 남기환<br>
      서울특별시 강서구 양천로 583 우림블루나인비즈니스센터 A동 406호<br>
      k-alba@naver.com · https://k-alba.kr · 직업정보제공사업 신고번호 J1204020260002<br>
      <span style="display:block;margin-top:10px;">${esc(t.foot)}</span>
      <a href="${unsubUrl}" style="color:${CORAL};font-weight:600;">${esc(t.unsub)}</a>
    </div>
  </div>
</body></html>`;

  return { subject, html };
}

// ────────── 사장님 확인 메일 (트랜잭셔널) ──────────
export function buildEmployerEmail(job, employer, siteUrl) {
  const jobUrl = `${siteUrl}/jobs/${job.id}`;
  const manageUrl = `${siteUrl}/my/jobs`;
  const who =
    employer?.company_name || employer?.name || "사장님";
  const title = esc(job.title || "공고");

  const subject = `[K-ALBA] 등록하신 공고를 구직자분들께 전달해드렸어요`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F1EA;font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:24px;">
    <div style="font-size:20px;font-weight:800;color:${NAVY};letter-spacing:-0.5px;margin-bottom:20px;">K-ALBA</div>

    <div style="background:#ffffff;border:1px solid ${LINE};border-radius:16px;padding:24px;">
      <div style="font-size:15px;color:${NAVY};font-weight:700;margin-bottom:14px;">${esc(who)}님, 공고 등록이 완료됐어요 🎉</div>
      <div style="font-size:14px;color:#333;line-height:1.7;">
        방금 등록하신 <strong style="color:${NAVY};">'${title}'</strong> 공고를<br>
        K-ALBA 구직자분들께 이메일로 전달해드렸어요.<br>
        좋은 지원자와 빠르게 연결되시길 바랄게요!
      </div>

      <a href="${jobUrl}" style="display:block;margin-top:22px;background:${NAVY};color:#ffffff;text-decoration:none;text-align:center;font-weight:700;font-size:15px;padding:14px 0;border-radius:12px;">내 공고 보기 →</a>
      <a href="${manageUrl}" style="display:block;margin-top:10px;text-align:center;font-size:13px;color:${MUTED};text-decoration:none;">공고 관리하기</a>
    </div>

    <div style="margin-top:24px;padding-top:16px;border-top:1px solid ${LINE};font-size:11px;color:${MUTED};line-height:1.7;">
      본 메일은 회원님의 공고 등록에 따른 서비스 안내 메일입니다.<br>
      미림미디어랩 주식회사 · k-alba@naver.com · https://k-alba.kr
    </div>
  </div>
</body></html>`;

  return { subject, html };
}

// ────────── Resend 발송 ──────────
async function sendViaResend(payload, key) {
  if (!key) return { ok: false, error: "RESEND_API_KEY not configured" };
  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${errText}` };
    }
    const data = await res.json();
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ────────── 메인: 공고 1건에 대한 알림 발송 ──────────
export async function sendNewJobEmailsForJob(supabase, jobId, opts = {}) {
  const resendKey = opts.resendKey || process.env.RESEND_API_KEY;
  const siteUrl = (opts.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://k-alba.kr").replace(/\/$/, "");
  const secret =
    opts.secret ||
    process.env.EMAIL_UNSUB_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";
  const ignoreBusinessHours = opts.ignoreBusinessHours === true;

  // 1. 공고 조회
  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select(
      "id, title, job_type, pay_type, pay_amount, sigungu, sido, address, employer_id, employer_external_name, status, email_notified_at"
    )
    .eq("id", jobId)
    .single();

  if (jobErr || !job) return { ok: false, error: "job not found" };
  if (job.email_notified_at) return { ok: true, skipped: "already_notified" };
  if (job.status && job.status !== "active") return { ok: true, skipped: "not_active" };

  // 2. 야간이면 지금은 발송하지 않고 크론에 맡김
  if (!ignoreBusinessHours && !isBusinessHoursKST()) {
    return { ok: true, deferred: true, reason: "night" };
  }

  // 3. claim (원자적) — 동시/재요청 이중발송 방지
  const { data: claimed } = await supabase
    .from("jobs")
    .update({ email_notified_at: new Date().toISOString() })
    .eq("id", jobId)
    .is("email_notified_at", null)
    .select("id");
  if (!claimed || claimed.length === 0) {
    return { ok: true, skipped: "claimed_by_other" };
  }

  // 4. 사장님(고용주) 프로필
  let employer = null;
  if (job.employer_id) {
    const { data: emp } = await supabase
      .from("profiles")
      .select("id, name, company_name, email")
      .eq("id", job.employer_id)
      .single();
    employer = emp || null;
  }

  // 5. 알바생 수신자 (동의자만)
  const { data: workers, error: wErr } = await supabase
    .from("profiles")
    .select("id, email, preferred_lang")
    .eq("user_type", "worker")
    .is("deactivated_at", null)
    .not("agreed_marketing_at", "is", null);

  let workerSent = 0;
  let workerFailed = 0;

  if (!wErr && Array.isArray(workers)) {
    for (const w of workers) {
      if (!w.email || !w.email.includes("@")) continue;
      const lang = w.preferred_lang === "ko" ? "ko" : "en";
      const unsubUrl = `${siteUrl}/api/email/worker-unsubscribe?token=${unsubToken(w.id, secret)}`;
      const { subject, html } = buildWorkerEmail(job, lang, unsubUrl, siteUrl);
      const adSubject = subject.startsWith("(광고)") ? subject : `(광고) ${subject}`;
      const r = await sendViaResend(
        { from: FROM, to: w.email, reply_to: REPLY_TO, subject: adSubject, html },
        resendKey
      );
      if (r.ok) workerSent++;
      else workerFailed++;
      await new Promise((res) => setTimeout(res, 100)); // rate limit
    }
  }

  // 6. 사장님 확인 메일 (트랜잭셔널)
  let employerSent = false;
  if (employer?.email && employer.email.includes("@")) {
    const { subject, html } = buildEmployerEmail(job, employer, siteUrl);
    const r = await sendViaResend(
      { from: FROM, to: employer.email, reply_to: REPLY_TO, subject, html },
      resendKey
    );
    employerSent = r.ok;
  }

  return {
    ok: true,
    job_id: jobId,
    worker_sent: workerSent,
    worker_failed: workerFailed,
    employer_sent: employerSent,
  };
}
