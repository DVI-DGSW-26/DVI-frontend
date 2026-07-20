import type { AdminInspection } from "../../admin-inspection/api/types";
import type { InspectionSlot } from "../../inspection/type/types";

// 한 칸의 상태. NONE 은 "아직 기록이 없는 시점"(미시작).
export type CellStatus =
  | "COMPLETED"
  | "DRAFT"
  | "SKIPPED"
  | "INCOMPLETE"
  | "INCOMPLETE_APPROVED"
  | "NONE";

export interface ProgressCell {
  /** 슬롯 코드 (DAY_1 등). */
  type: string;
  /** 표시 라벨 — "초/중/종" 또는 "08:00". */
  label: string;
  status: CellStatus;
}

export interface ProgressRow {
  key: string;
  workerName: string;
  productName: string;
  equipmentName: string;
  cells: ProgressCell[];
  /** 종결된 시점 수 (완료 + 건너뜀 + 미완료승인) — 진행률 표시용. */
  settled: number;
  /** 지금 진행중(DRAFT)인 시점이 있는지. */
  active: boolean;
}

/**
 * GET /inspection/all?date=오늘 + GET /inspection/slots 를 합쳐
 * "작업자 × 제품·설비" 한 줄마다 시점별 진행 상태를 만든다.
 *
 * 검사 기록은 진행된 시점에만 존재하므로, 슬롯 목록을 기준으로 놓고 기록을 얹는다.
 * 기록이 없는 시점이 곧 미시작(NONE).
 */
export function buildProgressRows(
  inspections: AdminInspection[],
  slotsByProcess: Record<string, InspectionSlot[] | undefined>,
): ProgressRow[] {
  // 작업자·제품·설비가 같으면 한 줄. 같은 조합에 여러 시점 기록이 붙는다.
  const groups = new Map<string, AdminInspection[]>();
  for (const ins of inspections) {
    const worker = ins.production?.name ?? "미배정";
    const key = `${worker}|${ins.product.id}|${ins.equipment.id}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(ins);
    else groups.set(key, [ins]);
  }

  const rows: ProgressRow[] = [];

  for (const [key, group] of groups) {
    const first = group[0];
    const slots = slotsByProcess[first.product.process];
    // 슬롯을 아직 못 받았으면 이 줄은 그릴 수 없다 (칸 개수를 모름).
    if (!slots || slots.length === 0) continue;

    // 한 시점에 기록이 여러 개일 수 있다(재검사 등). 가장 최근 것이 현재 상태.
    const latestByType = new Map<string, AdminInspection>();
    for (const ins of group) {
      const prev = latestByType.get(ins.type);
      if (!prev || recordTs(ins) > recordTs(prev)) latestByType.set(ins.type, ins);
    }

    const cells: ProgressCell[] = slots.map((slot) => ({
      type: slot.type,
      label: slot.label || slot.type,
      status: (latestByType.get(slot.type)?.status as CellStatus) ?? "NONE",
    }));

    rows.push({
      key,
      workerName: first.production?.name ?? "미배정",
      productName: first.product.name,
      equipmentName: first.equipment.name,
      cells,
      settled: cells.filter(
        (c) =>
          c.status === "COMPLETED" ||
          c.status === "SKIPPED" ||
          c.status === "INCOMPLETE_APPROVED",
      ).length,
      active: cells.some((c) => c.status === "DRAFT"),
    });
  }

  // 지금 작업중인 줄을 맨 위로, 그다음 남은 시점이 많은(뒤처진) 순.
  // 벽에서 먼저 봐야 할 것이 위로 오게 한다.
  return rows.sort(
    (a, b) =>
      Number(b.active) - Number(a.active) ||
      a.settled / a.cells.length - b.settled / b.cells.length ||
      a.workerName.localeCompare(b.workerName),
  );
}

function recordTs(i: AdminInspection): number {
  const raw = i.updatedAt ?? i.completedAt ?? i.createdAt;
  const t = raw ? Date.parse(raw) : NaN;
  return Number.isNaN(t) ? i.inspectionId : t;
}
