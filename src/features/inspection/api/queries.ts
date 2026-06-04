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
  uploadInspectionImage,
} from "./inspectionApi";
import type {
  IncompleteRequest,
  InspectionProcess,
  SaveResultsRequest,
} from "../type/types";
import type { MyInspection } from "../../my-inspection/type/types";
import { myInspectionKeys } from "../../my-inspection/api";

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
