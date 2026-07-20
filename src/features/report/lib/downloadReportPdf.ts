import type {
  AppearanceResult,
  JudgeResult,
  ReportDetail,
  ReportMeasurement,
  ReportResultItem,
  ReportStage,
  ReportStageInfo,
} from "../api/types";
import { getReportDetail } from "../api/reportApi";
import { hasStageMeasurements } from "./stageMeasurements";
import { toBackendImageUrl } from "../../../lib/imageUrl";

const STAGE_ORDER: Record<ReportStage, number> = {
  INITIAL: 0,
  MIDDLE: 1,
  FINAL: 2,
};

const STAGE_LABEL: Record<ReportStage, string> = {
  INITIAL: "초",
  MIDDLE: "중",
  FINAL: "종",
};

// 보고서 전체에 등장하는 차수를 초→중→종 순으로. dim 마다 측정된 차수가 다를 수
// 있어(중간 차수 건너뜀 등) 합집합을 잡아야 열이 어긋나지 않는다.
function collectStages(detail: ReportDetail): ReportMeasurement[] {
  const byType = new Map<string, ReportMeasurement>();
  for (const r of detail.results) {
    for (const m of r.measurements ?? []) {
      if (!byType.has(m.type)) byType.set(m.type, m);
    }
  }
  return [...byType.values()].sort(
    (a, b) => (STAGE_ORDER[a.stage] ?? 9) - (STAGE_ORDER[b.stage] ?? 9),
  );
}

function stageTitle(s: { stage: ReportStage; typeLabel: string }): string {
  return `${STAGE_LABEL[s.stage] ?? ""} ${s.typeLabel ?? ""}`.trim();
}

function orderedStageInfos(detail: ReportDetail): ReportStageInfo[] {
  return [...(detail.stages ?? [])].sort(
    (a, b) => (STAGE_ORDER[a.stage] ?? 9) - (STAGE_ORDER[b.stage] ?? 9),
  );
}

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

// 통합 보고서 측정 결과 — dim 1행 x 초·중·종 열. 차수마다 자주/순회 2개 하위 열.
// 가공(MACHINING)은 수치 대신 OK/NG 판정이 들어간다.
function stageMeasureTable(detail: ReportDetail): string {
  const stages = collectStages(detail);
  const isMachining = detail.process === "MACHINING";

  const topCells =
    `<th rowspan="2">번호</th><th rowspan="2">기준</th><th rowspan="2">공차</th>` +
    stages
      .map((s) => `<th colspan="2">${escapeHtml(stageTitle(s))}</th>`)
      .join("") +
    `<th rowspan="2">판정</th>`;
  const subCells = stages.map(() => `<th>자주</th><th>순회</th>`).join("");
  const colCount = 4 + stages.length * 2;

  const cell = (m: ReportMeasurement | undefined, side: "prod" | "qual") => {
    if (!m) return "-";
    if (isMachining) {
      const pf =
        side === "prod" ? m.productionPassFailResult : m.qualityPassFailResult;
      return appearanceBadge(pf);
    }
    return fmtValue(side === "prod" ? m.productionValue : m.qualityValue);
  };

  const rows = detail.results
    .map((r: ReportResultItem) => {
      const cells = stages
        .map((s) => {
          const m = r.measurements?.find((x) => x.type === s.type);
          return `<td>${cell(m, "prod")}</td><td>${cell(m, "qual")}</td>`;
        })
        .join("");
      return `
        <tr>
          <td>${r.dimNo}</td>
          <td>${r.standardValue}</td>
          <td>${fmtTolerance(r.tolerancePlus, r.toleranceMinus)}</td>
          ${cells}
          <td>${judgeBadge(r.result)}</td>
        </tr>`;
    })
    .join("");

  const empty = `<tr><td colspan="${colCount}" style="text-align:center;color:#A8A8A8">측정 데이터 없음</td></tr>`;

  return `
    <section>
      <h2>측정 결과 (초·중·종)</h2>
      <table>
        <thead>
          <tr>${topCells}</tr>
          <tr>${subCells}</tr>
        </thead>
        <tbody>${rows || empty}</tbody>
      </table>
    </section>`;
}

function measureTable(detail: ReportDetail): string {
  if (hasStageMeasurements(detail.results)) return stageMeasureTable(detail);
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

// 차수별 검사 정보 — 검사자·시각·외관·경도는 차수마다 다르므로 단수 필드로는
// 종 차수 값만 나온다. stages 가 오면 표로 펼친다.
function stagesSection(detail: ReportDetail): string {
  const stages = orderedStageInfos(detail);
  if (stages.length === 0) return "";
  const hasHardness = stages.some((s) => s.qualityHardnessResult);

  const rows = stages
    .map(
      (s) => `
        <tr>
          <td>${escapeHtml(stageTitle(s))}</td>
          <td>${escapeHtml(fmtInspected(s))}</td>
          <td>${escapeHtml(s.productionName ?? "-")}</td>
          <td>${escapeHtml(s.qualityName ?? "-")}</td>
          <td>${appearanceBadge(s.productionAppearanceResult)}</td>
          <td>${appearanceBadge(s.qualityAppearanceResult)}</td>
          ${hasHardness ? `<td>${escapeHtml(s.qualityHardnessResult ?? "-")}</td>` : ""}
          <td>${escapeHtml(s.remarks ?? "-")}</td>
        </tr>`,
    )
    .join("");

  return `
    <section>
      <h2>차수별 검사 정보</h2>
      <table>
        <thead>
          <tr>
            <th>차수</th><th>검사 시각</th><th>자주검사자</th><th>순회검사자</th>
            <th>자주 외관</th><th>순회 외관</th>
            ${hasHardness ? "<th>경도</th>" : ""}
            <th>비고</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}

// 실제 검사 시각 우선. 없으면 예정 슬롯을 괄호로 구분해 폴백 — 슬롯값은 실제로
// 언제 측정했는지가 아니다.
function fmtInspected(s: ReportStageInfo): string {
  if (s.inspectedAt) {
    const d = new Date(s.inspectedAt);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString("ko-KR");
  }
  if (s.inspectionTime) return `(${s.inspectionTime.slice(0, 5)} 예정)`;
  return "-";
}

// 차수별 측정 사진 — dim 1행 x 차수 열, 칸마다 자주/순회 2장.
function stagePhotoSection(detail: ReportDetail): string {
  const stages = collectStages(detail);
  const rows = detail.results
    .map((r) => {
      const cells = stages
        .map((s) => {
          const m = r.measurements?.find((x) => x.type === s.type);
          return `<td>${imgCell(m?.productionImageUrl ?? null)}</td><td>${imgCell(
            m?.qualityImageUrl ?? null,
          )}</td>`;
        })
        .join("");
      return `<tr><td>${r.dimNo}</td>${cells}</tr>`;
    })
    .join("");

  return `
    <section>
      <h2>측정 사진 (초·중·종)</h2>
      <table>
        <thead>
          <tr>
            <th rowspan="2">번호</th>
            ${stages.map((s) => `<th colspan="2">${escapeHtml(stageTitle(s))}</th>`).join("")}
          </tr>
          <tr>${stages.map(() => `<th>자주</th><th>순회</th>`).join("")}</tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}

function photoSection(detail: ReportDetail): string {
  if (detail.results.length === 0) return "";
  if (hasStageMeasurements(detail.results)) return stagePhotoSection(detail);
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
  // 차수별 표에 이미 외관이 들어가 있으면 종 차수 값만 다시 보여줄 필요가 없다.
  if (orderedStageInfos(detail).length > 0) return "";
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
  // 경도도 차수별 표에 열로 들어간다.
  if (orderedStageInfos(detail).length > 0) return "";
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

// 통합 보고서에서 단수 inspectionLabel 은 종 차수 값이라, 그대로 쓰면 초·중이
// 함께 담긴 보고서가 "종물"로만 보인다. 차수가 여럿이면 묶음임을 드러낸다.
function inspectionLabelText(detail: ReportDetail): string {
  const stages = orderedStageInfos(detail);
  if (stages.length > 1) {
    return `${stages.map(stageTitle).join(" · ")} 통합`;
  }
  return detail.inspectionLabel;
}

function buildHtml(detail: ReportDetail): string {
  // 차수 열이 붙은 통합 보고서는 표가 넓어 A4 세로로는 잘린다.
  const wide =
    hasStageMeasurements(detail.results) || orderedStageInfos(detail).length > 1;
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
  ${wide ? "@page { size: A4 landscape; }" : ""}
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
    <div><span class="label">검사 차수</span> ${escapeHtml(inspectionLabelText(detail))}</div>
    <div><span class="label">자주검사</span> ${escapeHtml(detail.productionName)}</div>
    <div><span class="label">순회검사</span> ${escapeHtml(detail.qualityName)}</div>
    <div><span class="label">승인자</span> ${escapeHtml(detail.approvedByName)}</div>
    <div><span class="label">대상일</span> ${escapeHtml(detail.targetDate)}</div>
  </div>

  ${sketchSection(detail)}
  ${stagesSection(detail)}
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
