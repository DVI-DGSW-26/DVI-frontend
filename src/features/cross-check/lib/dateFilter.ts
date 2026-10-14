import {
  kstWorkDayKey,
  parseServerDate,
  WORK_DAY_START_HOUR,
} from "../../../lib/datetime";

// 검사 목록 날짜 필터. 기준 날짜는 검사 일시(inspectionTime).
export type DatePreset = "all" | "today" | "7d" | "30d" | "custom";

export interface DateFilterValue {
  preset: DatePreset;
  // preset === "custom" 일 때만 사용. <input type="date"> 의 "yyyy-mm-dd".
  start: string;
  end: string;
}

export const DEFAULT_DATE_FILTER: DateFilterValue = {
  preset: "all",
  start: "",
  end: "",
};

// 목록 진입 시 기본으로 오늘자 검사만 보이도록 하는 초기 필터.
export const TODAY_DATE_FILTER: DateFilterValue = {
  preset: "today",
  start: "",
  end: "",
};

const DAY_MS = 24 * 60 * 60 * 1000;

// "YYYY-MM-DD" 작업일이 시작하는 시각 — KST 06:00 (lib/datetime 의 WORK_DAY_START_HOUR).
// 야간조 기록은 자정을 넘겨도 시작한 날의 작업분이다(서버 targetDate 도 같은 기준).
// 기기 시간대와 무관하게 KST 로 계산한다.
function workDayStartMs(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d, WORK_DAY_START_HOUR - 9, 0, 0);
}

// 프리셋/커스텀을 [startMs, endMs) 반열린 구간으로 변환. 경계가 없으면 ±Infinity.
// 날짜 경계는 전부 작업일(06:00) 기준이다.
function rangeOf(value: DateFilterValue): { startMs: number; endMs: number } {
  const today = workDayStartMs(kstWorkDayKey(new Date()));
  switch (value.preset) {
    case "today":
      return { startMs: today, endMs: today + DAY_MS };
    case "7d":
      return { startMs: today - 6 * DAY_MS, endMs: today + DAY_MS };
    case "30d":
      return { startMs: today - 29 * DAY_MS, endMs: today + DAY_MS };
    case "custom": {
      const startMs = value.start ? workDayStartMs(value.start) : -Infinity;
      // 종료일은 그 작업일 끝까지 포함 → 다음 작업일 시작 직전까지.
      const endMs = value.end ? workDayStartMs(value.end) + DAY_MS : Infinity;
      return { startMs, endMs };
    }
    case "all":
    default:
      return { startMs: -Infinity, endMs: Infinity };
  }
}

// iso(검사 일시 등)가 현재 필터 구간에 들어오는지. all 이면 항상 true,
// 날짜 파싱 실패 시 숨기지 않고 통과시킨다(데이터 누락 방지).
export function matchesDateFilter(
  iso: string | undefined | null,
  value: DateFilterValue,
): boolean {
  if (value.preset === "all") return true;
  if (!iso) return true;
  const t = parseServerDate(iso).getTime();
  if (Number.isNaN(t)) return true;
  const { startMs, endMs } = rangeOf(value);
  return t >= startMs && t < endMs;
}

// 필터가 실제로 적용 중인지(빈 상태 메시지 분기용).
export function isDateFilterActive(value: DateFilterValue): boolean {
  if (value.preset === "all") return false;
  if (value.preset === "custom") return !!value.start || !!value.end;
  return true;
}
