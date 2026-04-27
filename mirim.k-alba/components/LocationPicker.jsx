"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { AddressSearchModal } from "@/components/AddressSearch";
import KakaoMap from "@/components/KakaoMap";

/**
 * LocationPicker — 주소 검색 + 지도 + 핀 드래그로 정확한 위치 결정
 *
 * 용도:
 *   - 프로필 페이지의 거주지 설정
 *   - 사장님 공고 등록 페이지의 근무지 설정
 *
 * @param value {latitude, longitude, address_road, sido, sigungu, dong}
 * @param onChange (newValue) => void
 * @param label 라벨 (기본: "주소")
 * @param helperText 설명 문구
 * @param hideMap true면 지도 숨김 (주소 텍스트만)
 */
export default function LocationPicker({
  value,
  onChange,
  label = "주소",
  helperText = "주소를 검색한 후, 지도에서 핀을 드래그해 정확한 위치로 조정할 수 있어요.",
  hideMap = false,
}) {
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState(null);

  // 주소 선택 시 → 지오코딩으로 좌표 확보
  const handleAddressSelect = async (address) => {
    setGeocoding(true);
    setError(null);
    try {
      const res = await fetch("/api/geocode/address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "주소를 찾을 수 없어요");
        // 주소 문자열이라도 저장
        onChange({
          ...value,
          address_road: address,
        });
        return;
      }
      onChange({
        latitude: data.latitude,
        longitude: data.longitude,
        address_road: data.address_road || address,
        address_jibun: data.address_jibun,
        sido: data.sido,
        sigungu: data.sigungu,
        dong: data.dong,
      });
    } catch (e) {
      setError("주소 변환 중 오류가 발생했어요");
    } finally {
      setGeocoding(false);
    }
  };

  // 지도에서 핀 드래그 시 → 역지오코딩으로 주소 업데이트
  const handlePinDrag = async (lat, lng) => {
    setGeocoding(true);
    setError(null);
    try {
      const res = await fetch("/api/geocode/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      const data = await res.json();
      if (!data.ok) {
        // 역지오코딩 실패해도 좌표는 업데이트
        onChange({ ...value, latitude: lat, longitude: lng });
        return;
      }
      onChange({
        ...value,
        latitude: lat,
        longitude: lng,
        address_road: data.address_road || value?.address_road,
        address_jibun: data.address_jibun,
        sido: data.sido,
        sigungu: data.sigungu,
        dong: data.dong,
      });
    } catch (e) {
      onChange({ ...value, latitude: lat, longitude: lng });
    } finally {
      setGeocoding(false);
    }
  };

  const hasCoords = value?.latitude && value?.longitude;

  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          color: T.ink,
          marginBottom: 6,
          letterSpacing: "-0.01em",
        }}>
          {label}
        </label>
      )}

      {/* 주소 표시 + 검색 버튼 */}
      <div style={{
        display: "flex",
        gap: 8,
        marginBottom: hasCoords && !hideMap ? 8 : 0,
      }}>
        <div style={{
          flex: 1,
          padding: "11px 14px",
          borderRadius: 4,
          border: `1px solid ${T.border}`,
          background: T.paper,
          fontSize: 14,
          color: value?.address_road ? T.ink : T.ink3,
          letterSpacing: "-0.01em",
          minHeight: 40,
          display: "flex",
          alignItems: "center",
        }}>
          {value?.address_road || "주소를 검색해 주세요"}
        </div>
        <button
          type="button"
          onClick={() => setAddressModalOpen(true)}
          disabled={geocoding}
          style={{
            padding: "11px 16px",
            borderRadius: 4,
            border: "none",
            background: T.n9,
            color: T.paper,
            fontSize: 13,
            fontWeight: 600,
            cursor: geocoding ? "wait" : "pointer",
            fontFamily: "inherit",
            letterSpacing: "-0.01em",
            flexShrink: 0,
          }}
        >
          {geocoding ? "처리중..." : "주소 검색"}
        </button>
      </div>

      {/* 힌트 */}
      {helperText && !hasCoords && (
        <div style={{
          fontSize: 11,
          color: T.ink3,
          marginTop: 6,
          lineHeight: 1.5,
        }}>
          💡 {helperText}
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div style={{
          padding: "8px 12px",
          marginTop: 8,
          background: T.accentBg,
          color: T.accent,
          borderRadius: 4,
          fontSize: 12,
          border: `1px solid ${T.accent}30`,
        }}>
          {error}
        </div>
      )}

      {/* 지도 (좌표 있을 때만) */}
      {hasCoords && !hideMap && (
        <>
          <KakaoMap
            center={{ latitude: value.latitude, longitude: value.longitude }}
            level={3}
            draggableMarker={{ latitude: value.latitude, longitude: value.longitude }}
            onMarkerDragEnd={handlePinDrag}
            height={220}
          />
          <div style={{
            fontSize: 11,
            color: T.ink3,
            marginTop: 6,
            textAlign: "center",
            lineHeight: 1.5,
          }}>
            💡 핀을 드래그해서 정확한 위치로 조정할 수 있어요
            {value?.sigungu && (
              <div style={{ marginTop: 4, color: T.ink2, fontWeight: 600 }}>
                📍 {value.sido} {value.sigungu} {value.dong}
              </div>
            )}
          </div>
        </>
      )}

      {/* 주소 검색 모달 */}
      <AddressSearchModal
        open={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onSelect={handleAddressSelect}
      />
    </div>
  );
}
