"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase, getJobs } from "@/lib/supabase";
import {
  getCurrentLocation,
  checkLocationPermission,
  requestLocationPermission,
  calculateDistanceMeters,
} from "@/lib/geolocation";

/**
 * 위치 기반 주변 공고 조회 훅 (지도/주변 탐색용)
 *
 * 위치 결정 우선순위:
 *   1. GPS (이미 권한 허용된 경우에만 자동 사용 — 초기엔 권한 팝업 강제 안 함)
 *   2. 프로필의 home_latitude/home_longitude
 *   3. 기본값(서울시청) + locationSource="default" → 페이지에서 '내 위치 허용' 버튼 노출
 *
 * 거리 계산은 클라이언트에서 수행(별도 RPC 불필요). 좌표 있는 공고만 대상.
 *
 * 반환: { jobs, loading, error, userLocation, locationSource, requestLocation }
 *   - jobs[i].distance_m 포함(가까운 순 정렬)
 */
const DEFAULT_LOCATION = { latitude: 37.5663, longitude: 126.9779 }; // 서울시청

export function useNearbyJobs(options = {}) {
  const {
    radius = 10,            // km
    visaFilter = null,      // ['D-2', ...]
    limit = 50,
    useProfileFallback = true,
  } = options;

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationSource, setLocationSource] = useState("default");

  // 위치 결정. forceGps=true 면 권한 팝업을 띄워서라도 GPS 시도(버튼 클릭 시).
  const determineUserLocation = useCallback(async (forceGps = false) => {
    // 1) GPS
    try {
      const perm = await checkLocationPermission();
      if (forceGps || perm?.status === "granted") {
        const loc = await getCurrentLocation({ timeoutMs: 10000 });
        if (loc?.latitude && loc?.longitude) {
          setLocationSource("gps");
          return { latitude: loc.latitude, longitude: loc.longitude };
        }
      }
    } catch (_) { /* GPS 실패 → 다음 단계 */ }

    // 2) 프로필 거주지
    if (useProfileFallback && supabase) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("home_latitude, home_longitude")
            .eq("id", authData.user.id)
            .maybeSingle();
          if (profile?.home_latitude && profile?.home_longitude) {
            setLocationSource("profile");
            return { latitude: profile.home_latitude, longitude: profile.home_longitude };
          }
        }
      } catch (_) { /* 무시 */ }
    }

    // 3) 기본값
    setLocationSource("default");
    return { ...DEFAULT_LOCATION };
  }, [useProfileFallback]);

  // 공고 조회 + 거리 계산/필터(클라이언트)
  const fetchNearby = useCallback(async (loc) => {
    try {
      const all = await getJobs();
      const list = (all || [])
        .filter((j) => j.latitude && j.longitude)
        .map((j) => ({
          ...j,
          company_name: j.employer?.company_name || j.employer_external_name || j.company_name || "",
          distance_m: calculateDistanceMeters(loc.latitude, loc.longitude, j.latitude, j.longitude),
        }))
        .filter((j) => j.distance_m <= radius * 1000)
        .filter((j) => {
          if (!visaFilter || visaFilter.length === 0) return true;
          const vts = j.visa_types || [];
          return visaFilter.some((v) => vts.includes(v));
        })
        .sort((a, b) => a.distance_m - b.distance_m)
        .slice(0, limit);
      return list;
    } catch (e) {
      setError(e?.message || "공고를 불러오지 못했어요.");
      return [];
    }
  }, [radius, visaFilter, limit]);

  // 최초 진입 시: 바로 GPS 요청(권한 팝업)해서 위치 결정 + 조회
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const loc = await determineUserLocation(true); // 들어가자마자 GPS 요청
      if (cancelled) return;
      setUserLocation(loc);
      const list = await fetchNearby(loc);
      if (cancelled) return;
      setJobs(list);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // 최초 1회만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 반경/비자 필터 변경 시: 위치는 유지하고 재조회만
  useEffect(() => {
    if (!userLocation) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const list = await fetchNearby(userLocation);
      if (!cancelled) { setJobs(list); setLoading(false); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius, visaFilter]);

  // '내 위치 허용' 버튼 → GPS 강제 시도 후 재조회
  const requestLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    // 이전에 거부했던 경우에도 권한 팝업을 다시 띄운다.
    // (한 번 거부 → 재요청 시 다시 물어봄. "다시 묻지 않음" 영구 거부면 OS가 팝업을 막으므로
    //  이 경우엔 폰 설정 > 앱 > K-ALBA > 권한에서 위치를 허용해야 함)
    try { await requestLocationPermission(); } catch (_) {}
    const loc = await determineUserLocation(true);
    setUserLocation(loc);
    const list = await fetchNearby(loc);
    setJobs(list);
    setLoading(false);
  }, [determineUserLocation, fetchNearby]);

  return { jobs, loading, error, userLocation, locationSource, requestLocation };
}
