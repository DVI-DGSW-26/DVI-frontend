export type Decision = "APPROVE";

export type InspectionType = "DAY_1" | "DAY_2" | "DAY_3" | "DAY_4" | "DAY_5";

export type Process = "INOUT" | string;

export interface IncompleteProduct {
  id: number;
  name: string;
  code: string;
  process: Process;
  sketchUrl: string;
}

export interface IncompleteEquipment {
  id: number;
  name: string;
  process: Process;
}

export interface IncompleteProduction {
  id: number;
  name: string;
}

export interface Incomplete {
  inspectionId: number;
  orderId: number;
  type: InspectionType;
  typeLabel: string;
  inspectionTime: string;
  product: IncompleteProduct;
  equipment: IncompleteEquipment;
  production: IncompleteProduction;
  incompleteReason: string;
  // 사유를 적은 사람 — 자주검사자 본인이거나 대신 적은 순회검사자. 모르면 null.
  incompleteReasonByName?: string | null;
  createdAt: string;
}

// GET /incomplete/missed 한 줄 = 끝나지 않은 검사 시점 하나.
// - NOT_STARTED: 시작 안 함(예정 시각 전 시점도 포함 — scheduledAt 참고). inspectionId 없음
// - INCOMPLETE: 미완료 제출. reason 이 null 이면 사유 대기, 있으면 품질관리자 승인 대기
// - INCOMPLETE_APPROVED / SKIPPED: 종결
// 사유 작성은 INCOMPLETE 만 가능하다(PATCH /incomplete/{id}/reason).
export type MissedKind =
  | "NOT_STARTED"
  | "INCOMPLETE"
  | "INCOMPLETE_APPROVED"
  | "SKIPPED";

export interface MissedInspection {
  kind: MissedKind;
  orderId: number;
  // 작업지시 검사일(YYYY-MM-DD)
  targetDate: string;
  orderShift: "DAY" | "NIGHT" | null;
  type: string;
  typeLabel: string | null;
  slotOrder: number | null;
  // 시각 없는 시점(압출·ST절단 초·중·종 등)은 null
  slotTime: string | null;
  scheduledAt: string | null;
  product: IncompleteProduct;
  equipment: IncompleteEquipment;
  workerNames: string[];
  inspectionId: number | null;
  productionName: string | null;
  reason: string | null;
  reasonByName: string | null;
  updatedAt: string | null;
}
