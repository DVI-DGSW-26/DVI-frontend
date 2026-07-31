import type { AdminInspection } from "../../admin-inspection/api/types";
import type { InspectionSlot } from "../../inspection/type/types";
import type { MonitorCrossCheck, MonitorCrossCheckStatus } from "../type/types";

// 한 칸의 상태. NONE 은 "아직 기록이 없는 시점"(미시작).
export type CellStatus =
  | "COMPLETED"
  | "DRAFT"
  | "SKIPPED"
  | "INCOMPLETE"
  | "INCOMPLETE_APPROVED"
  | "NONE";

/**
 * 한 시점의 순회검사 쪽 상태.
 *
 * 진행중 순회검사는 스냅샷(SSE)에서 `inspectionId` 로 그 시점의 자주검사에 정확히
 * 붙으므로, 그때는 순회검사 상태(작성중·승인대기·반려)를 그대로 칸에 쓴다.
 * 스냅샷에 없는 건 = 이미 끝난 순회검사라, 자주검사의 `hasCrossCheck` 로 판정한다.
 */
export type CrossCellStatus =
  /** 자주검사가 아직 안 끝나 순회 대상이 아님. */
  | "NA"
  /** 자주검사는 끝났는데 순회검사가 아직 안 붙음 — 순회검사자를 기다리는 칸. */
  | "WAITING"
  /** 순회검사가 끝남 — 스냅샷엔 없고 기록만 남은 상태. */
  | "CHECKED"
  /** 진행중 순회검사가 걸린 칸 — 스냅샷의 상태를 그대로 쓴다. */
  | MonitorCrossCheckStatus
  /** 서버가 hasCrossCheck 를 안 내려줌 — 없다고 단정하지 않는다. */
  | "UNKNOWN";

/** 손이 가야 하는 순서 — 반려 > 승인대기 > 작성중. 줄 정렬과 목록 정렬에 공용. */
export const CROSS_CHECK_URGENCY: Record<MonitorCrossCheckStatus, number> = {
  REJECTED: 0,
  PENDING_APPROVAL: 1,
  DRAFT: 2,
};

export interface ProgressCell {
  /** 슬롯 코드 (DAY_1 등). */
  type: string;
  /** 표시 라벨 — "초/중/종" 또는 "08:00". */
  label: string;
  status: CellStatus;
  cross: CrossCellStatus;
  /** 이 시점에 걸린 진행중 순회검사 — 검사자·경과처럼 칸에 안 들어가는 정보용. */
  crossCheck: MonitorCrossCheck | null;
}

export interface ProgressRow {
  key: string;
  workerName: string;
  productName: string;
  equipmentName: string;
  cells: ProgressCell[];
  /** 종결된 시점 수 (완료 + 건너뜀 + 미완료승인) — 진행률 표시용. */
  settled: number;
  /** 실제로 검사한 시점 수. 전부 건너뛴 줄을 "완료"로 오인하지 않도록 따로 센다. */
  completed: number;
  /** 건너뛴 시점 수. */
  skipped: number;
  /** 순회검사가 끝난 시점 수. */
  crossChecked: number;
  /** 자주는 끝났는데 순회가 아직 안 붙은 시점 수 — 순회검사자가 가야 할 곳. */
  crossWaiting: number;
  /** 지금 순회검사가 진행중인 시점 수. */
  crossLive: number;
  /** 순회 대상인 시점 수 — 순회 진행률의 분모. */
  crossTarget: number;
  /** 지금 진행중(DRAFT)인 시점이 있는지. */
  active: boolean;
}

/**
 * GET /inspection/all?date=오늘 + GET /inspection/slots + 모니터 스냅샷의 순회검사를
 * 합쳐 "작업자 × 제품·설비" 한 줄마다 시점별 진행 상태를 만든다.
 *
 * 검사 기록은 진행된 시점에만 존재하므로, 슬롯 목록을 기준으로 놓고 기록을 얹는다.
 * 기록이 없는 시점이 곧 미시작(NONE).
 */
export function buildProgressRows(
  inspections: AdminInspection[],
  slotsByProcess: Record<string, InspectionSlot[] | undefined>,
  crossChecks: MonitorCrossCheck[] = [],
): ProgressRow[] {
  // 진행중 순회검사를 대상 자주검사 id 로 색인한다. 한 검사에 한 건이 정상이지만,
  // 겹쳐 오면 가장 최근 것을 그 칸의 상태로 본다.
  const liveByInspection = new Map<number, MonitorCrossCheck>();
  for (const cc of crossChecks) {
    const prev = liveByInspection.get(cc.inspectionId);
    if (!prev || Date.parse(cc.updatedAt) > Date.parse(prev.updatedAt)) {
      liveByInspection.set(cc.inspectionId, cc);
    }
  }

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

    const cells: ProgressCell[] = slots.map((slot) => {
      const rec = latestByType.get(slot.type);
      const status = (rec?.status as CellStatus) ?? "NONE";
      const live = rec ? (liveByInspection.get(rec.inspectionId) ?? null) : null;
      return {
        type: slot.type,
        label: slot.label || slot.type,
        status,
        cross: crossCellStatus(status, rec?.hasCrossCheck, live),
        crossCheck: live,
      };
    });

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
      completed: cells.filter(
        (c) => c.status === "COMPLETED" || c.status === "INCOMPLETE_APPROVED",
      ).length,
      skipped: cells.filter((c) => c.status === "SKIPPED").length,
      crossChecked: cells.filter((c) => c.cross === "CHECKED").length,
      crossWaiting: cells.filter((c) => c.cross === "WAITING").length,
      crossLive: cells.filter((c) => c.crossCheck).length,
      crossTarget: cells.filter((c) => c.cross !== "NA").length,
      active: cells.some((c) => c.status === "DRAFT"),
    });
  }

  // 손이 가야 하는 순회검사(반려·승인대기)가 걸린 줄을 맨 위로, 그다음 지금 작업중인
  // 줄, 그다음 남은 시점이 많은(뒤처진) 순. 벽에서 먼저 봐야 할 것이 위로 오게 한다.
  return rows.sort(
    (a, b) =>
      crossUrgency(a) - crossUrgency(b) ||
      Number(b.active) - Number(a.active) ||
      a.settled / a.cells.length - b.settled / b.cells.length ||
      a.workerName.localeCompare(b.workerName),
  );
}

/** 줄에 걸린 진행중 순회검사 중 가장 급한 것. 하나도 없으면 맨 뒤. */
function crossUrgency(row: ProgressRow): number {
  let best = Number.MAX_SAFE_INTEGER;
  for (const c of row.cells) {
    if (c.crossCheck) {
      best = Math.min(best, CROSS_CHECK_URGENCY[c.crossCheck.status]);
    }
  }
  return best;
}

/**
 * 진행중 순회검사가 걸려 있으면 그 상태가 곧 이 칸의 상태다 — 반려되면 자주검사가
 * COMPLETED→DRAFT 로 되돌아가므로, 자주검사 상태만 보면 "대상 아님"으로 잘못 읽힌다.
 */
function crossCellStatus(
  status: CellStatus,
  hasCrossCheck: boolean | undefined,
  live: MonitorCrossCheck | null,
): CrossCellStatus {
  if (live) return live.status;
  // 스냅샷엔 없는데 기록은 있다 = 이미 끝난 순회검사.
  if (hasCrossCheck) return "CHECKED";
  // 순회검사는 자주검사가 끝난 시점에만 붙는다 — 그 전엔 "대상 아님".
  if (status !== "COMPLETED" && status !== "INCOMPLETE_APPROVED") return "NA";
  return hasCrossCheck === undefined ? "UNKNOWN" : "WAITING";
}

function recordTs(i: AdminInspection): number {
  const raw = i.updatedAt ?? i.completedAt ?? i.createdAt;
  const t = raw ? Date.parse(raw) : NaN;
  return Number.isNaN(t) ? i.inspectionId : t;
}
