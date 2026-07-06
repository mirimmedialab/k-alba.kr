export const metadata = {
  title: "K-ALBA KPI Dashboard",
  description: "K-ALBA 내부 KPI 대시보드",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          fontFamily:
            "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif",
          background: "#f4f6fa",
          color: "#1a2340",
        }}
      >
        {children}
      </body>
    </html>
  );
}
