import { kstDateKey } from "../../../lib/datetime";

/**
 * 작업지시 목록에서 "오늘"을 가르는 시각 (KST).
 *
 * 야간 작업이 자정을 넘겨도 같은 작업분으로 남게 하려고 달력 날짜가 아니라 이 경계를
 * 쓴다. 자정~경계 사이에는 전날 날짜의 야간 작업지시가 계속 "오늘 지시"로 보인다.
 *
 * lib/datetime 의 WORK_DAY_START_HOUR(=6) 과 값은 같지만 따로 둔다 — 현장 야간 근무
 * 종료 시각이 08:00 으로 확인되면 여기만 바꾸고 보고서·순회검사의 '작업일' 표기는
 * 건드리지 않기 위해서다. (현장 확인 중 — 백엔드 운영 기록상 05~08시 검사 0건이라
 * 06:00 경계로 사라지는 구간은 실제로 비어 있다, 2026-09-23)
 */
export const ORDER_WORK_DAY_START_HOUR = 6;

/** 작업지시 기준 "작업일" 키 "YYYY-MM-DD". 달력 날짜가 아니라 위 경계 기준이다. */
export function orderWorkDayKey(d: Date): string {
  if (Number.isNaN(d.getTime())) return "";
  return kstDateKey(
    new Date(d.getTime() - ORDER_WORK_DAY_START_HOUR * 60 * 60 * 1000),
  );
}
