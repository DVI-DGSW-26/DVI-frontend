import { parseServerDate } from "../../../lib/datetime";

export type ElapsedTone = "gray" | "orange" | "red";

// 표시 단위. "none" 은 타임스탬프가 없거나 파싱 불가한 경우("—" 표시).
export type ElapsedUnit = "none" | "minute" | "hour" | "day";

export interface ElapsedInfo {
  // 문구 조립은 UI 에서 i18n 으로 — t(`elapsed.${unit}`, { n }) (crossCheck 네임스페이스).
  unit: ElapsedUnit;
  n: number;
  tone: ElapsedTone;
  minutes: number;
}

export function elapsedFrom(iso: string | undefined): ElapsedInfo {
  if (!iso) return { unit: "none", n: 0, tone: "gray", minutes: 0 };
  const then = parseServerDate(iso).getTime();
  if (Number.isNaN(then)) return { unit: "none", n: 0, tone: "gray", minutes: 0 };

  const now = Date.now();
  const minutes = Math.max(0, Math.round((now - then) / 60000));

  let unit: ElapsedUnit;
  let n: number;
  if (minutes < 60) {
    unit = "minute";
    n = minutes;
  } else if (minutes < 60 * 24) {
    unit = "hour";
    n = Math.floor(minutes / 60);
  } else {
    unit = "day";
    n = Math.floor(minutes / 60 / 24);
  }

  const tone: ElapsedTone =
    minutes >= 30 ? "red" : minutes >= 10 ? "orange" : "gray";

  return { unit, n, tone, minutes };
}

export const TONE_COLOR: Record<ElapsedTone, string> = {
  gray: "#A8A8A8",
  orange: "#F59E0B",
  red: "#EF4444",
};
