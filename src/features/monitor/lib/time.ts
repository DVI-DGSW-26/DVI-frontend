import { useEffect, useState } from "react";
import { parseServerDate } from "../../../lib/datetime";

// 벽 화면의 시간 표시는 전부 KST 로 고정한다 — 현장 PC 의 시간대가 잘못 잡혀 있어도
// 슬롯 시각·마감 카운트다운이 흔들리면 안 된다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_SEC = 24 * 60 * 60;

/** 1초마다 갱신되는 현재 시각. 시계·경과·카운트다운이 함께 이걸 쓴다. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function kstParts(d: Date) {
  const kst = new Date(d.getTime() + KST_OFFSET_MS);
  return {
    yyyy: kst.getUTCFullYear(),
    mm: String(kst.getUTCMonth() + 1).padStart(2, "0"),
    dd: String(kst.getUTCDate()).padStart(2, "0"),
    hh: String(kst.getUTCHours()).padStart(2, "0"),
    mi: String(kst.getUTCMinutes()).padStart(2, "0"),
    ss: String(kst.getUTCSeconds()).padStart(2, "0"),
    day: kst.getUTCDay(),
  };
}

/** "14:03:22" (KST). */
export function formatClock(d: Date): string {
  const { hh, mi, ss } = kstParts(d);
  return `${hh}:${mi}:${ss}`;
}

/** "14:03" (KST). */
export function formatHm(d: Date): string {
  const { hh, mi } = kstParts(d);
  return `${hh}:${mi}`;
}

/** KST 기준 오늘 (yyyy-MM-dd) — 서버 date 파라미터용. */
export function kstToday(now: Date): string {
  const { yyyy, mm, dd } = kstParts(now);
  return `${yyyy}-${mm}-${dd}`;
}

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

/** "9월 11일 (금)" — 머리말용 사람이 읽는 날짜. */
export function formatDateLabel(now: Date): string {
  const { mm, dd, day } = kstParts(now);
  return `${Number(mm)}월 ${Number(dd)}일 (${WEEKDAY[day]})`;
}

/** "방금 / 12분 전 / 3시간 전" — 서버가 오프셋 없이 내려주는 KST 표기도 안전하게 읽는다. */
export function formatElapsed(iso: string, now: Date): string {
  const t = parseServerDate(iso).getTime();
  if (Number.isNaN(t)) return "";
  const sec = Math.max(0, Math.floor((now.getTime() - t) / 1000));
  if (sec < 60) return "방금";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

/** 서버 타임스탬프의 시:분 (KST). 못 읽으면 null. */
export function timeOf(iso: string): string | null {
  const d = parseServerDate(iso);
  if (Number.isNaN(d.getTime())) return null;
  return formatHm(d);
}

/**
 * 슬롯 시각("08:00")까지 남은 초. 이미 지났으면 음수.
 *
 * 서버는 "남은 시간" 같은 연속값을 응답에 넣지 않는다(내용이 바뀔 때만 이벤트가
 * 나가는 구조라 매초 값은 담을 수 없다) — 카운트다운은 여기서 만든다.
 * 자정을 넘겨 도는 야간 슬롯은 12시간 넘게 지난 것으로 계산되므로 다음날로 본다.
 */
export function secondsUntilSlot(
  time: string | null | undefined,
  now: Date,
): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!m) return null;
  const target = Number(m[1]) * 3600 + Number(m[2]) * 60;
  const { hh, mi, ss } = kstParts(now);
  const current = Number(hh) * 3600 + Number(mi) * 60 + Number(ss);
  let diff = target - current;
  if (diff < -DAY_SEC / 2) diff += DAY_SEC;
  return diff;
}

/** "1시간 5분 / 12분 / 3분 20초 / 40초". 남은 시간이 짧아질수록 단위를 잘게 쓴다. */
export function formatCountdown(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const hr = Math.floor(s / 3600);
  const min = Math.floor((s % 3600) / 60);
  if (hr > 0) return min > 0 ? `${hr}시간 ${min}분` : `${hr}시간`;
  if (min >= 10) return `${min}분`;
  const rest = s % 60;
  if (min > 0) return `${min}분 ${String(rest).padStart(2, "0")}초`;
  return `${rest}초`;
}

/**
 * 슬롯 시각이 얼마나 지났는지(초). 아직 안 지났거나 시각이 없으면 null.
 *
 * 지연 여부 판정은 서버(overdue)가 한다 — 여기서 만드는 건 "얼마나 늦었나" 하나뿐이다.
 * 12시간 넘게 지난 값은 다음날 슬롯으로 접히므로(secondsUntilSlot) null 이 된다.
 * 그 경우 화면은 지연 시간 없이 "지연"만 표시한다.
 */
export function overdueSeconds(
  time: string | null | undefined,
  now: Date,
): number | null {
  const left = secondsUntilSlot(time, now);
  if (left == null || left >= 0) return null;
  return -left;
}
