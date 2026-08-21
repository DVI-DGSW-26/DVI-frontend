import { http } from "../../../lib/http";
import type {
  InspectionSchedule,
  InspectionScheduleListResponse,
  InspectionScheduleResponse,
  UpdateInspectionScheduleRequest,
} from "./types";

export async function getProcessSchedule(
  process: string,
): Promise<InspectionSchedule> {
  const { data } = await http.get<InspectionScheduleResponse>(
    `/inspection-schedule/process/${process}`,
  );
  return data.data;
}

/** 활성 공정 전체의 스케줄을 한 번에. (공정별로 N번 부르지 않아도 되는 경로) */
export async function getAllProcessSchedules(): Promise<InspectionSchedule[]> {
  const { data } = await http.get<InspectionScheduleListResponse>(
    "/inspection-schedule/process",
  );
  return data.data ?? [];
}

export async function updateProcessSchedule(
  process: string,
  body: UpdateInspectionScheduleRequest,
): Promise<InspectionSchedule> {
  const { data } = await http.put<InspectionScheduleResponse>(
    `/inspection-schedule/process/${process}`,
    body,
  );
  return data.data;
}
