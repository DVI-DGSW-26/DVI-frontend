import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAwaitingReason,
  getMissedInspections,
  patchIncompleteReason,
} from "../api/incompleteApi";
import { approvalKeys } from "../../approval/api/approvalApi";
import { incompleteQueryKey } from "./useIncomplete";

export const missedKeys = {
  all: ["incomplete", "missed"] as const,
  list: (processes: string[] = []) =>
    [...missedKeys.all, { processes }] as const,
  // 사유 대기 건수(메뉴·홈 배지). missed 아래에 둬서 사유 저장 시 같이 무효화된다.
  awaitingReason: () => [...missedKeys.all, "awaiting-reason"] as const,
};

// 메뉴는 늘 떠 있으니 자주 부르지 않는다.
const AWAITING_STALE_MS = 60 * 1000;

export function useAwaitingReasonCount(enabled = true): number {
  const { data } = useQuery({
    queryKey: missedKeys.awaitingReason(),
    queryFn: getAwaitingReason,
    enabled,
    staleTime: AWAITING_STALE_MS,
    refetchInterval: AWAITING_STALE_MS,
  });
  return data?.length ?? 0;
}

export function useMissedInspections(processes: string[] = []) {
  return useQuery({
    queryKey: missedKeys.list(processes),
    queryFn: () => getMissedInspections(processes),
  });
}

// 사유가 처음 채워지면 품질관리자 승인 대기(GET /incomplete)로 넘어가므로 그쪽과 결재 건수도 갱신.
export function useWriteIncompleteReason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      inspectionId,
      reason,
    }: {
      inspectionId: number;
      reason: string;
    }) => patchIncompleteReason(inspectionId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: missedKeys.all });
      qc.invalidateQueries({ queryKey: incompleteQueryKey, exact: true });
      qc.invalidateQueries({ queryKey: approvalKeys.pendingCounts });
    },
  });
}
