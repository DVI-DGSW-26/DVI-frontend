import type { ProcessType } from "../api";

// 검사 차수(type)를 초/중/종 단계로 매핑.
// - 압출: 초중종 3차수 → _1=초, _2=중, _3=종
// - 그 외(절단/가공, 시간슬롯): _1=초, _5=종, _2~_4=중
export type Stage = "INITIAL" | "MIDDLE" | "FINAL";

export function getStage(type: string, process: ProcessType): Stage | null {
  const m = type.match(/_(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (process === "EXTRUSION") {
    if (n === 1) return "INITIAL";
    if (n === 2) return "MIDDLE";
    if (n === 3) return "FINAL";
    return null;
  }
  if (n === 1) return "INITIAL";
  if (n === 5) return "FINAL";
  if (n >= 2 && n <= 4) return "MIDDLE";
  return null;
}

export const STAGE_LABEL: Record<Stage, string> = {
  INITIAL: "초",
  MIDDLE: "중",
  FINAL: "종",
};

export const STAGE_BADGE: Record<Stage, string> = {
  INITIAL: "border-[#DBEAFE] bg-[#EFF6FF] text-[#1D4ED8]",
  MIDDLE: "border-[#FEF3C7] bg-[#FFFBEB] text-[#B45309]",
  FINAL: "border-[#FBCFE8] bg-[#FDF2F8] text-[#9D174D]",
};
