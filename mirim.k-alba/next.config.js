/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 헤드리스 크롬(@sparticuz/chromium-min)을 서버리스 함수에서 실행하기 위한 설정.
  // chromium-min은 런타임에 원격 팩(.tar)을 받아 /tmp에 푸는 방식이라 번들 트레이싱이 필요 없음.
  // 번들러가 네이티브 패키지를 건드리지 않도록 외부 처리만 해둔다.
  serverExternalPackages: ['@sparticuz/chromium-min', 'puppeteer-core'],

  // 이미지 최적화: Capacitor(네이티브 WebView)에서도 문제 없이 동작하도록
  // 외부 이미지 도메인 허용 (Supabase Storage, Google 프로필 등)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.googleusercontent.com' }, // Google OAuth 프로필
      { protocol: 'https', hostname: 't1.kakaocdn.net' },          // Kakao OAuth 프로필
      { protocol: 'https', hostname: 'k-alba.kr' },
    ],
  },

  // 앱에서는 SSR 대신 CSR 위주로 동작 (Capacitor Server Mode로 Vercel 웹 로드)
  // 따라서 이 설정은 웹 배포용임

  // 마케팅용 짧은 주소 → utm 부착 리다이렉트 (바이오/포스터에 깔끔한 주소 사용)
  async redirects() {
    return [
      { source: "/insta", destination: "/?utm_source=instagram", permanent: false },
      { source: "/instagram", destination: "/?utm_source=instagram", permanent: false },
      { source: "/tiktok", destination: "/?utm_source=tiktok", permanent: false },
      { source: "/fb", destination: "/?utm_source=facebook", permanent: false },
      { source: "/facebook", destination: "/?utm_source=facebook", permanent: false },
      { source: "/threads", destination: "/?utm_source=threads", permanent: false },
      { source: "/qr", destination: "/?utm_source=qr_poster", permanent: false },
      { source: "/kakao", destination: "/?utm_source=kakao_channel", permanent: false },
    ];
  },

  // HTTPS 강제 (Capacitor에서 cleartext 차단)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Capacitor WebView에서 접근할 수 있도록 CORS 허용
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
