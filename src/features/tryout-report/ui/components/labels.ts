import type { TFunction } from "i18next";
import type { TryoutItemType } from "../../api/types";
import { fixedSpecOf } from "../../lib/itemCatalog";

interface RowLike {
  itemType: TryoutItemType;
  dimNo: number | null;
  dimName: string | null;
}

// 순서 칸 문구 — "예열 1", "DIM'S 3". 같은 문구가 이어지면 표에서 한 칸으로 합친다.
export function stepLabel(row: RowLike, t: TFunction<"tryoutReport">): string {
  if (row.itemType === "DIM") return t("steps.dim", { n: row.dimNo ?? "" });
  const spec = fixedSpecOf(row.itemType);
  return spec ? t(`steps.${spec.stepKey}`) : "";
}

// 항목 칸 문구 — 치수 행은 제품에 등록된 치수 이름.
export function itemLabel(row: RowLike, t: TFunction<"tryoutReport">): string {
  if (row.itemType === "DIM") {
    return row.dimName?.trim() || t("items.dimFallback", { n: row.dimNo ?? "" });
  }
  return t(`items.${row.itemType}`);
}

// 양식(엑셀) 표기 그대로의 항목 칸 — SCRAP 은 "SCRAP 절단길이" 묶음 줄 아래 전반부·후반부로,
// 외관은 점검 내용으로 적는다. 입력 표와 인쇄본이 같이 쓴다.
export function sheetItemLabel(row: RowLike, t: TFunction<"tryoutReport">): string {
  if (row.itemType === "SCRAP_CUT_FRONT") return t("sheet.scrapFront");
  if (row.itemType === "SCRAP_CUT_REAR") return t("sheet.scrapRear");
  if (row.itemType === "APPEARANCE") return t("sheet.appearanceItem");
  return itemLabel(row, t);
}

/** 순서 칸 rowSpan — 같은 순서 문구가 이어지는 첫 행에 개수, 나머지는 0(그리지 않음). */
export function stepSpans(labels: string[]): number[] {
  const spans = labels.map(() => 0);
  for (let i = 0; i < labels.length; ) {
    let j = i + 1;
    while (j < labels.length && labels[j] === labels[i]) j++;
    spans[i] = j - i;
    i = j;
  }
  return spans;
}
