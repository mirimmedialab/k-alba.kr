#!/usr/bin/env node
/**
 * K-ALBA 공고 좌표 백필 스크립트
 *
 * 기존 jobs 테이블에 latitude/longitude가 없는 레코드를 찾아
 * Kakao Local API로 지오코딩하여 채워 넣음.
 *
 * 사용법:
 *   node scripts/backfill-geocodes.js
 *   node scripts/backfill-geocodes.js --dry-run   # 실제 업데이트 없이 미리보기
 *   node scripts/backfill-geocodes.js --limit=50  # 최대 50건만
 *
 * 환경변수 필요 (.env 또는 export):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (anon key 아님 — 업데이트 권한 필요)
 *   KAKAO_REST_API_KEY
 *
 * 실행 전:
 *   1. migration-geolocation.sql 실행되어 있어야 함
 *   2. DB 백업 권장
 *
 * Rate limit:
 *   Kakao Local API는 월 30만건 무료. 200ms 간격으로 호출 (분당 300 정도).
 */

const { createClient } = require('@supabase/supabase-js');

// ────────── 환경변수 로드 ──────────
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !KAKAO_KEY) {
  console.error('❌ 환경변수가 설정되지 않았습니다:');
  console.error('   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, KAKAO_REST_API_KEY');
  console.error('   .env.local 파일에 추가하거나 export 해주세요.');
  process.exit(1);
}

// CLI 인자 파싱
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = (() => {
  const limitArg = args.find(a => a.startsWith('--limit='));
  if (!limitArg) return 100;
  const n = parseInt(limitArg.split('=')[1], 10);
  return isNaN(n) ? 100 : n;
})();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ────────── 헬퍼 ──────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocode(address) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/address.json');
  url.searchParams.set('query', address);
  url.searchParams.set('size', '1');

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
    });
    if (!res.ok) {
      console.error(`  ↳ Kakao API 오류 ${res.status}`);
      return null;
    }
    const data = await res.json();
    const doc = data.documents?.[0];
    if (!doc) return null;

    const road = doc.road_address;
    const jibun = doc.address;
    return {
      latitude: parseFloat(doc.y),
      longitude: parseFloat(doc.x),
      address_road: road?.address_name || null,
      address_jibun: jibun?.address_name || null,
      sido: jibun?.region_1depth_name || road?.region_1depth_name || null,
      sigungu: jibun?.region_2depth_name || road?.region_2depth_name || null,
      dong: jibun?.region_3depth_name || road?.region_3depth_name || null,
    };
  } catch (e) {
    console.error(`  ↳ 요청 실패: ${e.message}`);
    return null;
  }
}

// ────────── 메인 ──────────
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('K-ALBA 공고 좌표 백필 스크립트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`모드:     ${DRY_RUN ? '🔍 DRY RUN (미리보기)' : '🔥 REAL (실제 업데이트)'}`);
  console.log(`최대건수: ${LIMIT}`);
  console.log('');

  // 1. 좌표 없는 공고 조회
  console.log('1️⃣  좌표 없는 공고 조회 중...');
  const { data: jobs, error: fetchErr } = await supabase
    .from('jobs')
    .select('id, title, address')
    .is('latitude', null)
    .not('address', 'is', null)
    .limit(LIMIT);

  if (fetchErr) {
    console.error('❌ 조회 실패:', fetchErr.message);
    process.exit(1);
  }

  console.log(`   → ${jobs.length}건 발견`);

  if (jobs.length === 0) {
    console.log('✅ 모든 공고가 이미 좌표를 갖고 있습니다.');
    return;
  }

  // 2. 각 공고 지오코딩 + 업데이트
  console.log('');
  console.log('2️⃣  지오코딩 시작 (200ms 간격)...');
  console.log('');

  let success = 0;
  let failed = 0;
  let notFound = 0;

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const prefix = `[${i + 1}/${jobs.length}]`;

    if (!job.address || job.address.trim() === '' || job.address === '온라인') {
      console.log(`${prefix} 건너뜀 (주소 없음): ${job.title}`);
      continue;
    }

    process.stdout.write(`${prefix} ${job.title.slice(0, 30).padEnd(30)} [${job.address.slice(0, 30).padEnd(30)}] ... `);

    const geo = await geocode(job.address);

    if (!geo) {
      console.log('❌ 주소를 찾을 수 없음');
      notFound++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`✅ ${geo.sigungu} (${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}) [dry run]`);
      success++;
    } else {
      const { error: updErr } = await supabase
        .from('jobs')
        .update(geo)
        .eq('id', job.id);

      if (updErr) {
        console.log(`❌ 업데이트 실패: ${updErr.message}`);
        failed++;
      } else {
        console.log(`✅ ${geo.sigungu} (${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)})`);
        success++;
      }
    }

    // Rate limit 준수
    await sleep(200);
  }

  // 3. 결과 요약
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('결과 요약');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 성공:      ${success}건`);
  console.log(`❌ 실패:      ${failed}건`);
  console.log(`🔍 못찾음:   ${notFound}건`);
  console.log('');

  if (DRY_RUN) {
    console.log('💡 --dry-run 모드였습니다. 실제로 적용하려면 --dry-run 없이 다시 실행하세요.');
  } else {
    console.log('💡 잔여 건을 처리하려면 스크립트를 다시 실행하세요.');
  }
}

main().catch(err => {
  console.error('❌ 예기치 못한 오류:', err);
  process.exit(1);
});
