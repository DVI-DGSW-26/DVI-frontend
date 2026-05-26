import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
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
      qc.invalidateQueries({ queryKey: crossCheckKeys.detail(crossCheckId) });
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
