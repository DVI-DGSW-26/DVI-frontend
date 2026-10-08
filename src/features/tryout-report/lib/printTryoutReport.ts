import i18n from "i18next";
import type { TryoutItem, TryoutOverallResult, TryoutReportDetail } from "../api/types";
import { toBackendImageUrl } from "../../../lib/imageUrl";
import { formatDateTime } from "../../../lib/datetime";
import { itemLabel, sheetItemLabel, stepLabel, stepSpans } from "../ui/components/labels";
import { compareItems, fixedSpecOf } from "./itemCatalog";
import { formatStandard } from "./standard";

// 시압 결과보고서 인쇄본 — 현장 엑셀 양식(압출 T/O 결과보고서)과 같은 12열 격자로 A4 가로 한 장.
//   열: 사전체크(순서·준비사항·OK,NG·문제점) | SPEC(순서·항목·단위·유사품 작업기준·SETT'NG·실측값) | 결과(OK/NG·문제점)
// 저장하지 않는 칸(당사형번, 온도/습도, 사전체크 결과, 유사품 품번, SETT'NG)도 양식대로 빈칸으로 그린다 —
// 출력해서 손으로 채우는 양식과 모양이 같아야 현장에서 그대로 쓴다.
// 새 창에 그려 브라우저 인쇄 창을 띄운다. "PDF로 저장"은 사용자가 인쇄 창에서 고른다.
// 문서 문구도 앱 언어(한/영)를 따른다. React 밖이라 싱글턴으로 푼다.

function escapeHtml(s: string | number | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface Photo {
  item: TryoutItem;
  caption: string;
}

const likeOf = (item: TryoutItem) => ({ itemType: item.itemType, dimNo: item.dimNo ?? null, dimName: item.dimName ?? null });

// 사진이 있는 에칭 행. 표 안에는 번호만 적고 사진은 다음 쪽에 크게 싣는다 —
// 표 칸 크기로는 에칭 패턴을 알아볼 수 없고, 1쪽이 A4 한 장을 넘지 않게 하려는 것.
function collectPhotos(sorted: TryoutItem[]): Photo[] {
  const t = i18n.getFixedT(null, "tryoutReport");
  return sorted
    .filter((item) => item.valueType === "PHOTO" && item.imageUrl)
    .map((item) => ({ item, caption: `${stepLabel(likeOf(item), t)} · ${itemLabel(likeOf(item), t)}` }));
}

function resultMark(result: TryoutItem["result"]): string {
  if (!result) return "";
  const t = i18n.getFixedT(null, "tryoutReport");
  return `<span class="${result === "OK" ? "ok" : "ng"}">${escapeHtml(t(`result.${result}`))}</span>`;
}

type PrintRow = { kind: "item"; item: TryoutItem; step: string } | { kind: "group"; label: string; step: string };

function bodyRows(sorted: TryoutItem[], photos: Photo[]): string {
  const t = i18n.getFixedT(null, "tryoutReport");
  const words = { max: t("standardWords.max"), min: t("standardWords.min") };
  const rows: PrintRow[] = [];
  for (const item of sorted) {
    const step = stepLabel(likeOf(item), t);
    if (item.itemType === "SCRAP_CUT_FRONT") rows.push({ kind: "group", label: t("sheet.scrapGroup"), step });
    rows.push({ kind: "item", item, step });
  }
  const spans = stepSpans(rows.map((r) => r.step));
  // 사전체크 칸: 1 금형, 2 소재 두 줄 아래는 열마다 한 칸으로 비워 둔다.
  const prep = [t("print.prepDie"), t("print.prepMaterial")];
  const restSpan = rows.length - prep.length;

  return rows
    .map((row, i) => {
      const left =
        i < prep.length
          ? `<td class="c">${i + 1}</td><td class="c">${escapeHtml(prep[i])}</td><td></td><td></td>`
          : i === prep.length && restSpan > 0
            ? `<td rowspan="${restSpan}"></td>`.repeat(4)
            : "";
      const step = spans[i] > 0 ? `<td class="c" rowspan="${spans[i]}">${escapeHtml(row.step)}</td>` : "";
      if (row.kind === "group") {
        return `<tr>${left}${step}<td colspan="3" class="c">${escapeHtml(row.label)}</td><td></td><td></td><td></td><td></td></tr>`;
      }
      const item = row.item;
      const standard =
        item.valueType === "NUMBER"
          ? formatStandard(
              {
                standardValue: item.standardValue ?? null,
                toleranceLower: item.toleranceLower ?? null,
                toleranceUpper: item.toleranceUpper ?? null,
              },
              words,
            )
          : t("form.goodStandard");
      const photoNo = photos.findIndex((p) => p.item === item) + 1;
      const measured =
        item.valueType === "PHOTO"
          ? photoNo > 0
            ? `<span class="ref">${escapeHtml(t("print.photoRef", { n: photoNo }))}</span>`
            : ""
          : item.valueType === "NUMBER"
            ? escapeHtml(item.measuredValue)
            : "";
      const ng = item.result === "NG" ? ' class="ng-cell"' : "";
      return `<tr>${left}${step}
        <td class="c">${escapeHtml(sheetItemLabel(likeOf(item), t))}</td>
        <td class="c">${escapeHtml(item.unit || fixedSpecOf(item.itemType)?.unit || "")}</td>
        <td class="c">${escapeHtml(standard)}</td>
        <td></td>
        <td class="c">${measured}</td>
        <td${ng}><div class="c">${resultMark(item.result)}</div></td>
        <td${ng}><div class="note">${escapeHtml(item.note)}</div></td>
      </tr>`;
    })
    .join("");
}

function photoPage(r: TryoutReportDetail, photos: Photo[]): string {
  if (photos.length === 0) return "";
  const t = i18n.getFixedT(null, "tryoutReport");
  const figures = photos
    .map(
      (p, i) => `<figure>
        <figcaption><b>${escapeHtml(t("print.photoRef", { n: i + 1 }))}</b> ${escapeHtml(p.caption)} ${resultMark(p.item.result)}</figcaption>
        <div class="frame"><img src="${escapeHtml(toBackendImageUrl(p.item.imageUrl))}" alt="${escapeHtml(p.caption)}" /></div>
        ${p.item.note ? `<p class="note">${escapeHtml(p.item.note)}</p>` : ""}
      </figure>`,
    )
    .join("");
  return `<section class="photos">
    <h2>${escapeHtml(t("roundTitle", { n: r.roundNo }))} · ${escapeHtml(r.productCode)} — ${escapeHtml(t("print.photoTitle"))}</h2>
    <div class="figures">${figures}</div>
  </section>`;
}

function buildHtml(r: TryoutReportDetail): string {
  const t = i18n.getFixedT(null, "tryoutReport");
  const sorted = [...r.items].sort(compareItems);
  const photos = collectPhotos(sorted);
  const mark = (o: TryoutOverallResult) =>
    `<span class="check${r.overallResult === o ? " on" : ""}">${r.overallResult === o ? "■" : "□"} ${escapeHtml(t(`overall.${o}`))}</span>`;
  const attendees = r.attendees.map((a) => a.name).join(", ");
  const L = (key: string) => escapeHtml(t(key));

  return `<!doctype html>
<html lang="${i18n.language.startsWith("ko") ? "ko" : "en"}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(t("print.fileName", { code: r.productCode, n: r.roundNo, date: r.conductedOn }))}</title>
<style>
  * { box-sizing: border-box; }
  /* 페이지 여백을 0 으로 두어야 브라우저가 여백에 찍는 머리글·바닥글(about:blank, 날짜)이 사라진다.
     양식 여백은 본문 안쪽 여백으로 준다. */
  @page { size: A4 landscape; margin: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    color: #111;
    margin: 24px;
    font-size: 9.5px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  td { border: 1px solid #333; padding: 3px 4px; height: 19px; vertical-align: middle; word-break: keep-all; overflow-wrap: anywhere; }
  .title { font-size: 17px; font-weight: 700; text-align: center; letter-spacing: 1px; }
  .sec { font-weight: 600; }
  .c { text-align: center; }
  .note { white-space: pre-wrap; }
  .check { display: inline-block; margin: 0 8px; white-space: nowrap; }
  .check.on { font-weight: 700; }
  .ok { color: #15803D; font-weight: 700; }
  .ng { color: #B91C1C; font-weight: 700; }
  .ref { font-size: 9.5px; color: #444; }
  .ng-cell { background: #FFF5F5; }
  tr { break-inside: avoid; }
  .photos { break-before: page; }
  .photos h2 { font-size: 13px; margin: 0 0 8px; }
  .figures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  figure { margin: 0; border: 1px solid #333; padding: 6px; break-inside: avoid; }
  figcaption { font-size: 11px; margin-bottom: 4px; }
  .frame { height: 150mm; display: flex; align-items: center; justify-content: center; background: #FAFAFA; }
  .frame img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .frame .broken { color: #B91C1C; font-size: 11px; }
  figure .note { margin: 4px 0 0; white-space: pre-wrap; }
  .footer { margin-top: 6px; color: #666; font-size: 9px; text-align: right; }
  @media print { body { margin: 0; padding: 10mm; } }
</style>
</head>
<body>
  <table class="form">
    <colgroup>
      <col style="width:4.5%" /><col style="width:8%" /><col style="width:5.5%" /><col style="width:9%" />
      <col style="width:6%" /><col style="width:11%" /><col style="width:5%" /><col style="width:10%" />
      <col style="width:8%" /><col style="width:6.5%" /><col style="width:6%" /><col />
    </colgroup>
    <tr>
      <td class="c">${L("form.customer")}</td>
      <td colspan="3">${escapeHtml(r.customerName)}</td>
      <td class="c" rowspan="2">${L("print.vendorPartNo")}</td>
      <td colspan="7" class="title">${escapeHtml(t("print.roundTitle", { n: r.roundNo }))}</td>
    </tr>
    <tr>
      <td class="c">${L("form.product")}</td>
      <td>${escapeHtml(r.productCode)}</td>
      <td class="c">${L("form.productName")}</td>
      <td>${escapeHtml(r.productName)}</td>
      <td class="c">${L("print.writtenOn")}</td>
      <td colspan="4">${escapeHtml(r.conductedOn)}</td>
      <td class="c">${L("form.author")}</td>
      <td>${escapeHtml(r.author?.name)}</td>
    </tr>
    <tr>
      <td class="c" rowspan="4">${L("print.conductedAt")}</td>
      <td class="c" rowspan="4">${escapeHtml(r.conductedOn)}</td>
      <td class="c" rowspan="4">${L("print.ambient")}</td>
      <td class="c">${L("print.temperature")}</td>
      <td class="c">${L("form.manager")}</td>
      <td class="c">${L("form.attendees")}</td>
      <td colspan="4" rowspan="4">${escapeHtml(attendees)}</td>
      <td class="c" rowspan="4">${L("form.overall")}</td>
      <td rowspan="2" class="c">${mark("OK")}${mark("NG")}</td>
    </tr>
    <tr>
      <td></td>
      <td class="c" rowspan="3">( ${escapeHtml(r.manager?.name ?? "")} )</td>
      <td rowspan="3"></td>
    </tr>
    <tr>
      <td class="c">${L("print.humidity")}</td>
      <td rowspan="2" class="c">${mark("SPECIAL_ACCEPT")}${mark("REWORK")}</td>
    </tr>
    <tr>
      <td></td>
    </tr>
    <tr>
      <td colspan="4" class="c sec">${L("print.precheck")}</td>
      <td colspan="6" class="c sec">${L("sheet.specSection")}</td>
      <td colspan="2" class="c sec">${L("sheet.resultSection")}</td>
    </tr>
    <tr>
      <td class="c" rowspan="2">${L("columns.step")}</td>
      <td class="c" rowspan="2">${L("print.prepItem")}</td>
      <td class="c" colspan="2">${L("print.checkResult")}</td>
      <td class="c" rowspan="2">${L("columns.step")}</td>
      <td class="c" rowspan="2">${L("columns.item")}</td>
      <td class="c" rowspan="2">${L("columns.unit")}</td>
      <td class="c" rowspan="2">${L("print.similarStandard")}<br />(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</td>
      <td class="c" rowspan="2">${L("print.setting")}</td>
      <td class="c" rowspan="2">${L("columns.measured")}</td>
      <td class="c" rowspan="2">${L("columns.result")}</td>
      <td class="c" rowspan="2">${L("columns.note")}</td>
    </tr>
    <tr>
      <td class="c">${L("print.okNg")}</td>
      <td class="c">${L("print.checkNote")}</td>
    </tr>
    ${bodyRows(sorted, photos)}
  </table>

  <div class="footer">${escapeHtml(t("print.printedAt", { at: formatDateTime(new Date().toISOString()) }))}</div>

  ${photoPage(r, photos)}

  <script>
    // 사진이 모두 로드된 뒤 인쇄해야 PDF 에 사진이 들어간다.
    window.onload = function () {
      var imgs = Array.prototype.slice.call(document.images);
      var remaining = imgs.length;
      function go() { setTimeout(function () { window.print(); }, 200); }
      if (remaining === 0) return go();
      function done() { if (--remaining <= 0) go(); }
      function broken(img) {
        var p = document.createElement("span");
        p.className = "broken";
        p.textContent = ${JSON.stringify(t("print.photoFailed"))};
        img.replaceWith(p);
        done();
      }
      imgs.forEach(function (img) {
        if (img.complete) return img.naturalWidth > 0 ? done() : broken(img);
        img.addEventListener("load", done);
        img.addEventListener("error", function () { broken(img); });
      });
    };
  </script>
</body>
</html>`;
}

/** 상세 화면에서 이미 받은 보고서를 인쇄 창으로 띄운다. 클릭 처리 안에서 바로 불러야 팝업이 막히지 않는다. */
export function printTryoutReport(report: TryoutReportDetail): void {
  const w = window.open("", "_blank");
  if (!w) {
    alert(i18n.t("tryoutReport:print.popupBlocked"));
    return;
  }
  w.document.open();
  w.document.write(buildHtml(report));
  w.document.close();
  w.focus();
}
