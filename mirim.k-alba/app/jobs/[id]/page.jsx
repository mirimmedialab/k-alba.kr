"use client";
import { useParams } from "next/navigation";
import JobDetail from "@/components/JobDetail";

/**
 * /jobs/[id] 알바 상세 페이지 (얇은 래퍼)
 * 실제 렌더는 components/JobDetail 에서 담당한다.
 * 같은 컴포넌트를 /jobs 목록(마스터-디테일)의 우측 패널에서도 재사용한다.
 */
export default function JobDetailPage() {
  const params = useParams();
  return <JobDetail jobId={params.id} />;
}
