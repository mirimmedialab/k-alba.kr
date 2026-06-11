"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { getCurrentUser, supabase } from "@/lib/supabase";
import { Button, Badge, Empty, Input, PageLoading } from "@/components/ui";

/**
 * /staff/partwork 학교 담당자 포털 메인 (BI v2)
 *
 * 페르소나: 학교 담당자 — 골드 액센트 + 모노크롬 (데스크톱 신뢰 톤)
 *
 * 변경점 (BI v2):
 *   - 인라인 hex → T 토큰
 *   - STATUS_LABELS → Badge 시맨틱
 *   - 권한 없음 → Empty variant="error"
 *   - 로딩 → PageLoading
 *   - 빈 상태 → Empty
 *   - 검색 → Input variant="search"
 *   - Editorial 골드 헤더 추가
 */

const STATUS_INFO = {
  submitted:        { variant: 'info',    icon: '📥', label: '제출됨' },
  reviewing:        { variant: 'warning', icon: '👀', label: '검토 중' },
  documents_needed: { variant: 'warning', icon: '📄', label: '추가 서류' },
  signed:           { variant: 'success', icon: '✍️', label: '서명 완료' },
  approved:         { variant: 'success', icon: '✅', label: '승인' },
  rejected:         { variant: 'error',   icon: '❌', label: '반려' },
};

const FILTER_COLORS = {
  submitted:        { color: '#1E40AF', bg: '#DBEAFE' },
  reviewing:        { color: '#92400E', bg: '#FEF3C7' },
  documents_needed: { color: '#9333EA', bg: '#F3E8FF' },
  signed:           { color: '#059669', bg: '#ECFDF5' },
  approved:         { color: '#065F46', bg: '#D1FAE5' },
  rejected:         { color: '#991B1B', bg: '#FEE2E2' },
};

export default function StaffPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) {
        router.push('/login?redirect=/staff/partwork');
        return;
      }
      setUser(u);

      const { data: staffRecords, error } = await supabase
        .from('university_staff')
        .select('*, university:universities(*)')
        .eq('user_id', u.id)
        .eq('is_active', true);

      if (error || !staffRecords || staffRecords.length === 0) {
        setStaff(null);
        setLoading(false);
        return;
      }

      setStaff(staffRecords[0]);
      await loadApplications(staffRecords.map(r => r.university.name));

      const { data: statsData } = await supabase
        .from('partwork_university_stats')
        .select('*')
        .in('university_name', staffRecords.map(r => r.university.name))
        .single();
      setStats(statsData);

      setLoading(false);
    })();
  }, []);

  const loadApplications = async (universityNames) => {
    let q = supabase
      .from('partwork_applications')
      .select('*')
      .in('university_name', universityNames)
      .order('submitted_at', { ascending: false })
      .limit(100);
    const { data, error } = await q;
    if (!error && data) setApplications(data);
  };

  const filtered = useMemo(() => {
    return applications.filter(a => {
      if (filterStatus !== 'all' && a.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const hay = [a.worker_name, a.employer_name, a.position, a.university_name]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [applications, filterStatus, searchQuery]);

  const statusCounts = useMemo(() => {
    const c = { all: applications.length };
    Object.keys(STATUS_INFO).forEach(k => { c[k] = 0; });
    applications.forEach(a => { c[a.status] = (c[a.status] || 0) + 1; });
    return c;
  }, [applications]);

  if (loading) return <PageLoading message="담당자 권한 확인 중..." minHeight={400} />;

  if (!staff) {
    return (
      <div style={{ padding: 40, maxWidth: 600, margin: '0 auto' }}>
        <Empty
          variant="error"
          icon="🔒"
          title="담당자 권한이 없습니다"
          description={`국제처 담당자로 등록되지 않았습니다.\n대학 관리자에게 초대를 요청하거나, 운영팀 (support@k-alba.kr) 으로 문의해 주세요.`}
          action={
            <Button variant="primary" href="/">홈으로</Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: T.cream }}>
      {/* Editorial 헤더 + 골드 라인 */}
      <div style={{ background: T.paper, borderBottom: `1px solid ${T.border}`, padding: '14px 16px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 12 }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 11, color: T.ink3, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                STAFF PORTAL · 국제처 담당자 포털
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.ink, marginTop: 4, letterSpacing: '-0.02em' }}>
                {staff.university?.name}
                {staff.university?.certified && (
                  <span style={{ marginLeft: 8, verticalAlign: 'middle', display: 'inline-block' }}>
                    <Badge variant="success" size="sm">IEQAS 인증대학</Badge>
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: T.ink2, marginTop: 4 }}>
                {staff.staff_name} · {staff.staff_position} · {staff.department}
              </div>
            </div>
            <Button variant="secondary" size="sm" href="/staff/partwork/profile">
              ⚙️ 담당자 설정
            </Button>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          <StatCard icon="📥" label="대기" count={statusCounts.submitted || 0} color="#1E40AF" />
          <StatCard icon="👀" label="검토 중" count={statusCounts.reviewing || 0} color="#92400E" />
          <StatCard icon="📄" label="추가서류" count={statusCounts.documents_needed || 0} color="#9333EA" />
          <StatCard icon="✍️" label="서명 완료" count={statusCounts.signed || 0} color="#059669" />
          <StatCard icon="✅" label="승인" count={statusCounts.approved || 0} color="#065F46" />
          <StatCard icon="📊" label="이번 주" count={stats?.weekly_count || 0} color={T.ink2} />
        </div>

        {stats?.avg_processing_hours && (
          <div style={{
            marginTop: 10, padding: '10px 14px',
            background: T.paper, borderRadius: 8, fontSize: 12, color: T.ink2,
            border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.gold}`,
          }}>
            ⚡ 평균 처리 시간: <strong style={{ color: T.ink }}>{stats.avg_processing_hours.toFixed(1)}시간</strong>
            {' '}({stats.signed_count}건 기준)
          </div>
        )}
      </div>

      {/* 필터 + 검색 */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 16px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <FilterChip
            active={filterStatus === 'all'}
            onClick={() => setFilterStatus('all')}
            label={`전체 (${statusCounts.all})`}
          />
          {Object.entries(STATUS_INFO).map(([key, info]) => {
            const colors = FILTER_COLORS[key];
            return (
              <FilterChip
                key={key}
                active={filterStatus === key}
                onClick={() => setFilterStatus(key)}
                label={`${info.icon} ${info.label} (${statusCounts[key] || 0})`}
                color={colors.color}
                bg={colors.bg}
              />
            );
          })}
        </div>
        <Input
          variant="search"
          placeholder="학생명, 근무처, 학과로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          iconLeft={<span style={{ fontSize: 14 }}>🔍</span>}
          clearable
          onClear={() => setSearchQuery('')}
        />
      </div>

      {/* 신청 목록 */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 40px' }}>
        {filtered.length === 0 ? (
          <Empty
            variant="no-results"
            description={
              filterStatus === 'all' && !searchQuery
                ? '아직 제출된 신청서가 없습니다'
                : '조건에 맞는 신청서가 없습니다'
            }
          />
        ) : (
          <div style={{
            background: T.paper, borderRadius: 12, overflow: 'hidden',
            border: `1px solid ${T.border}`,
          }}>
            {filtered.map((a, i) => (
              <ApplicationRow key={a.id} application={a} isLast={i === filtered.length - 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, count, color }) {
  return (
    <div style={{ background: T.paper, padding: 14, borderRadius: 10, border: `1px solid ${T.border}` }}>
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color, marginTop: 4 }}>{count}</div>
      <div style={{ fontSize: 11, color: T.ink3, fontWeight: 700, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function FilterChip({ active, onClick, label, color = T.ink, bg = T.paper }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 12px',
      background: active ? color : bg,
      color: active ? T.paper : color,
      border: `1.5px solid ${color}`,
      borderRadius: 999,
      fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    }}>
      {label}
    </button>
  );
}

function ApplicationRow({ application: a, isLast }) {
  const status = STATUS_INFO[a.status] || STATUS_INFO.submitted;
  const submittedAgo = formatTimeAgo(a.submitted_at);

  return (
    <Link
      href={`/staff/partwork/${a.id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px',
        borderBottom: isLast ? 'none' : `1px solid ${T.border}`,
        textDecoration: 'none', color: T.ink,
        cursor: 'pointer', transition: '0.15s',
      }}>
      <div style={{ flexShrink: 0 }}>
        <Badge variant={status.variant} size="sm" icon={status.icon}>
          {status.label}
        </Badge>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 800, color: T.ink,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {a.worker_name || '(이름 없음)'}
          <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 500, color: T.ink2 }}>
            · {a.visa} · {courseLabel(a.course)}
          </span>
        </div>
        <div style={{
          fontSize: 11, color: T.ink2, marginTop: 2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {a.employer_name} · {a.weekly_hours}h/주 · {a.position || '직무 미기재'}
        </div>
      </div>

      <div style={{ flexShrink: 0, fontSize: 10, color: T.ink3, textAlign: 'right' }}>
        {submittedAgo}
      </div>
      <span style={{ flexShrink: 0, color: T.ink3 }}>›</span>
    </Link>
  );
}

function courseLabel(course) {
  const map = { lang: '어학연수', as: '전문학사', ug12: '학부 1~2', ug34: '학부 3~4', grad: '석박사' };
  return map[course] || course;
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}시간 전`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}일 전`;
  return new Date(timestamp).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}
