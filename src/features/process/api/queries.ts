import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createProcess, getProcesses, updateProcess } from "./processApi";
import type { CreateProcessRequest, UpdateProcessRequest } from "./types";

export const processKeys = {
  all: ["processes"] as const,
  list: (includeInactive: boolean) =>
    [...processKeys.all, "list", { includeInactive }] as const,
};

/**
 * 공정 목록. 라벨·플래그를 보려고 거의 모든 화면이 부르므로 staleTime 을 길게 둔다.
 * (공정은 관리자가 가끔 손대는 마스터 데이터라 화면마다 다시 받을 이유가 없다.)
 */
export function useProcessList(includeInactive = false) {
  return useQuery({
    queryKey: processKeys.list(includeInactive),
    queryFn: () => getProcesses(includeInactive),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateProcess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProcessRequest) => createProcess(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: processKeys.all });
    },
  });
}

export function useUpdateProcess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, body }: { code: string; body: UpdateProcessRequest }) =>
      updateProcess(code, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: processKeys.all });
    },
  });
}
