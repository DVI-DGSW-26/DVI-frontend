import type { InspectionProcess } from "../type/types";

// 공정별 시점(type) 순서. 백엔드 /inspection/slots 와 동일한 순서이지만,
// "다음 시점 시작" 계산을 추가 네트워크 호출 없이 즉시 하기 위해 상수로 둔다.
export const SLOT_SEQUENCE: Record<InspectionProcess, readonly string[]> = {
  EXTRUSION: ["DAY_1", "DAY_2", "DAY_3"],
  PRESS: ["DAY_1", "DAY_2", "DAY_3"],
  AL_CUTTING: [
    "DAY_1",
    "DAY_2",
    "DAY_3",
    "NIGHT_1",
    "NIGHT_2",
    "NIGHT_3",
    "NIGHT_4",
    "NIGHT_5",
  ],
  ST_CUTTING: [
    "DAY_1",
    "DAY_2",
    "DAY_3",
    "DAY_4",
    "DAY_5",
    "NIGHT_1",
    "NIGHT_2",
    "NIGHT_3",
  ],
  MACHINING: [
    "DAY_1",
    "DAY_2",
    "DAY_3",
    "DAY_4",
    "DAY_5",
    "NIGHT_1",
    "NIGHT_2",
    "NIGHT_3",
    "NIGHT_4",
    "NIGHT_5",
  ],
};

export function getNextSlot(
  process: InspectionProcess | string,
  currentType: string,
): string | null {
  const seq = SLOT_SEQUENCE[process as InspectionProcess];
  if (!seq) return null;
  const idx = seq.indexOf(currentType);
  if (idx === -1 || idx === seq.length - 1) return null;
  return seq[idx + 1];
}
