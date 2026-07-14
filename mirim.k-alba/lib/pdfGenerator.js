"use client";
// HTML 요소를 PDF로 변환
// html2canvas + jsPDF 조합 (한글 폰트 완벽 지원)
//
// 항상 A4 "1페이지"로 생성:
//   1) 요소를 700px 고정 폭 복제본으로 오프스크린 렌더 (화면 폭과 무관하게 서식 레이아웃 유지)
//   2) 캡처 이미지를 A4 인쇄영역(190×277mm)에 비율 유지로 맞춤 (넘치면 축소)

export async function generateContractPDF(elementId, filename = "k-alba-contract.pdf") {
  if (typeof window === "undefined") {
    throw new Error("PDF generation only works in browser");
  }

  const source = document.getElementById(elementId);
  if (!source) {
    throw new Error(`Element #${elementId} not found`);
  }

  // 동적 import (번들 크기 최적화)
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  // 고정 폭(700px) 복제본을 화면 밖에 렌더 → 모바일 화면에서도 동일한 서식으로 캡처
  const element = source.cloneNode(true);
  element.id = `${elementId}-pdf-clone`;
  Object.assign(element.style, {
    display: "block",
    visibility: "visible",
    position: "fixed",
    top: "0",
    left: "-10000px",
    width: "700px",
    maxWidth: "700px",
    margin: "0",
    boxShadow: "none",
    borderRadius: "0",
    zIndex: "-1",
  });
  document.body.appendChild(element);

  // 웹폰트 로드 대기 (미로드 시 글자 위치가 틀어짐)
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  } catch (_) { /* ignore */ }

  // html2canvas가 한글 글자를 박스/표 칸의 아래쪽에 그리는 문제 보정:
  // 위쪽 패딩을 아래로 옮겨 글자를 세로 가운데로 이동 (PDF 복제본에만 적용)
  const shiftUp = (el, maxShift) => {
    const cs = window.getComputedStyle(el);
    const pt = parseFloat(cs.paddingTop) || 0;
    const pb = parseFloat(cs.paddingBottom) || 0;
    const shift = Math.min(pt, maxShift);
    if (shift <= 0) return;
    el.style.paddingTop = `${pt - shift}px`;
    el.style.paddingBottom = `${pb + shift}px`;
  };
  element.querySelectorAll("td, th").forEach((el) => shiftUp(el, 5));
  element.querySelectorAll("span, div").forEach((el) => {
    const cs = window.getComputedStyle(el);
    if (
      cs.display.indexOf("inline") === 0 &&
      parseFloat(cs.borderTopWidth) > 0 &&
      parseFloat(cs.borderBottomWidth) > 0
    ) {
      shiftUp(el, 6);
    }
  });

  try {
    // 캔버스로 렌더링 (고해상도)
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 700,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    // A4 사이즈 (mm)
    const pdfWidth = 210;
    const pdfHeight = 297;
    const margin = 10;
    const contentWidth = pdfWidth - margin * 2;   // 190
    const printableHeight = pdfHeight - margin * 2; // 277

    // 이미지 비율 유지, 1페이지에 맞춤 (세로가 넘치면 전체 축소)
    let imgWidth = contentWidth;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;
    if (imgHeight > printableHeight) {
      const s = printableHeight / imgHeight;
      imgHeight = printableHeight;
      imgWidth = imgWidth * s;
    }
    const x = (pdfWidth - imgWidth) / 2; // 가로 중앙 정렬

    const pdf = new jsPDF("p", "mm", "a4");
    pdf.addImage(imgData, "JPEG", x, margin, imgWidth, imgHeight);

    // PDF 메타데이터
    pdf.setProperties({
      title: "K-ALBA 근로계약서",
      subject: "Labor Contract",
      author: "K-ALBA",
      creator: "K-ALBA",
    });

    pdf.save(filename);
    return true;
  } finally {
    element.remove();
  }
}

// 파일명 생성 헬퍼
export function buildContractFilename(contract) {
  const date = new Date().toISOString().split("T")[0];
  const worker = (contract.worker_name || "worker").replace(/[\s\/\\]/g, "_");
  const company = (contract.company_name || "company").replace(/[\s\/\\]/g, "_");
  return `K-ALBA_계약서_${company}_${worker}_${date}.pdf`;
}
