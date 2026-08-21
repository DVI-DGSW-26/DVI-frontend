import { useMemo } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  completeInspection,
  getInspectionDetail,
  getInspectionSlots,
  getProductSlots,
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
import { useProcessList } from "../../process/api";

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
  productSlots: (productId: number) =>
    [...inspectionKeys.all, "slots", "product", productId] as const,
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

/** 제품 기준 슬롯 — 검사 시작 화면(시점 선택)은 이걸 쓴다. */
export function useProductSlots(productId: number | null | undefined) {
  return useQuery({
    queryKey: inspectionKeys.productSlots(productId ?? 0),
    queryFn: () => getProductSlots(productId as number),
    enabled: !!productId,
  });
}

export function useInspectionSlots(process: InspectionProcess | undefined) {
  return useQuery({
    queryKey: inspectionKeys.slots(process as InspectionProcess),
    queryFn: () => getInspectionSlots(process as InspectionProcess),
    enabled: !!process,
  });
}

/**
 * 모든 공정의 슬롯 순서를 백엔드에서 받아 "다음 시점" 계산 함수를 제공한다.
 *
 * 공정 목록이 DB 로 옮겨가면서(GET /process) 개수가 고정이 아니게 됐다. 훅을 공정마다
 * 부를 수 없으므로 useQueries 로 한 번에 띄운다. 슬롯을 아직 못 받은 공정은 null 을
 * 돌려주고 — 예전엔 하드코딩 시퀀스로 폴백했지만, 야간 슬롯이 추가된 지금은 그 상수가
 * 실제 스케줄과 어긋나 잘못된 다음 시점을 만들어낸다.
 */
export function useSlotSequences() {
  const { data: processes } = useProcessList(true);
  const codes = useMemo(
    () => (processes ?? []).map((p) => p.code),
    [processes],
  );

  const results = useQueries({
    queries: codes.map((code) => ({
      queryKey: inspectionKeys.slots(code),
      queryFn: () => getInspectionSlots(code),
    })),
  });

  const seqByProcess = useMemo(() => {
    const map = new Map<string, string[]>();
    codes.forEach((code, i) => {
      const slots = results[i]?.data;
      if (slots && slots.length > 0) map.set(code, slots.map((s) => s.type));
    });
    return map;
  }, [codes, results]);

  const getNextSlot = useMemo(
    () =>
      (process: string, currentType: string): string | null => {
        const seq = seqByProcess.get(process);
        if (!seq || seq.length === 0) return null;
        const idx = seq.indexOf(currentType);
        if (idx === -1 || idx === seq.length - 1) return null;
        return seq[idx + 1];
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
