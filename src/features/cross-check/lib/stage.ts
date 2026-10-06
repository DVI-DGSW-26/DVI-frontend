import type { ProcessType } from "../api";
import { formatSlotTime } from "../../report/lib/inspectedTime";

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

// 초/중/종 라벨은 i18n 으로 — UI 에서 t(`stage.${stage}`) (crossCheck 네임스페이스,
// 키는 Stage 값과 동일: stage.INITIAL / stage.MIDDLE / stage.FINAL) 로 얻는다.

export const STAGE_BADGE: Record<Stage, string> = {
  INITIAL: "border-[#DBEAFE] bg-[#EFF6FF] text-[#1D4ED8]",
  MIDDLE: "border-[#FEF3C7] bg-[#FFFBEB] text-[#B45309]",
  FINAL: "border-[#FBCFE8] bg-[#FDF2F8] text-[#9D174D]",
};

// 경도를 추적하는 공정(hardnessTracked)의 종품(FINAL)인데 경도값이 아직 없는 DRAFT —
// 순회검사자가 열처리 후 경도를 입력해야 결재요청 가능. 카드의 "경도 입력 필요" 배지용.
// hardnessTracked 는 호출부에서 useProcessFlag("hardnessTracked") 로 구해 넘긴다
// (공정이 DB 로 옮겨가 "압출이면" 같은 코드 비교를 더 이상 쓰지 않는다).
export function needsHardnessInput(
  cc: {
    status: string;
    type: string;
    product: { process: ProcessType };
    hardnessResult?: string | null;
  },
  hardnessTracked: boolean,
): boolean {
  return (
    cc.status === "DRAFT" &&
    hardnessTracked &&
    getStage(cc.type, cc.product.process) === "FINAL" &&
    !cc.hardnessResult?.trim()
  );
}

// 순회검사를 하지 않는 시간대 — 시간대별 검사인 AL/ST 절단의 10시·15시 차수.
// 자주검사는 진행하지만 순회검사는 없어서 전체 항목 건너뛰기를 허용한다.
const SKIP_ALL_PROCESSES: ProcessType[] = ["AL_CUTTING", "ST_CUTTING"];
const SKIP_ALL_SLOT_TIMES = ["10:00", "15:00"];

export function canSkipAll(cc: {
  product: { process: ProcessType };
  inspectionTime: string;
}): boolean {
  return (
    SKIP_ALL_PROCESSES.includes(cc.product.process) &&
    SKIP_ALL_SLOT_TIMES.includes(formatSlotTime(cc.inspectionTime) ?? "")
  );
}

// 전체 건너뛰기로 끝난 건 — 모든 DIM 이 건너뜀. 서버에 전용 필드가 없어 results 로 판별한다.
export function isSkippedAll(cc: { results: { skipped?: boolean }[] }): boolean {
  return cc.results.length > 0 && cc.results.every((r) => r.skipped === true);
}
