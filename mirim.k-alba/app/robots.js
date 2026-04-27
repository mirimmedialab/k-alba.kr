/**
 * Next.js 14 App Router robots.txt 자동 생성
 *
 * 배치: src/app/robots.ts
 *
 * /robots.txt 로 자동 노출됨
 */

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/jobs", "/signup", "/login", "/privacy", "/terms"],
        disallow: [
          "/api/",
          "/profile",          // 로그인 필요 페이지
          "/my-jobs",
          "/my-applications",
          "/my-contracts",
          "/chat",
          "/applicants",
          "/post-job",
          "/contract/",
          "/admin",            // 추후 관리자 페이지
        ],
      },
      // 구글 봇에게 더 많은 권한
      {
        userAgent: "Googlebot",
        allow: ["/", "/about", "/jobs", "/signup"],
      },
    ],
    sitemap: "https://k-alba.kr/sitemap.xml",
    host: "https://k-alba.kr",
  };
}
