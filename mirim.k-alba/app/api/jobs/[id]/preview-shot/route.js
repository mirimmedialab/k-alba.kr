import { createClient } from "@supabase/supabase-js";
import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";

/**
 * GET /api/jobs/[id]/preview-shot
 *
 * 공고 상세 화면(/jobs/[id])을 헤드리스 크롬으로 캡처해서 PNG로 돌려준다.
 * 교차로 사장님 초대 메일에 "실제로 이렇게 올라갑니다" 미리보기 이미지로 사용.
 *
 * Query:
 *   ?mode=desktop | mobile   (기본 desktop)
 *   ?upload=1                Supabase Storage(job-previews)에 1회 저장 후 공개 URL(JSON) 반환 (운영용)
 *                            생략 시 PNG를 그대로 응답 (테스트용)
 *
 * 크롬 바이너리: @sparticuz/chromium-min + 원격 팩(.tar).
 *   서버리스 번들에 50MB 바이너리를 안 넣고, 콜드스타트 때 팩을 받아 /tmp에 풀어 실행.
 *   (Next 파일 트레이싱이 라이브러리를 함수에 못 넣는 문제 우회 — libnss3.so 누락 해결)
 *   더 빠르게 하려면 CHROMIUM_PACK_URL 로 Supabase 등 가까운 곳의 팩을 가리킨다.
 *
 * 환경변수: NEXT_PUBLIC_SITE_URL, CHROMIUM_PACK_URL(선택),
 *   SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY(upload 시), LOCAL_CHROME_PATH(로컬)
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.k-alba.kr";

// @sparticuz/chromium 버전과 동일 태그의 팩이어야 함 (현재 131.0.1)
const CHROMIUM_PACK =
  process.env.CHROMIUM_PACK_URL ||
  "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar";

const VIEWPORTS = {
  desktop: { width: 1280, height: 900, deviceScaleFactor: 2, isMobile: false },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

async function launchBrowser() {
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
    args: [...chromium.args, "--lang=ko-KR"],
    executablePath: await chromium.executablePath(CHROMIUM_PACK),
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
    await page.setExtraHTTPHeaders({ "Accept-Language": "ko-KR,ko;q=0.9" });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "language", { get: () => "ko-KR" });
      Object.defineProperty(navigator, "languages", { get: () => ["ko-KR", "ko"] });
    });
    await page.setViewport(vp);
    if (mode === "mobile") {
      await page.setUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      );
    }

    await page.goto(`${SITE}/jobs/${id}`, { waitUntil: "networkidle2", timeout: 45000 });

    await page
      .waitForFunction(() => /근무\s*조건/.test(document.body.innerText), { timeout: 20000 })
      .catch(() => {});

    // 카카오 지도 타일이 실제로 로드될 때까지 대기 (안 기다리면 지도 자리가 빈칸으로 찍힘)
    await page
      .waitForFunction(
        () => [...document.querySelectorAll("img")].some(
          (i) => /daumcdn|kakao|map/i.test(i.src) && i.complete && i.naturalWidth > 0
        ),
        { timeout: 12000 }
      )
      .catch(() => {});

    await page.addStyleTag({ content: `[style*="position:fixed"]{display:none !important}` });

    await new Promise((r) => setTimeout(r, 2000)); // 지도 타일 추가 로드 여유

    const png = await page.screenshot({ type: "png", fullPage: true });

    await browser.close();
    browser = null;

    if (!doUpload) {
      return new Response(png, {
        status: 200,
        headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" },
      });
    }

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
