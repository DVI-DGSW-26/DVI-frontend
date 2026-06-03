import { parseServerDate } from "../../../lib/datetime";

export type ElapsedTone = "gray" | "orange" | "red";

export interface ElapsedInfo {
  label: string;
  tone: ElapsedTone;
  minutes: number;
}

export function elapsedFrom(iso: string | undefined): ElapsedInfo {
  if (!iso) return { label: "—", tone: "gray", minutes: 0 };
  const then = parseServerDate(iso).getTime();
  if (Number.isNaN(then)) return { label: "—", tone: "gray", minutes: 0 };

  const now = Date.now();
  const minutes = Math.max(0, Math.round((now - then) / 60000));

  let label: string;
  if (minutes < 60) {
    label = `${minutes}분 전`;
  } else if (minutes < 60 * 24) {
    label = `${Math.floor(minutes / 60)}시간 전`;
  } else {
    label = `${Math.floor(minutes / 60 / 24)}일 전`;
  }

  const tone: ElapsedTone =
    minutes >= 30 ? "red" : minutes >= 10 ? "orange" : "gray";

  return { label, tone, minutes };
}

export const TONE_COLOR: Record<ElapsedTone, string> = {
  gray: "#A8A8A8",
  orange: "#F59E0B",
  red: "#EF4444",
};
