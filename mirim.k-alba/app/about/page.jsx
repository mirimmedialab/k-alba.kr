import { redirect } from "next/navigation";

/**
 * /about → / 리다이렉트
 * (구글 검색 등으로 /about 유입 시 최적화된 기본 랜딩(/)으로 보냄)
 */
export default function AboutPage() {
  redirect("/");
}
