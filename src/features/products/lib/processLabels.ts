import type { ProcessType } from "../api";

export const PROCESS_LABEL: Record<string, string> = {
  EXTRUSION: "압출",
  AL_CUTTING: "AL 절단",
  ST_CUTTING: "ST 절단",
  MACHINING: "가공",
  PRESS: "프레스",
};

export const PROCESS_OPTIONS: { value: ProcessType; label: string }[] = [
  { value: "EXTRUSION", label: "압출" },
  { value: "AL_CUTTING", label: "AL 절단" },
  { value: "ST_CUTTING", label: "ST 절단" },
  { value: "MACHINING", label: "가공" },
  { value: "PRESS", label: "프레스" },
];

export function processLabel(process: string): string {
  return PROCESS_LABEL[process] ?? process;
}
