"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  getCurrentLocation,
  checkLocationPermission,
  calculateDistanceMeters,
  formatDistance,
} from "@/lib/geolocation";

/**
 * 위치 기반 공고 조회 훅
 *
 * 우선순위:
 *   1. 네이티브/웹 GPS로 현재 위치 확보
 *   2. 실패 시 프로필의 home_latitude/longitude 사용
 *   3. 둘 다 없으면 기본값(서울 시청) 사용 + 안내
 *
 * 사용 예:
 *   const { jobs, loading, error, userLocation, requestLocation, refetch }
 *     = useNearbyJobs({ radius: 10, visaFilter: ['D-2'] });
 */
export function useNearbyJobs(options = {}) {
  const {
    radius = 10,                    // km
    visaFilter = null,              // ['D-2','F-2'] 등
    limit = 50,
    enabled = true,                 // 자동 실행 여부
    useProfileFallback = true,      // 프로필 주소 fallback 사용
  } = options;

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationSource, setLocationSource] = useState(null); // "gps" | "profile" | "default"

  /**
   * 사용자 위치 결정:
   *   GPS 성공 → gps
   *   GPS 실패 + 프로필에 home 좌표 있음 → profile
   *   둘 다 없음 → default (서울 시청)
   */
  const determineUserLocation = useCallback(async () => {
    // 1. GPS 시도
    try {
      const perm = await checkLocationPermission();
      if (perm.status === "granted" || perm.status === "prompt") {
        const loc = await getCurrentLocation({ timeoutMs: 8000 });
        setLocationSource("gps");
        return loc;
      }
    } catch (e) {
      console.log("[useNearbyJobs] GPS failed:", e.message);
    }

    // 2. 프로필 fallback
    if (useProfileFallback) {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("home_latitude, home_longitude, home_sigungu")
          .eq("id", authData.user.id)
          .single();

        if (profile?.home_latitude && profile?.home_longitude) {
          setLocationSource("profile");
          return {
            latitude: profile.home_latitude,
            longitude: profile.home_longitude,
            accuracy: 0,
            timestamp: Date.now(),
          };
        }
      }
    }

    // 3. 기본값 (서울 시청)
    setLocationSource("default");
    return {
      latitude: 37.5663,
      longitude: 126.9779,
      accuracy: 0,
      timestamp: Date.now(),
    };
  }, [useProfileFallback]);

  /**
   * 공고 조회 (Supabase RPC 호출)
   */
  const fetchNearbyJobs = useCallback(
    async (location) => {
      if (!supabase) {
        setError("Supabase가 설정되지 않았습니다.");
        return [];
      }
      try {
        const { data, error: rpcError } = await supabase.rpc("jobs_nearby", {
          user_lat: location.latitude,
          user_lng: location.longitude,
          radius_km: radius,
          visa_filter: visaFilter,
          limit_count: limit,
        });

        if (rpcError) {
          console.error("[useNearbyJobs] RPC error:", rpcError);
          setError(rpcError.message);
          return [];
        }

        // 각 공고에 거리 포맷/이동수단 정보 부가
        return (data || []).map((job) => ({
          ...job,
          distance_formatted: formatDistance(job.distance_m),
          // 5km 이내면 'near', 15km 이내면 'medium', 그 이상 'far'
          distance_tier:
            job.distance_m < 5000 ? "near"
            : job.distance_m < 15000 ? "medium"
            : "far",
        }));
      } catch (e) {
        console.error("[useNearbyJobs] fetch error:", e);
        setError(e.message);
        return [];
      }
    },
    [radius, visaFilter, limit]
  );

  /**
   * 수동 위치 요청 (사용자가 "현재 위치로 다시 찾기" 버튼 클릭 시)
   */
  const requestLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loc = await determineUserLocation();
      setUserLocation(loc);
      const nearbyJobs = await fetchNearbyJobs(loc);
      setJobs(nearbyJobs);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [determineUserLocation, fetchNearbyJobs]);

  /**
   * 단순 재조회 (위치는 그대로, 필터만 바뀐 경우)
   */
  const refetch = useCallback(async () => {
    if (!userLocation) return;
    setLoading(true);
    const nearbyJobs = await fetchNearbyJobs(userLocation);
    setJobs(nearbyJobs);
    setLoading(false);
  }, [userLocation, fetchNearbyJobs]);

  // 초기 마운트 시 자동 실행
  useEffect(() => {
    if (!enabled) return;
    let canceled = false;
    (async () => {
      setLoading(true);
      try {
        const loc = await determineUserLocation();
        if (canceled) return;
        setUserLocation(loc);
        const nearbyJobs = await fetchNearbyJobs(loc);
        if (canceled) return;
        setJobs(nearbyJobs);
      } catch (e) {
        if (!canceled) setError(e.message);
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    return () => { canceled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, radius, JSON.stringify(visaFilter)]);

  return {
    jobs,
    loading,
    error,
    userLocation,
    locationSource,      // "gps" | "profile" | "default"
    requestLocation,     // 사용자가 새로 위치 요청
    refetch,             // 필터만 바뀌었을 때 재조회
  };
}
