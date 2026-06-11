"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  getCurrentLocation,
  checkLocationPermission,
  formatDistance,
} from "@/lib/geolocation";

/**
 * 추천 공고 조회 훅 (접근성 점수 기반)
 *
 * useNearbyJobs와 다른 점:
 *   - 거리뿐 아니라 비자/한국어/숙식 제공을 종합해 점수화
 *   - score_total 순으로 정렬
 *   - reason 필드로 "왜 추천되는지" 표시 가능
 *
 * 사용 예:
 *   const { jobs, loading } = useRecommendedJobs({
 *     userVisa: 'D-2',
 *     userKoreanLevel: 'beginner',
 *     radius: 20,
 *   });
 */
export function useRecommendedJobs(options = {}) {
  const {
    userVisa = null,
    userKoreanLevel = null,
    userTransport = ["transit", "walk"],
    radius = 20,
    limit = 30,
    enabled = true,
  } = options;

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationSource, setLocationSource] = useState(null);

  const determineUserLocation = useCallback(async () => {
    try {
      const perm = await checkLocationPermission();
      if (perm.status === "granted" || perm.status === "prompt") {
        const loc = await getCurrentLocation({ timeoutMs: 8000 });
        setLocationSource("gps");
        return loc;
      }
    } catch (e) {
      console.log("[useRecommendedJobs] GPS failed:", e.message);
    }

    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("home_latitude, home_longitude")
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

    setLocationSource("default");
    return {
      latitude: 37.5663,
      longitude: 126.9779,
      accuracy: 0,
      timestamp: Date.now(),
    };
  }, []);

  const fetchRecommended = useCallback(
    async (location) => {
      if (!supabase) return [];
      try {
        const { data, error: rpcError } = await supabase.rpc("jobs_recommended", {
          user_lat: location.latitude,
          user_lng: location.longitude,
          user_visa: userVisa,
          user_korean_level: userKoreanLevel,
          user_transport: userTransport,
          radius_km: radius,
          limit_count: limit,
        });

        if (rpcError) {
          console.error("[useRecommendedJobs] RPC error:", rpcError);
          setError(rpcError.message);
          return [];
        }

        return (data || []).map((job) => ({
          ...job,
          distance_formatted: formatDistance(job.distance_m),
        }));
      } catch (e) {
        console.error("[useRecommendedJobs] fetch error:", e);
        setError(e.message);
        return [];
      }
    },
    [userVisa, userKoreanLevel, JSON.stringify(userTransport), radius, limit]
  );

  useEffect(() => {
    if (!enabled) return;
    let canceled = false;
    (async () => {
      setLoading(true);
      try {
        const loc = await determineUserLocation();
        if (canceled) return;
        setUserLocation(loc);
        const recommendedJobs = await fetchRecommended(loc);
        if (canceled) return;
        setJobs(recommendedJobs);
      } catch (e) {
        if (!canceled) setError(e.message);
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    return () => { canceled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, userVisa, userKoreanLevel, radius]);

  return {
    jobs,
    loading,
    error,
    userLocation,
    locationSource,
  };
}
