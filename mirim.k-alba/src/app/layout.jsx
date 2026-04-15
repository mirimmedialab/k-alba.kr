import "./globals.css";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { I18nProvider } from "@/lib/i18n";

export const metadata = {
  title: "K-ALBA | 한국의 외국인을 위한 알바 플랫폼",
  description: "유학생, 결혼이민자, 취업비자, 워킹홀리데이까지 - 비자 유형에 맞는 합법적인 일자리를 7개 언어로 찾아보세요.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <I18nProvider>
          <NavBar />
          <main className="page-enter">{children}</main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
