/**
 * Next.js 14 App Router sitemap 자동 생성
 *
 * 배치: src/app/sitemap.ts
 *
 * 빌드 시 정적 생성되며 /sitemap.xml 로 노출됨
 *
 * 동적 공고 URL(/jobs/[id])은 DB에서 가져와 포함시킬 수도 있지만,
 * MVP에서는 정적 페이지만 포함 (공고는 많고 자주 바뀜).
 */

export default function sitemap() {
  const baseUrl = "https://k-alba.kr";
  const lastmod = new Date();

  const staticRoutes = [
    { path: "", priority: 1.0, changeFrequency: "daily" },
    { path: "/about", priority: 0.9, changeFrequency: "weekly" },
    { path: "/jobs", priority: 0.9, changeFrequency: "daily" },
    { path: "/jobs/map", priority: 0.7, changeFrequency: "daily" },
    { path: "/signup", priority: 0.8, changeFrequency: "monthly" },
    { path: "/login", priority: 0.5, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  ];

  return staticRoutes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: lastmod,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    alternates: {
      languages: {
        ko: `${baseUrl}${route.path}`,
        en: `${baseUrl}${route.path}?lang=en`,
        zh: `${baseUrl}${route.path}?lang=zh`,
        vi: `${baseUrl}${route.path}?lang=vi`,
        ja: `${baseUrl}${route.path}?lang=ja`,
      },
    },
  }));
}
