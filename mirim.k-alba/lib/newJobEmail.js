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
 * 디자인: K-ALBA 하우스 스타일(email-templates/kyocharo-*.html) — 테이블 기반,
 *         네이비(#0A1628) 헤더 + 골드(#B8944A) 구분선 + 코랄(#FF6B5A) CTA + 네이비 푸터.
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

const FONT = "'Apple SD Gothic Neo','Malgun Gothic',Arial,sans-serif";

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
  return `${amount} / ${type}`;
}

function regionLabel(job) {
  const parts = [job.sido, job.sigungu].filter(Boolean);
  return parts.length ? parts.join(" ") : (job.address || "");
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ────────── 공통 레이아웃 조각 ──────────
function emailShell(bodyRows) {
  return `<div style="margin:0;padding:0;background-color:#FAF8F3;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FAF8F3;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#FFFFFF;border:1px solid #E8E4DB;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background-color:#0A1628;padding:26px 36px;font-family:${FONT};">
            <span style="font-size:22px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;"><span style="color:#FF6B5A;">K</span>-ALBA</span>
            <span style="font-size:12px;color:#9DB0CC;">&nbsp;&nbsp;외국인 알바 매칭 플랫폼</span>
          </td>
        </tr>
        <tr><td style="height:4px;background-color:#B8944A;font-size:0;line-height:0;">&nbsp;</td></tr>
        ${bodyRows}
      </table>
    </td></tr>
  </table>
</div>`;
}

function introRow(eyebrow, headlineHtml, descHtml) {
  return `<tr>
    <td style="padding:36px 36px 8px 36px;font-family:${FONT};">
      <p style="margin:0 0 8px 0;font-size:14px;color:#B8944A;font-weight:700;">${eyebrow}</p>
      <h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.4;color:#0A1628;font-weight:800;letter-spacing:-0.6px;">${headlineHtml}</h1>
      <p style="margin:0;font-size:15px;line-height:1.75;color:#3F5273;">${descHtml}</p>
    </td>
  </tr>`;
}

function jobCardRow(job, lang, labels) {
  const title = esc(job.title || (lang === "ko" ? "새 알바 공고" : "New job"));
  const pay = esc(payLabel(job, lang));
  const region = esc(regionLabel(job));
  return `<tr>
    <td style="padding:22px 36px 4px 36px;font-family:${FONT};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E8E4DB;border-radius:12px;background-color:#FAF8F3;">
        <tr><td style="padding:20px 22px;">
          <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#B8944A;letter-spacing:0.4px;">${labels.card}</p>
          <p style="margin:0 0 14px 0;font-size:18px;font-weight:800;color:#0A1628;line-height:1.35;">${title}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td width="72" style="padding:3px 0;font-size:13px;color:#6B7A95;">${labels.pay}</td><td style="padding:3px 0;font-size:13px;font-weight:700;color:#0A1628;">${pay}</td></tr>
            <tr><td style="padding:3px 0;font-size:13px;color:#6B7A95;">${labels.region}</td><td style="padding:3px 0;font-size:13px;font-weight:700;color:#0A1628;">${region}</td></tr>
          </table>
        </td></tr>
      </table>
    </td>
  </tr>`;
}

function ctaRow(href, label, bg) {
  return `<tr>
    <td align="center" style="padding:34px 36px 26px 36px;font-family:${FONT};">
      <a href="${href}" target="_blank" style="background-color:${bg || "#FF6B5A"};color:#FFFFFF;display:inline-block;font-size:16px;font-weight:800;line-height:52px;text-align:center;text-decoration:none;width:250px;max-width:80%;border-radius:12px;">${label}</a>
    </td>
  </tr>`;
}

function noteRow(text, linkHtml) {
  return `<tr>
    <td align="center" style="padding:0 36px 30px 36px;font-family:${FONT};">
      <p style="margin:0;font-size:13px;color:#6B7A95;line-height:1.6;">${text}${linkHtml ? " " + linkHtml : ""}</p>
    </td>
  </tr>`;
}

function featureGridRow(items) {
  const cell = (it, padding) =>
    `<td width="50%" valign="top" style="padding:${padding};"><p style="margin:0 0 4px 0;font-size:14px;font-weight:800;color:#0A1628;">${esc(it.t)}</p><p style="margin:0;font-size:13px;color:#6B7A95;line-height:1.6;">${esc(it.d)}</p></td>`;
  return `<tr>
    <td style="padding:22px 36px 4px 36px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #E8E4DB;font-family:${FONT};">
        <tr><td colspan="2" style="height:24px;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>${cell(items[0], "0 8px 16px 0")}${cell(items[1], "0 0 16px 8px")}</tr>
        <tr>${cell(items[2], "0 8px 0 0")}${cell(items[3], "0 0 0 8px")}</tr>
      </table>
    </td>
  </tr>`;
}

function footerRow(finePrintHtml) {
  return `<tr>
    <td style="background-color:#0A1628;padding:26px 36px;font-family:${FONT};">
      <p style="margin:0 0 6px 0;font-size:14px;font-weight:800;letter-spacing:-0.5px;"><span style="color:#FF6B5A;">K</span><span style="color:#FFFFFF;">-ALBA</span>&nbsp;&nbsp;<a href="https://www.k-alba.kr" target="_blank" style="color:#FF6B5A;text-decoration:none;font-weight:400;font-size:12px;">www.k-alba.kr</a></p>
      <p style="margin:0 0 10px 0;font-size:11px;color:#6B7A95;line-height:1.6;">미림미디어랩(주)</p>
      <p style="margin:0;font-size:11px;color:#6B7A95;line-height:1.7;">${finePrintHtml}</p>
    </td>
  </tr>`;
}

// ────────── 알바생 메일 (광고성) ──────────
export function buildWorkerEmail(job, lang, unsubUrl, siteUrl) {
  const ko = lang === "ko";
  const jobUrl = `${siteUrl}/jobs/${job.id}`;
  const subject = ko
    ? `새 알바 공고가 올라왔어요 — ${job.title || ""}`.trim()
    : `A new job was just posted — ${job.title || ""}`.trim();

  const eyebrow = ko ? "새 공고 알림" : "NEW JOB";
  const headline = ko ? "새로운 알바 공고가 올라왔어요 🔔" : "A new job was just posted 🔔";
  const desc = ko
    ? "마음에 드는 공고가 있으면 지금 바로 지원해보세요."
    : "If it looks good, apply right now.";
  const labels = ko
    ? { card: "새로 올라온 공고", pay: "급여", region: "근무지" }
    : { card: "NEW JOB", pay: "Pay", region: "Location" };
  const cta = ko ? "공고 보고 지원하기 →" : "View & Apply →";
  const note = ko
    ? "마음에 드는 공고는 마감 전에 서둘러 지원해보세요."
    : "Don't miss out — apply before the listing closes.";
  const seeMore = `<a href="${jobUrl}" target="_blank" style="color:#FF6B5A;font-weight:700;text-decoration:none;">${ko ? "공고 전체 보기 →" : "See full listing →"}</a>`;

  const finePrint = ko
    ? `본 메일은 마케팅 정보 수신에 동의하신 회원님께 발송되었습니다. <a href="${unsubUrl}" target="_blank" style="color:#FF6B5A;text-decoration:none;font-weight:700;">수신거부</a>`
    : `You are receiving this because you agreed to receive marketing information from K-ALBA. <a href="${unsubUrl}" target="_blank" style="color:#FF6B5A;text-decoration:none;font-weight:700;">Unsubscribe</a>`;

  const rows =
    introRow(esc(eyebrow), headline, desc) +
    jobCardRow(job, lang, labels) +
    ctaRow(jobUrl, esc(cta), "#FF6B5A") +
    noteRow(esc(note), seeMore) +
    footerRow(finePrint);

  return { subject, html: emailShell(rows) };
}

// ────────── 사장님 확인 메일 (트랜잭셔널) ──────────
export function buildEmployerEmail(job, employer, siteUrl) {
  const jobUrl = `${siteUrl}/jobs/${job.id}`;
  const manageUrl = `${siteUrl}/my/jobs`;
  const who = esc(employer?.company_name || employer?.name || "사장님");

  const subject = `[K-ALBA] 등록하신 공고를 구직자분들께 전달해드렸어요`;
  const eyebrow = "공고 등록 완료";
  const headline = `${who}님, 공고가 등록됐어요 📢`;
  const desc =
    '방금 등록하신 공고를 <strong style="color:#0A1628;">K-알바 구직자분들께 이메일로 전달</strong>해드렸어요.<br>좋은 지원자와 빠르게 연결되시길 바랄게요!';
  const labels = { card: "등록된 공고", pay: "급여", region: "근무지" };
  const cta = "내 공고 보기 →";
  const note = "지원자가 카카오톡으로 사장님께 직접 연락드려요.";
  const manageLink = `<a href="${manageUrl}" target="_blank" style="color:#FF6B5A;font-weight:700;text-decoration:none;">공고 관리하기 →</a>`;
  const finePrint = "본 메일은 회원님의 공고 등록에 따른 서비스 안내 메일입니다.";

  const rows =
    introRow(esc(eyebrow), headline, desc) +
    jobCardRow(job, "ko", labels) +
    ctaRow(jobUrl, esc(cta), "#FF6B5A") +
    noteRow(esc(note), manageLink) +
    footerRow(finePrint);

  return { subject, html: emailShell(rows) };
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
