import { kstDateKey } from "../../../lib/datetime";
import type { Shift } from "../../inspection-schedule/api";
import { NIGHT_SHIFT_START_HOUR } from "../../report/lib/shift";

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

/**
 * now 가 속한 교대. 17시~다음날 경계(06시)는 야간이다. 등록 화면의 기본 교대와,
 * 주·야로 함께 등록한 지시 중 작업자에게 보일 쪽을 고르는 데 쓴다.
 *
 * 보고서의 주/야 판정(report/lib/shift.ts)과 규칙은 같지만, 하한을 보고서의 작업일
 * 경계가 아니라 위 ORDER_WORK_DAY_START_HOUR 에 묶는다 — 새벽에 열면 기본 날짜가
 * 전날 작업일이 되므로 교대도 그 작업일의 야간이어야 둘이 맞고, 지시 경계만 08시로
 * 바뀌어도 같이 따라가야 한다. 17시는 서버 설정 inspection.night_start_time 과 같은
 * 값이다(조회 API 가 없어 상수로 둔다).
 */
export function orderShiftAt(now: Date): Shift {
  if (Number.isNaN(now.getTime())) return "DAY";
  const hour = (now.getUTCHours() + 9) % 24; // KST, 기기 시간대와 무관
  return hour >= NIGHT_SHIFT_START_HOUR || hour < ORDER_WORK_DAY_START_HOUR
    ? "NIGHT"
    : "DAY";
}
