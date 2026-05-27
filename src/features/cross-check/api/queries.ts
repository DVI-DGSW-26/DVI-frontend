import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeCrossCheck,
  createCrossCheck,
  decideCrossCheck,
  getAssignedCrossChecks,
  getCrossCheckDetail,
  getMyCrossChecks,
  getMyDelegation,
  saveCrossCheckResults,
} from "./crossCheckApi";
import type {
  CreateCrossCheckRequest,
  DecideCrossCheckRequest,
  SaveCrossCheckResultRequest,
} from "./types";

export const crossCheckKeys = {
  all: ["cross-check"] as const,
  my: (includeFinished = false) =>
    [...crossCheckKeys.all, "my", { includeFinished }] as const,
  assigned: () => [...crossCheckKeys.all, "assigned"] as const,
  detail: (crossCheckId: number) =>
    [...crossCheckKeys.all, "detail", crossCheckId] as const,
  delegationMe: () => ["delegation", "me"] as const,
};

export function useMyCrossChecks(includeFinished = false) {
  return useQuery({
    queryKey: crossCheckKeys.my(includeFinished),
    queryFn: () => getMyCrossChecks(includeFinished),
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useAssignedCrossChecks() {
  return useQuery({
    queryKey: crossCheckKeys.assigned(),
    queryFn: getAssignedCrossChecks,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useMyDelegation() {
  return useQuery({
    queryKey: crossCheckKeys.delegationMe(),
    queryFn: getMyDelegation,
  });
}

export function useCrossCheckDetail(crossCheckId: number | undefined) {
  return useQuery({
    queryKey: crossCheckKeys.detail(crossCheckId as number),
    queryFn: () => getCrossCheckDetail(crossCheckId as number),
    enabled:
      typeof crossCheckId === "number" &&
      Number.isFinite(crossCheckId) &&
      crossCheckId > 0,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useCreateCrossCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCrossCheckRequest) => createCrossCheck(body),
    onSuccess: () => {
      // 시작 직후엔 assigned/my 둘 다 갱신 필요.
      qc.invalidateQueries({ queryKey: crossCheckKeys.all });
    },
  });
}

export function useSaveCrossCheckResults(crossCheckId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveCrossCheckResultRequest) =>
      saveCrossCheckResults(crossCheckId, body),
    onSuccess: () => {
      // detail 쿼리는 일부러 invalidate 하지 않는다 — 측정 흐름 중 백그라운드 refetch
      // 가 발생하면 로컬 sessionResults 와 refetch 된 startIdx 가 동시에 진행도를
      // 카운트해 stepIndex 가 두 칸 점프하는 버그가 발생한다. detail 은 staleTime:0
      // 이라 다음 마운트(새로고침/재진입) 때 자연스럽게 갱신됨.
      qc.invalidateQueries({ queryKey: crossCheckKeys.my() });
    },
  });
}

export function useDecideCrossCheck(crossCheckId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DecideCrossCheckRequest) =>
      decideCrossCheck(crossCheckId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crossCheckKeys.all });
    },
  });
}

export function useCompleteCrossCheck(crossCheckId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => completeCrossCheck(crossCheckId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crossCheckKeys.all });
    },
  });
}
