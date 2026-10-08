import type {
  TryoutItem,
  TryoutItemRequest,
  TryoutItemResult,
  TryoutItemType,
  TryoutOverallResult,
  TryoutReportDetail,
  TryoutReportPrefill,
  TryoutValueType,
} from "../api/types";
import { compareItems, fixedSpecOf, itemKey } from "./itemCatalog";
import {
  toStandardDraft,
  toStandardValue,
  type StandardDraft,
  type StandardError,
} from "./standard";

// 작성/수정 화면 상태. 숫자 칸도 문자열로 들고 있다가 저장할 때 바꾼다 —
// "38 이하"의 하한(빈칸)과 상한(0)처럼 빈칸과 0 이 뜻이 다르다.
export interface ItemDraft {
  key: string;
  itemType: TryoutItemType;
  dimNo: number | null;
  dimName: string | null;
  valueType: TryoutValueType;
  unit: string;
  standard: StandardDraft;
  measured: string;
  // PASS_FAIL·PHOTO 행에서 사용자가 고른 값. 숫자 행은 화면에서 미리 판정해 보여 준다.
  result: TryoutItemResult | null;
  imageUrl: string | null;
  note: string;
}

export interface HeaderDraft {
  roundNo: string;
  conductedOn: string;
  managerId: number | null;
  attendeeIds: number[];
  overallResult: TryoutOverallResult | null;
}

export type ItemError = StandardError | "measuredInvalid";
export type HeaderError = "roundNoRequired" | "roundNoInvalid" | "conductedOnRequired";

// 서버가 valueType 을 빠뜨린 경우를 대비한 기본값 — 양식상 에칭은 사진, 외관은 OK/NG.
function defaultValueType(itemType: TryoutItemType): TryoutValueType {
  if (itemType === "ETCHING_JOINT_TEST" || itemType === "ETCHING_CORE_PATTERN") return "PHOTO";
  if (itemType === "APPEARANCE") return "PASS_FAIL";
  return "NUMBER";
}

function toItemDraft(item: TryoutItem): ItemDraft {
  return {
    key: itemKey(item.itemType, item.dimNo),
    itemType: item.itemType,
    dimNo: item.dimNo ?? null,
    dimName: item.dimName ?? null,
    valueType: item.valueType ?? defaultValueType(item.itemType),
    unit: item.unit || fixedSpecOf(item.itemType)?.unit || "",
    // 치수 행은 제품에 등록된 도면 값이 채워져 오고, 고정 행은 빈칸으로 온다.
    standard: toStandardDraft({
      standardValue: item.standardValue ?? null,
      toleranceLower: item.toleranceLower ?? null,
      toleranceUpper: item.toleranceUpper ?? null,
    }),
    measured: item.measuredValue == null ? "" : String(item.measuredValue),
    result: item.result ?? null,
    imageUrl: item.imageUrl ?? null,
    note: item.note ?? "",
  };
}

export function itemsFrom(source: TryoutReportPrefill | TryoutReportDetail): ItemDraft[] {
  return [...source.items].sort(compareItems).map(toItemDraft);
}

export function headerFromPrefill(p: TryoutReportPrefill): HeaderDraft {
  return {
    // 차수는 사람이 직접 적는다 — 추천 차수를 미리 채우면 확인 없이 저장되기 쉽다.
    roundNo: "",
    conductedOn: p.conductedOn,
    managerId: null,
    attendeeIds: [],
    overallResult: null,
  };
}

export function headerFromDetail(d: TryoutReportDetail): HeaderDraft {
  return {
    roundNo: String(d.roundNo),
    conductedOn: d.conductedOn,
    managerId: d.manager?.id ?? null,
    attendeeIds: d.attendees.map((a) => a.id),
    overallResult: d.overallResult,
  };
}

function parseMeasured(s: string): number | null | "invalid" {
  if (s.trim() === "") return null;
  const n = Number(s.trim());
  return Number.isFinite(n) ? n : "invalid";
}

/** 숫자 행의 작업기준·실측값 — 미리보기 판정과 저장이 같은 해석을 쓴다. */
export function readNumberRow(row: ItemDraft) {
  const standard = toStandardValue(row.standard);
  const measured = parseMeasured(row.measured);
  return { standard, measured };
}

function toItemRequest(row: ItemDraft): TryoutItemRequest | ItemError {
  const base: TryoutItemRequest = {
    itemType: row.itemType,
    ...(row.itemType === "DIM" && row.dimNo != null ? { dimNo: row.dimNo } : {}),
    note: row.note.trim() === "" ? null : row.note.trim(),
  };
  if (row.valueType === "PHOTO") {
    return { ...base, imageUrl: row.imageUrl, result: row.result };
  }
  if (row.valueType === "PASS_FAIL") {
    return { ...base, result: row.result };
  }
  const { standard, measured } = readNumberRow(row);
  if ("error" in standard) return standard.error;
  if (measured === "invalid") return "measuredInvalid";
  return {
    ...base,
    unit: row.unit || undefined,
    ...standard.value,
    measuredValue: measured,
  };
}

export function buildItems(
  rows: ItemDraft[],
): { items: TryoutItemRequest[] } | { errors: Record<string, ItemError> } {
  const items: TryoutItemRequest[] = [];
  const errors: Record<string, ItemError> = {};
  for (const row of rows) {
    const r = toItemRequest(row);
    if (typeof r === "string") errors[row.key] = r;
    else items.push(r);
  }
  return Object.keys(errors).length > 0 ? { errors } : { items };
}

export function validateHeader(h: HeaderDraft): Partial<Record<"roundNo" | "conductedOn", HeaderError>> {
  const errors: Partial<Record<"roundNo" | "conductedOn", HeaderError>> = {};
  const round = h.roundNo.trim();
  if (round === "") errors.roundNo = "roundNoRequired";
  else if (!/^\d+$/.test(round) || Number(round) < 1) errors.roundNo = "roundNoInvalid";
  if (h.conductedOn.trim() === "") errors.conductedOn = "conductedOnRequired";
  return errors;
}

export function headerToRequest(h: HeaderDraft) {
  return {
    roundNo: Number(h.roundNo.trim()),
    conductedOn: h.conductedOn,
    managerId: h.managerId,
    attendeeIds: h.attendeeIds,
    overallResult: h.overallResult,
  };
}
