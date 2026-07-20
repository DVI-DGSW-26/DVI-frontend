import { useMemo } from "react";
import { useInspectionSlots } from "../../inspection/api";
import type {
  InspectionProcess,
  InspectionSlot,
} from "../../inspection/type/types";

const ALL_PROCESSES: InspectionProcess[] = [
  "EXTRUSION",
  "PRESS",
  "AL_CUTTING",
  "ST_CUTTING",
  "MACHINING",
];

/**
 * 전 공정의 슬롯 목록(순서·라벨)을 공정별로 모아 준다.
 *
 * 진행도 매트릭스의 "칸"이 곧 슬롯이라 개수와 순서가 정확해야 한다. 하드코딩된
 * slotSequence 는 실제 백엔드 슬롯과 어긋난 전례가 있어(AL_CUTTING 은 10개 시간
 * 슬롯, 나머지는 초·중·종 3개) 백엔드 응답만 진실의 원천으로 쓴다.
 */
export function useAllSlots(): Record<string, InspectionSlot[] | undefined> {
  const extrusion = useInspectionSlots("EXTRUSION");
  const press = useInspectionSlots("PRESS");
  const alCutting = useInspectionSlots("AL_CUTTING");
  const stCutting = useInspectionSlots("ST_CUTTING");
  const machining = useInspectionSlots("MACHINING");

  const byProcess = useMemo(
    () => ({
      EXTRUSION: extrusion.data,
      PRESS: press.data,
      AL_CUTTING: alCutting.data,
      ST_CUTTING: stCutting.data,
      MACHINING: machining.data,
    }),
    [
      extrusion.data,
      press.data,
      alCutting.data,
      stCutting.data,
      machining.data,
    ],
  );

  return byProcess;
}

export { ALL_PROCESSES };
