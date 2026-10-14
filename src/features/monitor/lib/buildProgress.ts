import type { AdminInspection } from "../../admin-inspection/api/types";
import type { InspectionSlot } from "../../inspection/type/types";
import {
  isLiveCrossCheck,
  type MonitorCrossCheck,
  type MonitorCrossCheckStatus,
  type MonitorLiveCrossCheckStatus,
  type MonitorScheduleOrder,
} from "../type/types";

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
  /**
   * 진행중 순회검사가 걸린 칸. 스냅샷의 상태를 그대로 쓰되 진행중인 셋만이다 —
   * 끝난 건(COMPLETED·APPROVED)도 스냅샷에 오지만 칸에서는 CHECKED 로 접는다.
   * 여기에 서버 상태를 통째로 들이면 화면이 모르는 키가 섞여 들어온다.
   */
  | MonitorLiveCrossCheckStatus
  /** 서버가 hasCrossCheck 를 안 내려줌 — 없다고 단정하지 않는다. */
  | "UNKNOWN";

/**
 * 손이 가야 하는 순서 — 반려 > 승인대기 > 작성중. 줄 정렬과 목록 정렬에 공용.
 * 끝난 건은 급할 것이 없어 맨 뒤다. 다섯 상태를 모두 적어 둬야 조회가 undefined 로
 * 빠지지 않는다 — Math.min(x, undefined) 는 NaN 이라 정렬이 통째로 어긋난다.
 */
export const CROSS_CHECK_URGENCY: Record<MonitorCrossCheckStatus, number> = {
  REJECTED: 0,
  PENDING_APPROVAL: 1,
  DRAFT: 2,
  COMPLETED: 3,
  APPROVED: 3,
};

export interface ProgressCell {
  /** 슬롯 코드 (DAY_1 등). */
  type: string;
  /** 이 시점의 자주검사 id — 기록이 없는 시점(미시작)은 null. 건너뜀 사유 조회에 쓴다. */
  inspectionId: number | null;
  /** 표시 라벨 — "초/중/종" 또는 "08:00". */
  label: string;
  /**
   * 슬롯 예정 시각(HH:mm). 초/중/종처럼 시각이 없는 슬롯은 null —
   * 비교할 시각이 없으므로 지연 판정 대상이 아니다.
   */
  time: string | null;
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
 * GET /inspection/all?date=오늘 + 칸 구성(GET /monitor/schedule, 없으면 GET /inspection/slots)
 * + 모니터 스냅샷의 순회검사를 합쳐 "작업자 × 작업지시" 한 줄마다 시점별 진행 상태를 만든다.
 *
 * 검사 기록은 진행된 시점에만 존재하므로, 칸 목록을 기준으로 놓고 기록을 얹는다.
 * 기록이 없는 시점이 곧 미시작(NONE).
 */
export function buildProgressRows(
  inspections: AdminInspection[],
  slotsByProcess: Record<string, InspectionSlot[] | undefined>,
  crossChecks: MonitorCrossCheck[] = [],
  /** 담당 작업자가 없는 줄의 표시 이름 — 호출부가 번역해서 넘긴다. */
  unassignedLabel = "미배정",
  /** GET /monitor/schedule 의 작업지시 행 — 줄의 칸 구성을 여기서 가져온다. */
  scheduleOrders: MonitorScheduleOrder[] = [],
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

  // 작업자·작업지시가 같으면 한 줄. 같은 조합에 여러 시점 기록이 붙는다.
  // 작업지시가 제품·설비·교대를 정하므로, 같은 사람이 주간·야간 지시를 다 맡으면 두 줄이 된다.
  const groups = new Map<string, AdminInspection[]>();
  for (const ins of inspections) {
    const worker = ins.production?.name ?? unassignedLabel;
    const key = `${worker}|${ins.orderId}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(ins);
    else groups.set(key, [ins]);
  }

  const rows: ProgressRow[] = [];

  const scheduleByOrder = new Map(
    scheduleOrders.map((o) => [o.orderId, o] as const),
  );

  for (const [key, group] of groups) {
    const first = group[0];

    // 한 시점에 기록이 여러 개일 수 있다(재검사 등). 가장 최근 것이 현재 상태.
    const latestByType = new Map<string, AdminInspection>();
    for (const ins of group) {
      const prev = latestByType.get(ins.type);
      if (!prev || recordTs(ins) > recordTs(prev)) latestByType.set(ins.type, ins);
    }

    const defs =
      scheduleCells(scheduleByOrder.get(first.orderId), latestByType) ??
      processCells(slotsByProcess[first.product.process], first, latestByType);
    // 칸 구성을 아직 못 받았으면 이 줄은 그릴 수 없다 (칸 개수를 모름).
    if (!defs || defs.length === 0) continue;

    const cells: ProgressCell[] = defs.map(({ type, label, time, rec }) => {
      const status = (rec?.status as CellStatus) ?? "NONE";
      const live = rec ? (liveByInspection.get(rec.inspectionId) ?? null) : null;
      return {
        type,
        inspectionId: rec?.inspectionId ?? null,
        label,
        time,
        status,
        cross: crossCellStatus(status, rec?.hasCrossCheck, live),
        crossCheck: live,
      };
    });

    rows.push({
      key,
      workerName: first.production?.name ?? unassignedLabel,
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
      // 결재만 남은 시점(승인대기)도 순회검사 자체는 끝났다 — 진행 비율에서는 끝난
      // 것으로 센다. 화면에서도 완료와 같은 칸으로 그린다.
      crossChecked: cells.filter(
        (c) => c.cross === "CHECKED" || c.cross === "PENDING_APPROVAL",
      ).length,
      crossWaiting: cells.filter((c) => c.cross === "WAITING").length,
      crossLive: cells.filter(
        (c) => c.crossCheck && isLiveCrossCheck(c.crossCheck.status),
      ).length,
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

/** 한 칸의 뼈대 — 칸 목록 출처와 무관하게 같은 모양으로 맞춘다. */
interface CellDef {
  /** 슬롯 코드. schedule 칸은 코드가 없어 기록이 없으면 "#순서"로 둔다(렌더 key 용). */
  type: string;
  label: string;
  time: string | null;
  rec: AdminInspection | undefined;
}

/**
 * 작업지시의 실제 슬롯 칸(GET /monitor/schedule). 제품별 템플릿과 교대가 반영돼 있다.
 *
 * 이 응답의 칸에는 슬롯 코드가 없어 기록과는 라벨로 맞춘다 — 한 작업지시 안에서
 * 라벨은 겹치지 않는다. 기록 하나라도 칸을 못 찾으면 칸 구성이 어긋난 것이라 null 을
 * 돌려 공정 슬롯으로 그리게 한다. 기록을 빠뜨린 채 그리는 것보다 낫다.
 */
function scheduleCells(
  order: MonitorScheduleOrder | undefined,
  latestByType: Map<string, AdminInspection>,
): CellDef[] | null {
  if (!order || order.slots.length === 0) return null;
  const byLabel = new Map<string, AdminInspection>();
  for (const rec of latestByType.values()) {
    if (!order.slots.some((s) => s.label === rec.typeLabel)) return null;
    byLabel.set(rec.typeLabel, rec);
  }
  return order.slots.map((slot) => {
    const rec = byLabel.get(slot.label);
    return {
      type: rec?.type ?? `#${slot.slotOrder}`,
      label: slot.label,
      time: slot.time ?? null,
      rec,
    };
  });
}

/**
 * 공정 기본 슬롯(GET /inspection/slots) — schedule 을 못 받았거나 맞지 않을 때의 대안.
 *
 * 공정 템플릿 전체라 주간·야간이 함께 온다. 줄의 교대 칸만 남긴다 — 안 거르면 주간
 * 줄에 야간 칸이 붙어 남은 시점·지연이 부풀려진다. 교대를 모르는 줄은 거르지 않는다.
 * 제품별 템플릿이 있는 제품은 칸 구성이 실제와 다를 수 있다.
 */
function processCells(
  slots: InspectionSlot[] | undefined,
  first: AdminInspection,
  latestByType: Map<string, AdminInspection>,
): CellDef[] | null {
  if (!slots) return null;
  return slots
    .filter((s) => !first.shift || !s.shift || s.shift === first.shift)
    .map((slot) => ({
      type: slot.type,
      label: slot.label || slot.type,
      time: slot.time ?? null,
      rec: latestByType.get(slot.type),
    }));
}

/** 줄에 걸린 진행중 순회검사 중 가장 급한 것. 하나도 없으면 맨 뒤. */
function crossUrgency(row: ProgressRow): number {
  let best = Number.MAX_SAFE_INTEGER;
  for (const c of row.cells) {
    // 끝난 건은 줄을 끌어올리지 않는다 — 급한 줄만 위로 올라와야 한다.
    if (c.crossCheck && isLiveCrossCheck(c.crossCheck.status)) {
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
  // 끝난 건도 스냅샷에 오므로(오늘자) 상태를 그대로 쓰면 안 된다 — 칸이 아는
  // 셋만 통과시키고 나머지는 '완료'로 접는다.
  if (live) return isLiveCrossCheck(live.status) ? live.status : "CHECKED";
  // 스냅샷엔 없는데 기록은 있다 = 오늘자가 아닌 이미 끝난 순회검사.
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
