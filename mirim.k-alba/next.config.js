/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 헤드리스 크롬(@sparticuz/chromium)을 서버리스 함수에서 실행하기 위한 설정
  // - serverExternalPackages: 번들러가 네이티브 패키지를 건드리지 않도록 외부 처리
  // - outputFileTracingIncludes: 크롬 바이너리/라이브러리를 해당 함수 번들에 강제 포함
  //   (없으면 런타임에 libnss3.so 등 공유 라이브러리 누락으로 크롬 실행 실패)
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  outputFileTracingIncludes: {
    '/api/jobs/[id]/preview-shot': ['./node_modules/@sparticuz/chromium/**'],
  },

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
