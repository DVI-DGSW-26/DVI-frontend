import type { ReportDetail } from "../api/types";
import { getReportDetail } from "../api/reportApi";

function escapeHtml(s: string | number): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtTolerance(plus: number, minus: number) {
  return `+${plus} / -${minus}`;
}

function buildHtml(detail: ReportDetail): string {
  const rows = detail.results
    .map(
      (r) => `
        <tr>
          <td>${r.dimNo}</td>
          <td>${escapeHtml(r.dimName)}</td>
          <td>${r.standardValue}</td>
          <td>${fmtTolerance(r.tolerancePlus, r.toleranceMinus)}</td>
          <td>${r.productionValue}</td>
          <td>${r.qualityValue}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(detail.reportNumber)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Apple SD Gothic Neo", sans-serif; color: #212121; margin: 32px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .muted { color: #6B7280; font-size: 12px; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 24px; margin-top: 16px; font-size: 13px; }
  .grid .label { color: #6B7280; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 13px; }
  th, td { border: 1px solid #E5E7EB; padding: 8px 10px; text-align: left; }
  th { background: #F3E8F7; color: #6B7280; font-weight: 500; }
  .footer { margin-top: 32px; font-size: 12px; color: #6B7280; }
  @media print { body { margin: 16mm; } button { display: none; } }
</style>
</head>
<body>
  <h1>${escapeHtml(detail.reportNumber)}</h1>
  <div class="muted">발행일 ${escapeHtml(new Date(detail.createdAt).toLocaleString("ko-KR"))}</div>

  <div class="grid">
    <div><span class="label">고객사</span> ${escapeHtml(detail.customerName)}</div>
    <div><span class="label">제품</span> ${escapeHtml(detail.productName)} (${escapeHtml(detail.productCode)})</div>
    <div><span class="label">공정</span> ${escapeHtml(detail.process)}</div>
    <div><span class="label">설비</span> ${escapeHtml(detail.equipmentName)}</div>
    <div><span class="label">검사 구분</span> ${escapeHtml(detail.inspectionLabel)}</div>
    <div><span class="label">검사 시각</span> ${escapeHtml(detail.inspectionTime)}</div>
    <div><span class="label">자주검사</span> ${escapeHtml(detail.productionName)}</div>
    <div><span class="label">순회검사</span> ${escapeHtml(detail.qualityName)}</div>
    <div><span class="label">승인자</span> ${escapeHtml(detail.approvedByName)}</div>
    <div><span class="label">대상일</span> ${escapeHtml(detail.targetDate)}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>번호</th>
        <th>치수명</th>
        <th>기준</th>
        <th>공차</th>
        <th>자주검사</th>
        <th>순회검사</th>
      </tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="6" style="text-align:center;color:#A8A8A8">측정 데이터 없음</td></tr>`}</tbody>
  </table>

  <div class="footer">브라우저 인쇄 대화상자에서 "PDF로 저장"을 선택하세요.</div>

  <script>
    window.onload = function () { setTimeout(function () { window.print(); }, 200); };
  </script>
</body>
</html>`;
}

export async function downloadReportPdf(reportId: number): Promise<void> {
  const w = window.open("", "_blank");
  if (!w) {
    alert("팝업이 차단되어 PDF를 열 수 없습니다. 팝업 허용 후 다시 시도하세요.");
    return;
  }
  w.document.write(
    `<!doctype html><html><body style="font-family:sans-serif;padding:24px;color:#6B7280">보고서를 불러오는 중...</body></html>`,
  );
  try {
    const detail = await getReportDetail(reportId);
    w.document.open();
    w.document.write(buildHtml(detail));
    w.document.close();
    w.focus();
  } catch {
    w.close();
    alert("보고서를 불러오지 못했습니다.");
  }
}
