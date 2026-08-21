import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAllProcessSchedules,
  getProcessSchedule,
  updateProcessSchedule,
} from "./scheduleApi";
import type { UpdateInspectionScheduleRequest } from "./types";

export const scheduleKeys = {
  all: ["inspection-schedule"] as const,
  list: () => [...scheduleKeys.all, "list"] as const,
  process: (process: string) => [...scheduleKeys.all, "process", process] as const,
};

// 스케줄도 관리자만 가끔 바꾸는 마스터 데이터 — 공정 목록과 같은 staleTime 을 쓴다.
const SCHEDULE_STALE_TIME = 5 * 60 * 1000;

export function useProcessSchedule(process: string | null | undefined) {
  return useQuery({
    queryKey: scheduleKeys.process(process ?? ""),
    queryFn: () => getProcessSchedule(process as string),
    enabled: !!process,
    staleTime: SCHEDULE_STALE_TIME,
  });
}

export function useAllProcessSchedules() {
  return useQuery({
    queryKey: scheduleKeys.list(),
    queryFn: getAllProcessSchedules,
    staleTime: SCHEDULE_STALE_TIME,
  });
}

/**
 * 공정 스케줄 저장.
 *
 * 슬롯이 바뀌면 검사 시점 목록(GET /inspection/slots)도 같이 바뀌므로 그쪽 캐시까지
 * 비운다 — 안 그러면 스케줄을 고쳐도 시점 선택 화면이 옛 슬롯을 계속 보여준다.
 */
export function useUpdateProcessSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      process,
      body,
    }: {
      process: string;
      body: UpdateInspectionScheduleRequest;
    }) => updateProcessSchedule(process, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scheduleKeys.all });
      qc.invalidateQueries({ queryKey: ["inspection", "slots"] });
    },
  });
}
