import type { InspectionProcess } from "../type/types";

const PROCESS_LABELS: Record<InspectionProcess, string> = {
  EXTRUSION: "압출",
  AL_CUTTING: "AL 절단",
  ST_CUTTING: "스틸 절단",
  MACHINING: "기계가공",
};

export function getProcessLabel(process: string): string {
  return PROCESS_LABELS[process as InspectionProcess] ?? process;
}
