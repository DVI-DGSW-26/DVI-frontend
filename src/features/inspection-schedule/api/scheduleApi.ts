import { http } from "../../../lib/http";
import type { ApiResponse } from "../../auth/type/types";
import type {
  InspectionSchedule,
  InspectionScheduleListResponse,
  InspectionScheduleResponse,
  ProductScheduleResponse,
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

/**
 * 제품 전용 스케줄.
 *
 * **오버라이드가 없으면 null 이다** — 에러가 아니라 "이 제품은 공정 기본 스케줄을
 * 그대로 쓴다" 는 뜻이다.
 */
export async function getProductSchedule(
  productId: number,
): Promise<InspectionSchedule | null> {
  const { data } = await http.get<ProductScheduleResponse>(
    `/inspection-schedule/product/${productId}`,
  );
  return data.data ?? null;
}

/** 없으면 새로 만들고, 있으면 슬롯을 통째로 교체한다(부분 수정 아님). */
export async function updateProductSchedule(
  productId: number,
  body: UpdateInspectionScheduleRequest,
): Promise<InspectionSchedule | null> {
  const { data } = await http.put<ProductScheduleResponse>(
    `/inspection-schedule/product/${productId}`,
    body,
  );
  return data.data ?? null;
}

/** 오버라이드를 지운다. 이후 이 제품은 다시 공정 기본 스케줄을 따른다. */
export async function deleteProductSchedule(productId: number): Promise<void> {
  await http.delete<ApiResponse<Record<string, never>>>(
    `/inspection-schedule/product/${productId}`,
  );
}
