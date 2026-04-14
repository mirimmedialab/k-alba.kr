"use client";
// HTML 요소를 PDF로 변환
// html2canvas + jsPDF 조합 (한글 폰트 완벽 지원)

export async function generateContractPDF(elementId, filename = "k-alba-contract.pdf") {
  if (typeof window === "undefined") {
    throw new Error("PDF generation only works in browser");
  }

  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element #${elementId} not found`);
  }

  // 동적 import (번들 크기 최적화)
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  // 잠시 요소를 보이게 (숨겨진 경우 캡처 안됨)
  const originalDisplay = element.style.display;
  const originalVisibility = element.style.visibility;
  const wasHidden = originalDisplay === "none";
  if (wasHidden) {
    element.style.display = "block";
    element.style.visibility = "hidden";
    element.style.position = "absolute";
    element.style.top = "-9999px";
    element.style.left = "0";
  }

  try {
    // 캔버스로 렌더링 (고해상도)
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    // A4 사이즈 (mm)
    const pdfWidth = 210;
    const pdfHeight = 297;
    const margin = 10;
    const contentWidth = pdfWidth - margin * 2;

    // 이미지 비율 유지
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF("p", "mm", "a4");

    // 페이지가 넘치면 여러 페이지로 분할
    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight - margin * 2;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight - margin * 2;
    }

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
    // 원래 상태로 복원
    if (wasHidden) {
      element.style.display = originalDisplay;
      element.style.visibility = originalVisibility;
      element.style.position = "";
      element.style.top = "";
      element.style.left = "";
    }
  }
}

// 파일명 생성 헬퍼
export function buildContractFilename(contract) {
  const date = new Date().toISOString().split("T")[0];
  const worker = (contract.worker_name || "worker").replace(/[\s\/\\]/g, "_");
  const company = (contract.company_name || "company").replace(/[\s\/\\]/g, "_");
  return `K-ALBA_계약서_${company}_${worker}_${date}.pdf`;
}
