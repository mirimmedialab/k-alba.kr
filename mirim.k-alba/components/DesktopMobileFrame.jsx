"use client";

/**
 * DesktopMobileFrame
 *
 * 데스크톱(>=1024px)에서만 메인 콘텐츠(440px 카드) + 우측 QR을 보여주고,
 * 모바일에서는 자식을 그대로 풀스크린 렌더한다.
 *
 * 스타일은 app/globals.css 의 .dmf-* 규칙(전역 로드)으로 정의한다.
 *   - 예전엔 이 컴포넌트 안의 styled-jsx(<style jsx>)로 스타일을 넣었는데,
 *     페이지 이동으로 이 컴포넌트가 새로 마운트될 때 스타일 주입이 렌더보다 늦어
 *     "풀폭으로 잠깐 늘어졌다가 440px 카드로 스냅"되는 깜빡임이 있었다.
 *   - 전역 CSS로 옮기면 스타일이 항상 로드돼 있어 첫 페인트부터 올바른 레이아웃이 적용된다.
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
    </div>
  );
}
