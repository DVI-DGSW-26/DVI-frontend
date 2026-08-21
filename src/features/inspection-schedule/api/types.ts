import type { ApiResponse } from "../../auth/type/types";

/** 주간/야간 교대. 화면의 주·야 판단은 반드시 이 값으로 한다(type 접두어 추론 금지). */
export type Shift = "DAY" | "NIGHT";

export type ScheduleType = "CHO_JUNG_JONG" | "TIME_BASED";

export interface ScheduleSlot {
  // 1부터 시작하는 순서. 목록 순서가 곧 검사 순서다.
  slotOrder: number;
  label: string;
  shift: Shift;
  // "HH:mm:ss". 초·중·종처럼 고정 시각이 없는 슬롯은 null.
  slotTime: string | null;
  // 오더 시작일 기준 며칠 뒤인지. 자정을 넘기는 야간 슬롯이 1 이 된다.
  dayOffset: number;
  // 읽기 전용 — 공정 설정(autoCopyNightCrossCheck/hardnessTracked)에서 서버가 계산.
  autoCopyCrossCheck: boolean;
  hardnessRequired: boolean;
}

export interface InspectionSchedule {
  id: number;
  process: string;
  scheduleType: ScheduleType;
  slots: ScheduleSlot[];
}

export type InspectionScheduleResponse = ApiResponse<InspectionSchedule>;
export type InspectionScheduleListResponse = ApiResponse<InspectionSchedule[]>;
