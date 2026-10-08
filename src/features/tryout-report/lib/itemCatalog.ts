import type { TryoutItemType } from "../api/types";

// 고정 공정 항목 15행. 서버는 이름·순서 라벨·단위를 주지 않으므로 화면이 들고 있다.
// 순서는 종이 양식(압출 T/O 결과보고서) 그대로.
//   stepKey — tryoutReport:steps.* (예열 1, 압출 3 …). 같은 stepKey 가 이어지면 한 칸으로 묶는다.
//   unit — 서버가 주지 않을 때 쓰는 단위. 저장할 때 함께 보낸다.
export interface FixedItemSpec {
  itemType: Exclude<TryoutItemType, "DIM">;
  stepKey: string;
  unit: string;
}

export const FIXED_ITEMS: readonly FixedItemSpec[] = [
  { itemType: "BILLET_PREHEAT_TEMP", stepKey: "preheat1", unit: "℃" },
  { itemType: "DIE_PREHEAT_TEMP", stepKey: "preheat2", unit: "℃" },
  { itemType: "CONTAINER_TEMP", stepKey: "extrusion1", unit: "℃" },
  { itemType: "RAM_SPEED", stepKey: "extrusion2", unit: "mm/sec" },
  { itemType: "EXIT_TEMP", stepKey: "extrusion3", unit: "℃" },
  { itemType: "QUENCH_TEMP", stepKey: "extrusion4", unit: "℃" },
  { itemType: "BUTT_LENGTH", stepKey: "extrusion5", unit: "mm" },
  { itemType: "STRETCH_TIME", stepKey: "straightening1", unit: "sec" },
  { itemType: "RELAX_TIME", stepKey: "straightening2", unit: "sec" },
  { itemType: "SCRAP_CUT_FRONT", stepKey: "cutting1", unit: "mm" },
  { itemType: "SCRAP_CUT_REAR", stepKey: "cutting1", unit: "mm" },
  { itemType: "PRODUCT_CUT_LENGTH", stepKey: "cutting2", unit: "mm" },
  { itemType: "ETCHING_JOINT_TEST", stepKey: "etching1", unit: "" },
  { itemType: "ETCHING_CORE_PATTERN", stepKey: "etching2", unit: "" },
  { itemType: "APPEARANCE", stepKey: "appearance", unit: "" },
];

const FIXED_BY_TYPE = new Map(FIXED_ITEMS.map((s) => [s.itemType, s]));

export function fixedSpecOf(itemType: TryoutItemType): FixedItemSpec | undefined {
  return itemType === "DIM" ? undefined : FIXED_BY_TYPE.get(itemType);
}

// 행 하나를 가리키는 키. 고정 항목은 itemType, 치수는 DIM 번호로 구분한다.
export function itemKey(itemType: TryoutItemType, dimNo?: number | null): string {
  return itemType === "DIM" ? `DIM-${dimNo ?? ""}` : itemType;
}

// 고정 항목 먼저(양식 순서), 이어서 치수 번호 순 — 서버도 이 순서로 주지만 화면에서 한 번 더 맞춘다.
export function compareItems(
  a: { itemType: TryoutItemType; dimNo?: number | null },
  b: { itemType: TryoutItemType; dimNo?: number | null },
): number {
  const rank = (x: typeof a) =>
    x.itemType === "DIM"
      ? FIXED_ITEMS.length + (x.dimNo ?? 0)
      : FIXED_ITEMS.findIndex((s) => s.itemType === x.itemType);
  return rank(a) - rank(b);
}
