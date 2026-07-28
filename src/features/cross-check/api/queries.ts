import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeCrossCheck,
  createCrossCheck,
  decideCrossCheck,
  deleteCrossCheck,
  getAssignedCrossChecks,
  getCrossCheckDetail,
  getMyCrossChecks,
  getMyDelegation,
  getPendingCrossChecks,
  rejectCrossCheck,
  releaseCrossCheck,
  reopenCrossCheck,
  saveCrossCheckResults,
} from "./crossCheckApi";
import type {
  CreateCrossCheckRequest,
  DecideCrossCheckRequest,
  SaveCrossCheckResultRequest,
} from "./types";
import { reportKeys } from "../../report/api";

export const crossCheckKeys = {
  all: ["cross-check"] as const,
  my: (includeFinished = false) =>
    [...crossCheckKeys.all, "my", { includeFinished }] as const,
  assigned: () => [...crossCheckKeys.all, "assigned"] as const,
  pending: () => [...crossCheckKeys.all, "pending"] as const,
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

export function usePendingCrossChecks() {
  return useQuery({
    queryKey: crossCheckKeys.pending(),
    queryFn: getPendingCrossChecks,
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
      // 승인 시 보고서가 자동 발행되므로 양쪽 보고서 페이지(ADMIN/QUALITY_ADMIN)
      // 캐시도 같이 비워서 다음 진입 때 새 목록이 보이게 한다.
      qc.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function useCompleteCrossCheck(crossCheckId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => completeCrossCheck(crossCheckId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crossCheckKeys.all });
      qc.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

// 반려된 cross-check 를 DRAFT 로 복귀시키는 mutation.
// 목록에서 여러 항목을 다룰 수 있도록 id 를 mutate 시점에 받는다.
// 호출 후 detail/list 모두 invalidate — status 가 REJECTED → DRAFT 로 바뀌므로
// 홈/결재 페이지 양쪽 표시 변경 필요.
export function useReopenCrossCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (crossCheckId: number) => reopenCrossCheck(crossCheckId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crossCheckKeys.all });
    },
  });
}

// 순회검사자 즉시 반려. rejectReason 을 mutate 시점에 받는다.
// 순회검사·자주검사 상태가 함께 바뀌므로 cross-check 전체 캐시 invalidate.
export function useRejectCrossCheck(crossCheckId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rejectReason: string) =>
      rejectCrossCheck(crossCheckId, rejectReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crossCheckKeys.all });
    },
  });
}

// 관리자(ADMIN/QUALITY_ADMIN) 순회검사 삭제. 목록/홈/현황 캐시 갱신.
export function useDeleteCrossCheck(crossCheckId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteCrossCheck(crossCheckId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crossCheckKeys.all });
    },
  });
}

// 목록에서 임의 순회검사를 삭제 (mutate 시점에 id 받음). 결재 목록에서 상세를
// 열지 않고 바로 삭제하는 데 사용. 삭제 후 목록/홈/현황 캐시 갱신.
export function useDeleteCrossCheckById() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (crossCheckId: number) => deleteCrossCheck(crossCheckId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crossCheckKeys.all });
    },
  });
}

// 순회검사자가 자주검사(대상)를 잘못 골라 시작했을 때 "취소"(= 담당 해제/release).
// 관리자 삭제(DELETE)와 달리 순회검사 레코드를 지우지 않고 담당만 놓아 다른 검사자가
// 이어받을 수 있게 한다. 측정값은 보존되고, 반려와 달리 작업자에게 재측정으로 튕기지
// 않는다. 담당 해제 후엔 내 목록에서 빠지고 다시 대기 상태가 되므로 전체 캐시 무효화.
// id 는 mutate 시점에 받아 측정 페이지·진행중 카드 양쪽에서 재사용한다.
export function useCancelCrossCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (crossCheckId: number) => releaseCrossCheck(crossCheckId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crossCheckKeys.all });
    },
  });
}
