import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase 클라이언트 (서버 컴포넌트/Route Handler용)
 *
 * - 쿠키 기반 세션 관리
 * - 서버 컴포넌트, API Route에서 사용
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component에서는 setAll이 실패할 수 있음 (read-only)
          }
        },
      },
    }
  );
}
