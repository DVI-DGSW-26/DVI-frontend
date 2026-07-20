import type { WorkType } from "../../auth/type/types";

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
  status: MonitorCrossCheckStatus;
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
