"use client";
import { useEffect, useRef, useState } from "react";
import { T } from "@/lib/theme";

/**
 * Kakao Map JavaScript SDK 로더 (싱글톤)
 *
 * 필요한 환경변수:
 *   NEXT_PUBLIC_KAKAO_MAP_JS_KEY (Kakao Developers > 앱 > JavaScript 키)
 *
 * 주의: REST API 키와 JavaScript 키는 다름
 */
let scriptLoading = null;
function loadKakaoMapScript() {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
    return Promise.resolve(true);
  }
  if (scriptLoading) return scriptLoading;

  const KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY;
  if (!KEY) {
    console.error("[KakaoMap] NEXT_PUBLIC_KAKAO_MAP_JS_KEY not set");
    return Promise.resolve(false);
  }

  scriptLoading = new Promise((resolve) => {
    const existing = document.querySelector('script[src*="dapi.kakao.com/v2/maps"]');
    if (existing) {
      existing.addEventListener("load", () => {
        window.kakao.maps.load(() => resolve(true));
      });
      return;
    }
    const s = document.createElement("script");
    // autoload=false: onload 후 수동으로 kakao.maps.load() 호출하여 확실하게 준비됨
    s.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&libraries=services,clusterer&autoload=false`;
    s.async = true;
    s.onload = () => {
      window.kakao.maps.load(() => resolve(true));
    };
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
  return scriptLoading;
}

/**
 * KakaoMap 컴포넌트
 *
 * @param center {latitude, longitude}
 * @param level 확대/축소 레벨 (1~14, 낮을수록 확대)
 * @param markers [{latitude, longitude, title, color, onClick}]
 * @param userLocation 사용자 현재 위치 (파란 점으로 표시)
 * @param showRoute {from: {lat, lng}, to: {lat, lng}} - 직선 경로 표시
 * @param onMapClick (lat, lng) => void - 지도 클릭 이벤트
 * @param onMarkerDragEnd (lat, lng) => void - 마커 드래그 (편집 모드)
 * @param draggableMarker 단일 드래그 가능한 마커 (사장님 공고 등록용)
 * @param cluster 마커 개수 많을 때 클러스터링
 * @param height 지도 높이 (기본 300px)
 */
export default function KakaoMap({
  center,
  level = 4,
  markers = [],
  userLocation = null,
  showRoute = null,
  onMapClick = null,
  onMarkerDragEnd = null,
  draggableMarker = null,
  cluster = false,
  height = 300,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerObjectsRef = useRef([]);
  const userMarkerRef = useRef(null);
  const draggableMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const clustererRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // ═══ 1. 스크립트 로드 ═══
  useEffect(() => {
    loadKakaoMapScript().then((ok) => {
      setLoaded(ok);
      if (!ok) setError(true);
    });
  }, []);

  // ═══ 2. 지도 초기화 ═══
  useEffect(() => {
    if (!loaded || !mapRef.current || !center) return;
    if (mapInstanceRef.current) return; // 이미 생성됨

    const { kakao } = window;
    const map = new kakao.maps.Map(mapRef.current, {
      center: new kakao.maps.LatLng(center.latitude, center.longitude),
      level,
    });

    mapInstanceRef.current = map;

    // 지도 클릭 이벤트
    if (onMapClick) {
      kakao.maps.event.addListener(map, "click", (e) => {
        const latlng = e.latLng;
        onMapClick(latlng.getLat(), latlng.getLng());
      });
    }

    // 클러스터러 준비
    if (cluster) {
      clustererRef.current = new kakao.maps.MarkerClusterer({
        map,
        averageCenter: true,
        minLevel: 5,
        disableClickZoom: false,
        styles: [{
          width: "44px", height: "44px",
          background: T.n9,
          color: T.gold,
          borderRadius: "22px",
          textAlign: "center",
          lineHeight: "44px",
          fontWeight: "700",
          fontSize: "13px",
          border: `2px solid ${T.gold}`,
        }],
      });
    }

    // cleanup
    return () => {
      if (mapInstanceRef.current) {
        // 마커 제거
        markerObjectsRef.current.forEach((m) => m.setMap(null));
        markerObjectsRef.current = [];
      }
    };
  }, [loaded, center?.latitude, center?.longitude]); // center 변경 시 재생성 방지를 위해 좌표로 비교

  // ═══ 3. 지도 중심 업데이트 (center prop 변경 시) ═══
  useEffect(() => {
    if (!mapInstanceRef.current || !center) return;
    const { kakao } = window;
    mapInstanceRef.current.setCenter(
      new kakao.maps.LatLng(center.latitude, center.longitude)
    );
  }, [center?.latitude, center?.longitude]);

  // ═══ 4. 마커 업데이트 ═══
  useEffect(() => {
    if (!mapInstanceRef.current || !loaded) return;
    const { kakao } = window;
    const map = mapInstanceRef.current;

    // 기존 마커 제거
    markerObjectsRef.current.forEach((m) => m.setMap(null));
    markerObjectsRef.current = [];
    if (clustererRef.current) clustererRef.current.clear();

    const newMarkers = [];

    markers.forEach((markerData) => {
      const position = new kakao.maps.LatLng(
        markerData.latitude,
        markerData.longitude
      );

      // 커스텀 마커 이미지 (골드 핀)
      const imageSrc = buildMarkerSvg(markerData.color || T.accent);
      const imageSize = new kakao.maps.Size(30, 40);
      const imageOption = { offset: new kakao.maps.Point(15, 40) };
      const markerImage = new kakao.maps.MarkerImage(
        imageSrc,
        imageSize,
        imageOption
      );

      const marker = new kakao.maps.Marker({
        position,
        image: markerImage,
        title: markerData.title || "",
      });

      if (markerData.onClick) {
        kakao.maps.event.addListener(marker, "click", () => {
          markerData.onClick(markerData);
        });
      }

      if (cluster && clustererRef.current) {
        // 클러스터러에 추가
      } else {
        marker.setMap(map);
      }

      // 인포윈도우 (선택)
      if (markerData.infoHtml) {
        const infowindow = new kakao.maps.InfoWindow({
          content: `<div style="padding:8px 12px;font-size:13px;font-family:Pretendard,sans-serif;color:${T.ink};">${markerData.infoHtml}</div>`,
        });
        kakao.maps.event.addListener(marker, "mouseover", () => {
          infowindow.open(map, marker);
        });
        kakao.maps.event.addListener(marker, "mouseout", () => {
          infowindow.close();
        });
      }

      newMarkers.push(marker);
    });

    markerObjectsRef.current = newMarkers;

    // 클러스터에 일괄 추가
    if (cluster && clustererRef.current && newMarkers.length > 0) {
      clustererRef.current.addMarkers(newMarkers);
    }
  }, [markers, loaded, cluster]);

  // ═══ 5. 사용자 위치 마커 (파란 점) ═══
  useEffect(() => {
    if (!mapInstanceRef.current || !loaded) return;
    const { kakao } = window;

    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
      userMarkerRef.current = null;
    }

    if (!userLocation) return;

    const position = new kakao.maps.LatLng(
      userLocation.latitude,
      userLocation.longitude
    );

    // 파란 동그라미 (CSS가 아닌 SVG 이미지로)
    const imageSrc = buildUserLocationSvg();
    const image = new kakao.maps.MarkerImage(
      imageSrc,
      new kakao.maps.Size(22, 22),
      { offset: new kakao.maps.Point(11, 11) }
    );

    const marker = new kakao.maps.Marker({
      position,
      image,
      map: mapInstanceRef.current,
      zIndex: 100,
    });
    userMarkerRef.current = marker;
  }, [userLocation, loaded]);

  // ═══ 6. 드래그 가능한 마커 (사장님 공고 등록용) ═══
  useEffect(() => {
    if (!mapInstanceRef.current || !loaded) return;
    const { kakao } = window;

    if (draggableMarkerRef.current) {
      draggableMarkerRef.current.setMap(null);
      draggableMarkerRef.current = null;
    }

    if (!draggableMarker) return;

    const position = new kakao.maps.LatLng(
      draggableMarker.latitude,
      draggableMarker.longitude
    );

    const imageSrc = buildMarkerSvg(T.accent);
    const image = new kakao.maps.MarkerImage(
      imageSrc,
      new kakao.maps.Size(36, 48),
      { offset: new kakao.maps.Point(18, 48) }
    );

    const marker = new kakao.maps.Marker({
      position,
      image,
      map: mapInstanceRef.current,
      draggable: true,
    });

    kakao.maps.event.addListener(marker, "dragend", () => {
      const latlng = marker.getPosition();
      if (onMarkerDragEnd) {
        onMarkerDragEnd(latlng.getLat(), latlng.getLng());
      }
    });

    draggableMarkerRef.current = marker;
  }, [draggableMarker, loaded, onMarkerDragEnd]);

  // ═══ 7. 경로선 (from → to 직선) ═══
  useEffect(() => {
    if (!mapInstanceRef.current || !loaded) return;
    const { kakao } = window;

    if (routeLineRef.current) {
      routeLineRef.current.setMap(null);
      routeLineRef.current = null;
    }

    if (!showRoute) return;

    const linePath = [
      new kakao.maps.LatLng(showRoute.from.lat, showRoute.from.lng),
      new kakao.maps.LatLng(showRoute.to.lat, showRoute.to.lng),
    ];

    const polyline = new kakao.maps.Polyline({
      path: linePath,
      strokeWeight: 3,
      strokeColor: T.accent,
      strokeOpacity: 0.7,
      strokeStyle: "dashed",
    });
    polyline.setMap(mapInstanceRef.current);
    routeLineRef.current = polyline;

    // 양쪽 지점이 모두 보이도록 지도 범위 조정
    const bounds = new kakao.maps.LatLngBounds();
    bounds.extend(linePath[0]);
    bounds.extend(linePath[1]);
    mapInstanceRef.current.setBounds(bounds, 40, 40, 40, 40);
  }, [showRoute, loaded]);

  // ═══ UI ═══
  if (error) {
    return (
      <div style={{
        height,
        background: T.cream,
        border: `1px solid ${T.border}`,
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        color: T.ink3,
        letterSpacing: "-0.01em",
      }}>
        지도를 불러올 수 없습니다
      </div>
    );
  }

  if (!loaded) {
    return (
      <div style={{
        height,
        background: T.cream,
        border: `1px solid ${T.border}`,
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        color: T.ink3,
      }}>
        🗺️ 지도 불러오는 중...
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height,
        borderRadius: 6,
        overflow: "hidden",
        border: `1px solid ${T.border}`,
      }}
    />
  );
}

/**
 * 마커 SVG를 base64 data URL로 생성
 * (이미지 파일 불필요, 색상 동적 변경 가능)
 */
function buildMarkerSvg(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
    <path d="M15 0C6.7 0 0 6.7 0 15c0 11 15 25 15 25s15-14 15-25C30 6.7 23.3 0 15 0z"
          fill="${color}" stroke="#fff" stroke-width="2"/>
    <circle cx="15" cy="15" r="6" fill="#fff"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function buildUserLocationSvg() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
    <circle cx="11" cy="11" r="10" fill="#1E88E5" fill-opacity="0.25"/>
    <circle cx="11" cy="11" r="6" fill="#1E88E5" stroke="#fff" stroke-width="2"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
