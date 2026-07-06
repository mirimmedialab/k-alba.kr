import "./globals.css";

export const metadata = {
  title: "K-ALBA KPI Dashboard",
  description: "K-ALBA 내부 KPI 대시보드",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
