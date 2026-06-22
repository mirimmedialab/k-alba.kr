import { createClient } from "@supabase/supabase-js";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

/**
 * GET /api/jobs/[id]/preview-shot
 *
 * 공고 상세 화면(/jobs/[id])을 헤드리스 크롬으로 캡처해서 PNG로 돌려준다.
 * 교차로 사장님 초대 메일에 "실제로 이렇게 올라갑니다" 미리보기 이미지로 사용.
 *
 * Query:
 *   ?mode=desktop | mobile   (기본 desktop)  ← 둘 다 떠보고 메일로 비교용
 *   ?upload=1                Supabase Storage(job-previews 버킷)에 1회 저장 후 공개 URL(JSON) 반환 (운영용)
 *                            생략 시 PNG를 그대로 응답 (테스트용 — <img src>가 이 엔드포인트를 직접 가리킬 수 있음)
 *
 * 운영 메모:
 *   - 테스트(PNG 직접 반환)는 메일을 열 때마다 캡처가 돌아 비싸다.
 *   - 운영에선 공고 import 시점에 ?upload=1 로 "한 번만" 떠서 Storage URL을 메일에 박는다.
 *
 * 환경변수:
 *   NEXT_PUBLIC_SITE_URL          (예: https://www.k-alba.kr)
 *   SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL,  SUPABASE_SERVICE_ROLE_KEY   (upload 시)
 *   LOCAL_CHROME_PATH             (로컬 개발 시 설치된 Chrome 경로, 선택)
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 캡처는 콜드스타트 포함 수십 초 걸릴 수 있음

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.k-alba.kr";

const VIEWPORTS = {
  desktop: { width: 1280, height: 900, deviceScaleFactor: 2, isMobile: false },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

async function launchBrowser() {
  // 로컬 개발: 시스템 Chrome 사용 (sparticuz는 서버리스 전용, 로컬에선 executablePath가 없음)
  const local = process.env.LOCAL_CHROME_PATH;
  if (local) {
    return puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: local,
      headless: true,
      defaultViewport: null,
    });
  }
  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    defaultViewport: null,
  });
}

export async function GET(request, { params }) {
  const { id } = await params; // Next.js 16: params는 비동기
  const sp = new URL(request.url).searchParams;
  const mode = sp.get("mode") === "mobile" ? "mobile" : "desktop";
  const doUpload = sp.get("upload") === "1";
  const vp = VIEWPORTS[mode];

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setViewport(vp);
    if (mode === "mobile") {
      await page.setUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      );
    }

    await page.goto(`${SITE}/jobs/${id}`, { waitUntil: "networkidle2", timeout: 45000 });

    // 클라이언트 렌더 페이지 — "근무 조건"이 보일 때까지 대기
    await page
      .waitForFunction(() => /근무\s*조건/.test(document.body.innerText), { timeout: 20000 })
      .catch(() => {});

    // 하단 고정 지원바·토스트 등 position:fixed 오버레이 숨김 (캡처 깔끔하게)
    await page.addStyleTag({ content: `[style*="position:fixed"]{display:none !important}` });

    // 지도 타일·이미지 로드 여유
    await new Promise((r) => setTimeout(r, 700));

    const png = await page.screenshot({ type: "png", fullPage: true });

    await browser.close();
    browser = null;

    // ── 테스트: PNG 직접 반환 ──
    if (!doUpload) {
      return new Response(png, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=300", // 5분 캐시 (테스트용)
        },
      });
    }

    // ── 운영: Storage에 1회 저장 후 공개 URL 반환 ──
    const supaUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supaUrl || !serviceKey) {
      return Response.json({ ok: false, error: "supabase_env_missing" }, { status: 500 });
    }
    const supabase = createClient(supaUrl, serviceKey);
    const path = `jobs/${id}-${mode}.png`;
    const { error: upErr } = await supabase.storage
      .from("job-previews")
      .upload(path, png, { contentType: "image/png", upsert: true });
    if (upErr) {
      return Response.json({ ok: false, error: upErr.message }, { status: 500 });
    }
    const { data } = supabase.storage.from("job-previews").getPublicUrl(path);
    return Response.json({ ok: true, mode, path, url: data.publicUrl });
  } catch (e) {
    if (browser) await browser.close().catch(() => {});
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
