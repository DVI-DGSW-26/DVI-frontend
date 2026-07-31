import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeInspection,
  getInspectionDetail,
  getInspectionSlots,
  incompleteInspection,
  ocrInspectionImage,
  reopenInspection,
  saveInspectionResults,
  skipInspection,
  startInspection,
  startNextInspection,
  terminateInspection,
  uploadInspectionImage,
} from "./inspectionApi";
import type {
  IncompleteRequest,
  InspectionProcess,
  SaveResultsRequest,
  TerminateRequest,
} from "../type/types";
import type { MyInspection } from "../../my-inspection/type/types";
import { myInspectionKeys } from "../../my-inspection/api";
import { reportKeys } from "../../report/api";
import { getNextSlot as getNextSlotStatic } from "../lib/slotSequence";

// 새 inspection 이 만들어진 직후 invalidate 만 호출하면 refetch 가 완료되기 전에 화면이
// 잠깐 OLD 상태로 보일 수 있다 (사용자가 빠르게 navigate/back 한 경우 "이어 작업하기" 카드가
// 사라진 것처럼 보이는 race). 캐시에 즉시 새 항목을 끼워넣고 invalidate 는 보조용으로 둔다.
function pushInspectionToCache(
  qc: ReturnType<typeof useQueryClient>,
  fresh: MyInspection,
) {
  qc.setQueriesData<MyInspection[]>(
    { queryKey: myInspectionKeys.all },
    (prev) => {
      if (!prev) return prev;
      if (prev.some((i) => i.inspectionId === fresh.inspectionId)) return prev;
      return [fresh, ...prev];
    },
  );
}

export const inspectionKeys = {
  all: ["inspection"] as const,
  slots: (process: InspectionProcess) =>
    [...inspectionKeys.all, "slots", process] as const,
  detail: (inspectionId: number) =>
    [...inspectionKeys.all, "detail", inspectionId] as const,
};

export function useInspectionDetail(inspectionId: number | undefined) {
  return useQuery({
    queryKey: inspectionKeys.detail(inspectionId as number),
    queryFn: () => getInspectionDetail(inspectionId as number),
    enabled:
      typeof inspectionId === "number" &&
      Number.isFinite(inspectionId) &&
      inspectionId > 0,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useInspectionSlots(process: InspectionProcess | undefined) {
  return useQuery({
    queryKey: inspectionKeys.slots(process as InspectionProcess),
    queryFn: () => getInspectionSlots(process as InspectionProcess),
    enabled: !!process,
  });
}

// 모든 공정의 슬롯 순서를 백엔드에서 받아 "다음 시점" 계산 함수를 제공한다.
// 하드코딩된 slotSequence 는 실제 백엔드 슬롯(코드/개수/순서)과 어긋날 수 있어
// (예: AL_CUTTING) 다음 시점을 못 찾는 문제가 있었다. 실제 슬롯을 진실의 원천으로 삼되,
// 아직 로드 전이거나 조회 실패한 공정은 하드코딩 시퀀스로 폴백한다.
const ALL_PROCESSES: InspectionProcess[] = [
  "EXTRUSION",
  "PRESS",
  "AL_CUTTING",
  "ST_CUTTING",
  "MACHINING",
];

export function useSlotSequences() {
  const extrusion = useInspectionSlots("EXTRUSION");
  const press = useInspectionSlots("PRESS");
  const alCutting = useInspectionSlots("AL_CUTTING");
  const stCutting = useInspectionSlots("ST_CUTTING");
  const machining = useInspectionSlots("MACHINING");

  const seqByProcess = useMemo(() => {
    const queries = {
      EXTRUSION: extrusion.data,
      PRESS: press.data,
      AL_CUTTING: alCutting.data,
      ST_CUTTING: stCutting.data,
      MACHINING: machining.data,
    } as const;
    const map: Partial<Record<InspectionProcess, string[]>> = {};
    for (const process of ALL_PROCESSES) {
      const slots = queries[process];
      if (slots && slots.length > 0) {
        map[process] = slots.map((s) => s.type);
      }
    }
    return map;
  }, [
    extrusion.data,
    press.data,
    alCutting.data,
    stCutting.data,
    machining.data,
  ]);

  const getNextSlot = useMemo(
    () =>
      (process: string, currentType: string): string | null => {
        const seq = seqByProcess[process as InspectionProcess];
        if (seq && seq.length > 0) {
          const idx = seq.indexOf(currentType);
          if (idx === -1 || idx === seq.length - 1) return null;
          return seq[idx + 1];
        }
        // 실제 슬롯이 아직 없으면 하드코딩 시퀀스로 폴백.
        return getNextSlotStatic(process, currentType);
      },
    [seqByProcess],
  );

  return { getNextSlot };
}

export function useStartInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: startInspection,
    onSuccess: (fresh) => {
      pushInspectionToCache(qc, fresh);
      // assigned/list 양쪽 다 무효화하기 위해 prefix 단위로.
      qc.invalidateQueries({ queryKey: myInspectionKeys.all });
    },
  });
}

export function useSkipInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: skipInspection,
    onSuccess: (fresh) => {
      pushInspectionToCache(qc, fresh);
      qc.invalidateQueries({ queryKey: myInspectionKeys.all });
    },
  });
}

export function useStartNextInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (previousId: number) => startNextInspection(previousId),
    onSuccess: (fresh) => {
      pushInspectionToCache(qc, fresh);
      qc.invalidateQueries({ queryKey: myInspectionKeys.all });
    },
  });
}

export function useUploadInspectionImage() {
  return useMutation({
    mutationFn: (blob: Blob) => uploadInspectionImage(blob),
  });
}

export function useOcrInspectionImage() {
  return useMutation({
    mutationFn: (blob: Blob) => ocrInspectionImage(blob),
  });
}

export function useSaveInspectionResults(inspectionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveResultsRequest) =>
      saveInspectionResults(inspectionId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: myInspectionKeys.all });
      // 외관/비고를 즉시 저장하는 흐름이 생긴 뒤로는, detail 도 무효화해서
      // 새로고침/재진입 시 최신 값으로 다시 동기화되도록 한다.
      qc.invalidateQueries({ queryKey: inspectionKeys.detail(inspectionId) });
    },
  });
}

export function useCompleteInspection(inspectionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => completeInspection(inspectionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: myInspectionKeys.all });
    },
  });
}

export function useIncompleteInspection(inspectionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: IncompleteRequest) =>
      incompleteInspection(inspectionId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: myInspectionKeys.all });
    },
  });
}

// 품질 문제(금형 교체 등) 조기 마감 — 그 차수까지 묶어 보고서 즉시 발행 + 재검사용
// 새 초품 생성. 성공 시 새 초품 검사 상세를 반환하므로 호출부에서 그 화면으로 이동한다.
// 자주검사 목록/현황과 보고서 목록 모두 갱신(즉시 발행되므로 보고서 캐시도 무효화).
export function useTerminateInspection(inspectionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TerminateRequest) =>
      terminateInspection(inspectionId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: myInspectionKeys.all });
      qc.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

// 목록에서 여러 검사 중 하나를 골라 마감하는 호출부용 — 훅을 만들 때는 대상 id 를
// 모르므로 mutate 시점에 함께 넘긴다. 갱신 대상은 useTerminateInspection 과 같다.
export function useTerminateInspectionById() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      inspectionId,
      ...body
    }: TerminateRequest & { inspectionId: number }) =>
      terminateInspection(inspectionId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: myInspectionKeys.all });
      qc.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

// 종결된 자주검사를 DRAFT 로 복귀. 측정값/사진은 보존, status 만 변경.
// 호출 후 detail/list 모두 invalidate — 홈/리스트에서 status 표시 즉시 갱신.
export function useReopenInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inspectionId: number) => reopenInspection(inspectionId),
    onSuccess: (_v, inspectionId) => {
      qc.invalidateQueries({ queryKey: myInspectionKeys.all });
      qc.invalidateQueries({ queryKey: inspectionKeys.detail(inspectionId) });
    },
  });
}
