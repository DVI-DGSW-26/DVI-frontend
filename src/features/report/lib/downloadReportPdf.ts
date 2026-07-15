import type {
  AppearanceResult,
  JudgeResult,
  ReportDetail,
  ReportResultItem,
} from "../api/types";
import { getReportDetail } from "../api/reportApi";
import { toBackendImageUrl } from "../../../lib/imageUrl";

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

function fmtValue(v: number | null | undefined): string {
  return v == null ? "-" : String(v);
}

function judgeBadge(result: JudgeResult): string {
  const isPass = result === "PASS";
  const label = isPass ? "합격" : "불합격";
  const cls = isPass ? "badge pass" : "badge fail";
  return `<span class="${cls}">${label}</span>`;
}

function appearanceBadge(value: AppearanceResult | null): string {
  if (!value) return `<span class="badge muted">미입력</span>`;
  const cls = value === "OK" ? "badge pass" : "badge fail";
  return `<span class="${cls}">${value}</span>`;
}

function imgCell(url: string | null): string {
  const resolved = toBackendImageUrl(url);
  if (!resolved) return "-";
  return `<img src="${escapeHtml(resolved)}" alt="측정 사진" class="thumb" />`;
}

function measureTable(detail: ReportDetail): string {
  const isMachining = detail.process === "MACHINING";

  const headerCells = isMachining
    ? `<th>번호</th><th>기준</th><th>공차</th><th>자주값</th><th>자주 OK/NG</th><th>순회값</th><th>순회 OK/NG</th><th>판정</th>`
    : `<th>번호</th><th>기준</th><th>공차</th><th>자주검사</th><th>순회검사</th><th>판정</th>`;

  const colCount = isMachining ? 8 : 6;

  const rows = detail.results
    .map((r: ReportResultItem) => {
      if (isMachining) {
        return `
        <tr>
          <td>${r.dimNo}</td>
          <td>${r.standardValue}</td>
          <td>${fmtTolerance(r.tolerancePlus, r.toleranceMinus)}</td>
          <td>${fmtValue(r.productionValue)}</td>
          <td>${appearanceBadge(r.productionPassFailResult)}</td>
          <td>${fmtValue(r.qualityValue)}</td>
          <td>${appearanceBadge(r.qualityPassFailResult)}</td>
          <td>${judgeBadge(r.result)}</td>
        </tr>`;
      }
      return `
        <tr>
          <td>${r.dimNo}</td>
          <td>${r.standardValue}</td>
          <td>${fmtTolerance(r.tolerancePlus, r.toleranceMinus)}</td>
          <td>${fmtValue(r.productionValue)}</td>
          <td>${fmtValue(r.qualityValue)}</td>
          <td>${judgeBadge(r.result)}</td>
        </tr>`;
    })
    .join("");

  const empty = `<tr><td colspan="${colCount}" style="text-align:center;color:#A8A8A8">측정 데이터 없음</td></tr>`;

  return `
    <section>
      <h2>측정 결과</h2>
      <table>
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${rows || empty}</tbody>
      </table>
    </section>`;
}

function photoSection(detail: ReportDetail): string {
  if (detail.results.length === 0) return "";
  const rows = detail.results
    .map(
      (r) => `
        <tr>
          <td>${r.dimNo}</td>
          <td>${imgCell(r.productionImageUrl)}</td>
          <td>${imgCell(r.qualityImageUrl)}</td>
        </tr>`,
    )
    .join("");
  return `
    <section>
      <h2>측정 사진</h2>
      <table>
        <thead>
          <tr><th>번호</th><th>자주검사</th><th>순회검사</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}

function appearanceSection(detail: ReportDetail): string {
  return `
    <section>
      <h2>외관 검사</h2>
      <div class="appearance-row">
        <span class="appearance-label">자주검사 외관</span>
        ${appearanceBadge(detail.productionAppearanceResult)}
      </div>
      <div class="appearance-row">
        <span class="appearance-label">순회검사 외관</span>
        ${appearanceBadge(detail.qualityAppearanceResult)}
      </div>
    </section>`;
}

function hardnessSection(detail: ReportDetail): string {
  if (!detail.qualityHardnessResult) return "";
  return `
    <section>
      <h2>경도 검사</h2>
      <div class="text-block">${escapeHtml(detail.qualityHardnessResult)}</div>
    </section>`;
}

function remarksSection(detail: ReportDetail): string {
  if (!detail.remarks) return "";
  return `
    <section>
      <h2>비고</h2>
      <div class="text-block pre">${escapeHtml(detail.remarks)}</div>
    </section>`;
}

function sketchSection(detail: ReportDetail): string {
  const resolved = toBackendImageUrl(detail.sketchUrl);
  if (!resolved) return "";
  return `
    <section>
      <h2>도면</h2>
      <img src="${escapeHtml(resolved)}" alt="제품 스케치" class="sketch" />
    </section>`;
}

function buildHtml(detail: ReportDetail): string {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(detail.reportNumber)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Apple SD Gothic Neo", sans-serif;
    color: #212121;
    margin: 32px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1 { font-size: 22px; margin: 0; display: inline-block; vertical-align: middle; }
  h2 { font-size: 14px; margin: 0 0 8px; color: #6B7280; font-weight: 600; }
  .muted { color: #6B7280; font-size: 12px; margin-top: 4px; }
  .header-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 24px; margin-top: 16px; font-size: 13px; }
  .grid .label { color: #6B7280; }
  section { margin-top: 24px; page-break-inside: avoid; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border: 1px solid #E5E7EB; padding: 8px 10px; text-align: left; vertical-align: middle; }
  th { background: #F3E8F7; color: #6B7280; font-weight: 500; }
  .thumb { max-width: 150px; max-height: 150px; object-fit: contain; display: block; }
  .sketch { max-width: 100%; max-height: 400px; object-fit: contain; display: block; }
  .badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.4;
  }
  .badge.pass { background: #DCFCE7; color: #15803D; border: 1px solid #BBF7D0; }
  .badge.fail { background: #FEE2E2; color: #B91C1C; border: 1px solid #FECACA; }
  .badge.muted { background: #F3F4F6; color: #6B7280; border: 1px solid #E5E7EB; }
  .appearance-row { display: flex; align-items: center; gap: 12px; padding: 6px 0; font-size: 13px; }
  .appearance-label { min-width: 100px; color: #6B7280; }
  .text-block { font-size: 13px; color: #212121; }
  .text-block.pre { white-space: pre-wrap; }
  .footer { margin-top: 32px; font-size: 12px; color: #6B7280; }
  @media print {
    body { margin: 16mm; }
    button { display: none; }
    section { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="header-row">
    <h1>${escapeHtml(detail.reportNumber)}</h1>
    ${judgeBadge(detail.result)}
  </div>
  <div class="muted">발행일 ${escapeHtml(new Date(detail.createdAt).toLocaleString("ko-KR"))}</div>

  <div class="grid">
    <div><span class="label">고객사</span> ${escapeHtml(detail.customerName)}</div>
    <div><span class="label">제품</span> ${escapeHtml(detail.productName)} (${escapeHtml(detail.productCode)})</div>
    <div><span class="label">공정</span> ${escapeHtml(detail.process)}</div>
    <div><span class="label">설비</span> ${escapeHtml(detail.equipmentName)}</div>
    <div><span class="label">검사 차수</span> ${escapeHtml(detail.inspectionLabel)}</div>
    <div><span class="label">자주검사</span> ${escapeHtml(detail.productionName)}</div>
    <div><span class="label">순회검사</span> ${escapeHtml(detail.qualityName)}</div>
    <div><span class="label">승인자</span> ${escapeHtml(detail.approvedByName)}</div>
    <div><span class="label">대상일</span> ${escapeHtml(detail.targetDate)}</div>
  </div>

  ${sketchSection(detail)}
  ${measureTable(detail)}
  ${photoSection(detail)}
  ${appearanceSection(detail)}
  ${hardnessSection(detail)}
  ${remarksSection(detail)}

  <div class="footer">브라우저 인쇄 대화상자에서 "PDF로 저장"을 선택하세요.</div>

  <script>
    // 이미지가 모두 로드된 뒤 인쇄해야 PDF 에 사진이 포함된다.
    window.onload = function () {
      var imgs = Array.prototype.slice.call(document.images);
      if (imgs.length === 0) {
        setTimeout(function () { window.print(); }, 200);
        return;
      }
      var remaining = imgs.length;
      function done() {
        remaining--;
        if (remaining <= 0) setTimeout(function () { window.print(); }, 200);
      }
      imgs.forEach(function (img) {
        if (img.complete) { done(); return; }
        img.addEventListener("load", done);
        img.addEventListener("error", done);
      });
    };
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
