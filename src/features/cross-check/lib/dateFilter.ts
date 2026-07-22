import { parseServerDate } from "../../../lib/datetime";

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

// 로컬 자정(00:00:00) 기준 Date.
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

// 프리셋/커스텀을 [startMs, endMs) 반열린 구간으로 변환. 경계가 없으면 ±Infinity.
function rangeOf(value: DateFilterValue): { startMs: number; endMs: number } {
  const today = startOfDay(new Date());
  switch (value.preset) {
    case "today":
      return { startMs: today.getTime(), endMs: addDays(today, 1).getTime() };
    case "7d":
      return {
        startMs: addDays(today, -6).getTime(),
        endMs: addDays(today, 1).getTime(),
      };
    case "30d":
      return {
        startMs: addDays(today, -29).getTime(),
        endMs: addDays(today, 1).getTime(),
      };
    case "custom": {
      const startMs = value.start
        ? new Date(`${value.start}T00:00:00`).getTime()
        : -Infinity;
      // 종료일은 그 날 끝까지 포함 → 다음날 자정 직전까지.
      const endMs = value.end
        ? new Date(`${value.end}T00:00:00`).getTime() + 24 * 60 * 60 * 1000
        : Infinity;
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
