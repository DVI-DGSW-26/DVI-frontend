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

/**
 * now 가 속한 작업일의 시작·끝 시각. 화면에 "언제부터 언제까지"를 적어 두려는 용도 —
 * "오늘"이라고만 쓰면 새벽 2시에 어제 날짜 지시가 보이는 게 고장처럼 읽힌다.
 */
export function orderWorkDayRange(now: Date): { start: Date; end: Date } {
  const key = orderWorkDayKey(now);
  const [y, m, d] = key.split("-").map(Number);
  // KST(UTC+9) 경계 시각을 UTC 로 — 기기 시간대와 무관하게 계산한다.
  const start = new Date(
    Date.UTC(y, m - 1, d, ORDER_WORK_DAY_START_HOUR - 9, 0, 0),
  );
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}
