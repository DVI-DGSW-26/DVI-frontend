import { http } from "../../../lib/http";
import type { ApiResponse } from "../../auth/type/types";
import type {
  CreateInspectionOrderRequest,
  InspectionOrder,
  InspectionOrderListResponse,
} from "./types";

export async function getInspectionOrders(): Promise<InspectionOrder[]> {
  const { data } = await http.get<InspectionOrderListResponse>(
    "/inspection-order",
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
