import { http } from "../../../lib/http";
import type { ApiResponse } from "../../auth/type/types";
import type {
  CreateInspectionOrderRequest,
  InspectionOrder,
  InspectionOrderDetailResponse,
  InspectionOrderListResponse,
} from "./types";

export async function getInspectionOrders(): Promise<InspectionOrder[]> {
  const { data } = await http.get<InspectionOrderListResponse>(
    "/inspection-order",
  );
  return data.data ?? [];
}

// 검사 지시 상세 조회.
export async function getInspectionOrderDetail(
  orderId: number,
): Promise<InspectionOrder> {
  const { data } = await http.get<InspectionOrderDetailResponse>(
    `/inspection-order/${orderId}`,
  );
  return data.data;
}

// 현재 로그인한 생산 작업자에게 배정된 검사 지시 목록.
export async function getMyInspectionOrders(): Promise<InspectionOrder[]> {
  const { data } = await http.get<InspectionOrderListResponse>(
    "/inspection-order/my",
  );
  return data.data ?? [];
}

// 특정 생산 작업자에게 배정된 검사 지시 목록 (PRODUCTION_MANAGER 용).
export async function getProductionInspectionOrders(
  productionId: number,
): Promise<InspectionOrder[]> {
  const { data } = await http.get<InspectionOrderListResponse>(
    `/inspection-order/production/${productionId}`,
  );
  return data.data ?? [];
}

export async function createInspectionOrder(
  body: CreateInspectionOrderRequest,
): Promise<void> {
  await http.post<ApiResponse<Record<string, never>>>(
    "/inspection-order",
    body,
  );
}

export async function updateInspectionOrder(
  orderId: number,
  body: Partial<CreateInspectionOrderRequest>,
): Promise<void> {
  await http.patch<ApiResponse<Record<string, never>>>(
    `/inspection-order/${orderId}`,
    body,
  );
}

export async function deleteInspectionOrder(orderId: number): Promise<void> {
  await http.delete<ApiResponse<Record<string, never>>>(
    `/inspection-order/${orderId}`,
  );
}
