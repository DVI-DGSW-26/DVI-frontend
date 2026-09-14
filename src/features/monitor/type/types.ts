import type { WorkType } from "../../auth/type/types";
import type { Shift } from "../../inspection-schedule/api";

// GET /monitor/snapshot, GET /monitor/stream (event: snapshot) 공통 페이로드.
// 부분 갱신이 아니라 매번 전체 스냅샷이 내려온다 → 받을 때마다 통째로 다시 그린다.

/** 진행중 자주검사 (status=DRAFT). */
export interface MonitorInspection {
  inspectionId: number;
  /** 슬롯 코드 (DAY_1 등). slotLabel 이 없을 때 대신 표시. */
  type: string;
  /** 표시용 슬롯 라벨 — "초/중/종" 또는 "08:00". null 이면 type 으로 표시. */
  slotLabel: string | null;
  productName: string;
  equipmentName: string;
  customerName: string;
  workerName: string;
  /** UTC ISO-8601. */
  updatedAt: string;
}

/** 진행중 순회검사 상태 — 완료/승인은 "진행중"이 아니라 내려오지 않는다. */
export type MonitorCrossCheckStatus = "DRAFT" | "PENDING_APPROVAL" | "REJECTED";

export interface MonitorCrossCheck {
  crossCheckId: number;
  /** 대상 자주검사 id — 진행도 줄의 어느 칸인지 이걸로 정확히 맞춘다. */
  inspectionId: number;
  status: MonitorCrossCheckStatus;
  /** 슬롯 코드 (DAY_1 등). slotLabel 이 없을 때 대신 표시. */
  type: string;
  /** 표시용 슬롯 라벨 — "초/중/종" 또는 "08:00". null 이면 type 으로 표시. */
  slotLabel: string | null;
  productName: string;
  equipmentName: string;
  checkerName: string;
  updatedAt: string;
}

/** 작업자(PRODUCTION) 현황. */
export interface MonitorWorker {
  userId: number;
  name: string;
  /** 담당 구분. 미지정이면 null. */
  workType: WorkType | null;
  /** 최근 5분 내 요청이 있었는지 (= 접속중). */
  online: boolean;
  /** 그 작업자가 지금 진행중인 자주검사 수. */
  inProgressCount: number;
}

export interface MonitorSummary {
  inProgressInspectionCount: number;
  crossCheckCount: number;
  onlineWorkerCount: number;
  totalWorkerCount: number;
}

export interface MonitorSnapshot {
  inProgressInspections: MonitorInspection[];
  crossChecks: MonitorCrossCheck[];
  workers: MonitorWorker[];
  summary: MonitorSummary;
}

/** 스트림 연결 상태 — 화면 구석 표시등에 쓴다. */
export type MonitorConnection =
  | "connecting"
  | "live"
  /** SSE 가 계속 실패해 폴링으로 내려앉은 상태. 데이터는 계속 갱신된다. */
  | "polling"
  /** 스트림·폴링 모두 실패 — 화면이 멈춰 있다는 뜻이라 눈에 띄게 표시해야 한다. */
  | "down";

/* ── 페이지3: 품질·불량 보드 (event: quality / GET /monitor/quality) ────────
 *
 * 승인된 보고서가 아니라 살아있는 검사값을 서버가 직접 판정한 결과다 — 결재 전
 * 진행중 검사의 불량도 여기서 먼저 보인다. 보고서 기준 최종 합불과는 별개.
 */

/**
 * 불량 종류. 종류마다 채워지는 필드가 다르다:
 *   DIMENSION   치수 공차 이탈 — dimName · measuredValue · allowedRange 전부 있음
 *   APPEARANCE  외관 NG        — 셋 다 null
 *   PASS_FAIL   OK/NG 항목의 NG — dimName 만 있음
 */
export type MonitorDefectType = "DIMENSION" | "APPEARANCE" | "PASS_FAIL";

export interface MonitorDefect {
  inspectionId: number;
  productName: string;
  equipmentName: string;
  workerName: string;
  /** 슬롯 라벨 — "초/중/종" 또는 "08:00". */
  slotLabel: string;
  defectType: MonitorDefectType;
  dimName: string | null;
  /** 측정값. 서버가 문자열로 내려준다(숫자로 와도 되도록 호출부에서 느슨히 읽는다). */
  measuredValue: string | null;
  /** 허용 범위 문자열 "9.90 ~ 10.10" (기준+하한 ~ 기준+상한). */
  allowedRange: string | null;
  /** 감지 시각(마지막 갱신). 오프셋 없는 KST 표기 — parseServerDate 로 읽는다. */
  detectedAt: string;
}

/** 품질 문제로 조기종료된 검사. */
export interface MonitorTerminated {
  inspectionId: number;
  productName: string;
  equipmentName: string;
  workerName: string;
  reason: string | null;
  at: string;
}

export interface MonitorQualitySummary {
  inspectionsToday: number;
  completedToday: number;
  /** 불량이 하나라도 잡힌 검사 수 — 불량률의 분자. */
  ngInspectionCount: number;
  /** 불량 항목 총 수. 한 검사에 여러 건이 잡힐 수 있어 위 수보다 크다. */
  defectItemCount: number;
}

export interface MonitorQualityBoard {
  defects: MonitorDefect[];
  terminated: MonitorTerminated[];
  summary: MonitorQualitySummary;
}

/* ── 페이지4: 진행·지연 보드 (event: schedule / GET /monitor/schedule) ──────
 *
 * 오늘 작업지시(행) × 검사 슬롯(칸) 매트릭스. 페이지1 의 진행도와 달리 작업자가
 * 아니라 작업지시가 행이고, 지연 판정이 서버에서 온다.
 */

/** 슬롯 한 칸의 진행 상태. */
export type MonitorSlotState =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "DONE"
  | "INCOMPLETE"
  | "SKIPPED"
  | "TERMINATED";

export interface MonitorScheduleSlot {
  /** 1부터. 서버가 이 순서로 정렬해 내려준다. */
  slotOrder: number;
  /** "초/중/종" 또는 "08:00". */
  label: string;
  /** HH:mm. 시각이 없는 초/중/종은 null — 카운트다운 대상이 아니다. */
  time: string | null;
  shift: Shift | null;
  state: MonitorSlotState;
  /**
   * 슬롯 시각이 지났는데 아직 완료되지 않음(미시작·진행중).
   * state 와 별개 필드라 "진행중이면서 지연"인 칸이 나온다.
   */
  overdue: boolean;
}

export interface MonitorScheduleOrder {
  orderId: number;
  productName: string;
  equipmentName: string;
  customerName: string;
  /** 단일교대 제품은 null. */
  shift: Shift | null;
  slots: MonitorScheduleSlot[];
  doneCount: number;
  totalCount: number;
}

export interface MonitorScheduleSummary {
  orderCount: number;
  totalSlots: number;
  doneSlots: number;
  overdueSlots: number;
}

export interface MonitorScheduleBoard {
  orders: MonitorScheduleOrder[];
  summary: MonitorScheduleSummary;
}
