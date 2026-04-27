"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, supabase } from "@/lib/supabase";

/**
 * /staff/partwork — 국제처 담당자 포털 (메인 대시보드)
 *
 * 기능:
 *   - 대학별 신청 목록 (RLS로 자동 필터링)
 *   - 상태별 필터 (전체/대기/검토중/추가서류/서명완료/승인/반려)
 *   - 검색 (학생명, 학과, 근무처)
 *   - 통계 카드 (대기/검토중/완료/주간 처리량)
 *   - 행 클릭 → 상세 페이지 이동
 *
 * 권한:
 *   - university_staff 테이블에 등록된 담당자만 접근 가능
 *   - RLS가 자기 대학 신청서만 자동 필터링
 *
 * URL 파라미터:
 *   ?status=submitted  →  특정 상태만 표시
 *   ?q=홍길동          →  검색
 */
const STATUS_LABELS = {
  submitted:        { label: '제출됨',          color: '#1E40AF', bg: '#DBEAFE', icon: '📥' },
  reviewing:        { label: '검토 중',         color: '#92400E', bg: '#FEF3C7', icon: '👀' },
  documents_needed: { label: '추가 서류 요청',   color: '#9333EA', bg: '#F3E8FF', icon: '📄' },
  signed:           { label: '서명 완료',       color: '#059669', bg: '#ECFDF5', icon: '✍️' },
  approved:         { label: '승인',            color: '#065F46', bg: '#D1FAE5', icon: '✅' },
  rejected:         { label: '반려',            color: '#991B1B', bg: '#FEE2E2', icon: '❌' },
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

  // 인증 + 담당자 권한 체크
  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) {
        router.push('/login?redirect=/staff/partwork');
        return;
      }
      setUser(u);

      // 담당자 정보 조회 (자신이 어느 대학 담당자인지)
      const { data: staffRecords, error } = await supabase
        .from('university_staff')
        .select('*, university:universities(*)')
        .eq('user_id', u.id)
        .eq('is_active', true);

      if (error || !staffRecords || staffRecords.length === 0) {
        // 담당자 권한 없음
        setStaff(null);
        setLoading(false);
        return;
      }

      // 여러 대학 담당이면 첫 번째 (메뉴에서 전환 가능)
      setStaff(staffRecords[0]);

      // 신청 목록 로드
      await loadApplications(staffRecords.map(r => r.university.name));

      // 통계 로드
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

  // 필터링된 목록
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

  // 상태별 카운트
  const statusCounts = useMemo(() => {
    const c = { all: applications.length };
    Object.keys(STATUS_LABELS).forEach(k => { c[k] = 0; });
    applications.forEach(a => { c[a.status] = (c[a.status] || 0) + 1; });
    return c;
  }, [applications]);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 32 }}>⏳</div>
        <div style={{ marginTop: 12, color: '#666' }}>담당자 권한 확인 중...</div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div style={{ padding: 40, maxWidth: 600, margin: '0 auto' }}>
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA',
                      borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#991B1B', marginBottom: 8 }}>
            담당자 권한이 없습니다
          </div>
          <div style={{ fontSize: 13, color: '#7F1D1D', lineHeight: 1.7 }}>
            국제처 담당자로 등록되지 않았습니다.<br />
            대학 관리자에게 초대를 요청하거나, 운영팀 (support@k-alba.kr) 으로 문의해 주세요.
          </div>
          <Link href="/" style={{ display: 'inline-block', marginTop: 16,
                                   padding: '10px 20px', background: '#111', color: '#FFF',
                                   borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F0' }}>
      {/* 헤더 */}
      <div style={{ background: '#FFF', borderBottom: '1px solid #E4E2DE', padding: '14px 16px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#888', fontWeight: 700, letterSpacing: '0.05em' }}>
              STAFF PORTAL · 국제처 담당자 포털
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#111', marginTop: 2 }}>
              {staff.university?.name}
              {staff.university?.certified && (
                <span style={{ marginLeft: 8, fontSize: 10, padding: '2px 8px',
                               background: '#ECFDF5', color: '#059669',
                               borderRadius: 999, fontWeight: 700 }}>
                  IEQAS 인증대학
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
              {staff.staff_name} · {staff.staff_position} · {staff.department}
            </div>
          </div>
          <Link href="/staff/partwork/profile" style={{
            padding: '8px 14px', background: '#FFF', color: '#111',
            border: '1.5px solid #111', borderRadius: 6, fontSize: 12, fontWeight: 700,
            textDecoration: 'none',
          }}>
            ⚙️ 담당자 설정
          </Link>
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
          <StatCard icon="📊" label="이번 주" count={stats?.weekly_count || 0} color="#374151" />
        </div>

        {/* 평균 처리 시간 */}
        {stats?.avg_processing_hours && (
          <div style={{ marginTop: 10, padding: '10px 14px', background: '#FFF',
                        borderRadius: 8, fontSize: 12, color: '#374151',
                        border: '1px solid #E4E2DE' }}>
            ⚡ 평균 처리 시간: <strong>{stats.avg_processing_hours.toFixed(1)}시간</strong>
            ({stats.signed_count}건 기준)
          </div>
        )}
      </div>

      {/* 필터 + 검색 */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 16px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <FilterChip active={filterStatus === 'all'}
            onClick={() => setFilterStatus('all')}
            label={`전체 (${statusCounts.all})`} />
          {Object.entries(STATUS_LABELS).map(([key, info]) => (
            <FilterChip key={key} active={filterStatus === key}
              onClick={() => setFilterStatus(key)}
              label={`${info.icon} ${info.label} (${statusCounts[key] || 0})`}
              color={info.color} bg={info.bg} />
          ))}
        </div>
        <input
          type="text"
          placeholder="🔍 학생명, 근무처, 학과로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', boxSizing: 'border-box',
            border: '1px solid #E4E2DE', borderRadius: 8,
            fontSize: 13, fontFamily: 'inherit', background: '#FFF',
          }}
        />
      </div>

      {/* 신청 목록 */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 40px' }}>
        {filtered.length === 0 ? (
          <div style={{ background: '#FFF', padding: 40, textAlign: 'center',
                        borderRadius: 12, color: '#888', fontSize: 13 }}>
            {filterStatus === 'all' && !searchQuery
              ? '아직 제출된 신청서가 없습니다'
              : '조건에 맞는 신청서가 없습니다'}
          </div>
        ) : (
          <div style={{ background: '#FFF', borderRadius: 12, overflow: 'hidden',
                        border: '1px solid #E4E2DE' }}>
            {filtered.map((a, i) => (
              <ApplicationRow key={a.id} application={a}
                isLast={i === filtered.length - 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, count, color }) {
  return (
    <div style={{ background: '#FFF', padding: 14, borderRadius: 10,
                  border: '1px solid #E4E2DE' }}>
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color, marginTop: 4 }}>
        {count}
      </div>
      <div style={{ fontSize: 11, color: '#888', fontWeight: 700, marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, label, color = '#111', bg = '#FFF' }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 12px',
      background: active ? color : bg,
      color: active ? '#FFF' : color,
      border: `1.5px solid ${color}`,
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer',
      fontFamily: 'inherit',
    }}>
      {label}
    </button>
  );
}

function ApplicationRow({ application: a, isLast }) {
  const status = STATUS_LABELS[a.status] || STATUS_LABELS.submitted;
  const submittedAgo = formatTimeAgo(a.submitted_at);

  return (
    <Link
      href={`/staff/partwork/${a.id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px',
        borderBottom: isLast ? 'none' : '1px solid #F0F0EC',
        textDecoration: 'none', color: '#111',
        cursor: 'pointer', transition: '0.15s',
      }}>
      {/* 상태 배지 */}
      <span style={{
        flexShrink: 0,
        padding: '4px 10px', borderRadius: 999,
        fontSize: 10, fontWeight: 800,
        background: status.bg, color: status.color,
        whiteSpace: 'nowrap',
      }}>
        {status.icon} {status.label}
      </span>

      {/* 학생 정보 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#111',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {a.worker_name || '(이름 없음)'}
          <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 500, color: '#666' }}>
            · {a.visa} · {courseLabel(a.course)}
          </span>
        </div>
        <div style={{ fontSize: 11, color: '#666', marginTop: 2,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {a.employer_name} · {a.weekly_hours}h/주 · {a.position || '직무 미기재'}
        </div>
      </div>

      {/* 시간 */}
      <div style={{ flexShrink: 0, fontSize: 10, color: '#888', textAlign: 'right' }}>
        {submittedAgo}
      </div>

      <span style={{ flexShrink: 0, color: '#888' }}>›</span>
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
