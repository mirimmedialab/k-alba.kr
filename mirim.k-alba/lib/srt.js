// SRT/VTT 자막 파일 → 텍스트 추출 (교육 콘텐츠 번역 업로드용)

/**
 * SRT 또는 WebVTT 자막 텍스트에서 대사만 추출해 문단 텍스트로 반환.
 * 일반 TXT는 그대로 반환.
 */
export function parseSubtitleText(raw, fileName = "") {
  const name = fileName.toLowerCase();
  const isSub = name.endsWith(".srt") || name.endsWith(".vtt") || /-->/m.test(raw);
  if (!isSub) return raw.trim();

  const lines = raw.replace(/\r/g, "").split("\n");
  const out = [];
  for (let line of lines) {
    const t = line.trim();
    if (!t) { if (out.length && out[out.length - 1] !== "") out.push(""); continue; }
    if (t === "WEBVTT" || t.startsWith("NOTE ") || t === "NOTE") continue;
    if (/^\d+$/.test(t)) continue;                       // 블록 번호
    if (/-->/.test(t)) continue;                          // 타임코드
    if (/^(STYLE|REGION)\b/.test(t)) continue;            // VTT 메타
    out.push(t.replace(/<[^>]+>/g, ""));                  // 인라인 태그 제거
  }
  // 연속 빈 줄 정리 후 문단 구성
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
