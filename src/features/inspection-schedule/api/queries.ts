import { useQuery } from "@tanstack/react-query";
import { getAllProcessSchedules, getProcessSchedule } from "./scheduleApi";

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
