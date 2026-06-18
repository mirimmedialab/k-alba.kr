"use client";
import { T } from "@/lib/theme";

/**
 * DesktopMobileFrame
 *
 * 데스크톱(>=1024px)에서만 메인 콘텐츠(440px 카드) + 우측 QR을 보여주고,
 * 모바일에서는 자식을 그대로 풀스크린 렌더한다.
 *
 * ⚠️ 깜빡임 방지: 예전엔 JS(useState/useEffect 또는 훅)로 데스크톱 여부를 판별해
 *   "최초 모바일 → 마운트 후 데스크톱"으로 바뀌며 화면이 깜빡였다.
 *   이제 **CSS 미디어쿼리**로만 분기하므로 브라우저가 첫 페인트에서 즉시 올바른
 *   레이아웃을 적용한다(로드/이동 모두 깜빡임 없음).
 *
 * 모바일 무변경: 모바일에서는 래퍼/카드가 `display: contents`라 박스가 사라져
 *   자식이 래퍼 없이 직접 렌더된 것과 동일하게 동작한다(기존 동작 유지).
 */
export default function DesktopMobileFrame({ children }) {
  return (
    <div className="dmf-root">
      <div className="dmf-inner">
        <main className="dmf-card">{children}</main>
        <aside className="dmf-qr">
          <div className="dmf-qr-box">
            <img src="/img/k-alba-qr.png" alt="K-ALBA QR" />
          </div>
          <div className="dmf-qr-t1">K-ALBA</div>
          <div className="dmf-qr-t2">휴대폰으로<br />접속하세요</div>
        </aside>
      </div>

      <style jsx>{`
        /* 기본(모바일/태블릿): 래퍼·카드를 display:contents 로 투명 처리 → 자식 직접 렌더 */
        .dmf-root, .dmf-inner, .dmf-card { display: contents; }
        .dmf-qr { display: none; }

        /* 데스크톱: 440px 카드 + 우측 QR (로그인/회원가입 스타일) */
        @media (min-width: 1024px) {
          .dmf-root {
            display: block;
            min-height: 100vh;
            padding: 40px 20px;
            background: ${T.cream};
          }
          .dmf-inner {
            display: flex;
            gap: 20px;
            align-items: flex-start;
            padding-left: calc(50% - 220px);
          }
          .dmf-card {
            display: block;
            width: 440px;
            background: ${T.paper};
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(10, 22, 40, 0.08), 0 1px 4px rgba(10, 22, 40, 0.04);
            overflow: visible;
          }
          .dmf-qr {
            display: block;
            text-align: center;
            padding-top: 80px;
          }
          .dmf-qr-box {
            width: 100px;
            height: 100px;
            border-radius: 8px;
            background: #fff;
            padding: 8px;
            margin-bottom: 8px;
            border: 1px solid ${T.border};
          }
          .dmf-qr-box img { width: 100%; height: 100%; display: block; }
          .dmf-qr-t1 { font-size: 11px; font-weight: 700; color: ${T.ink}; margin-bottom: 3px; }
          .dmf-qr-t2 { font-size: 10px; color: ${T.ink2}; line-height: 1.4; }
        }
      `}</style>
    </div>
  );
}
