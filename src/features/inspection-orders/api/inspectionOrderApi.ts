import { AxiosError } from "axios";
import { http } from "../../../lib/http";
import type { ApiResponse } from "../../auth/type/types";
import { orderWorkers } from "../lib/orderWorkers";
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

export interface CopyOrdersResult {
  created: number;
  /** 이미 같은 지시가 있어 건너뛴 건수 (409 DUPLICATE_INSPECTION_ORDER). */
  duplicated: number;
  failed: number;
}

/**
 * 기존 검사지시들을 다른 날짜로 복제한다 (어제 → 오늘).
 *
 * 전용 복제 API 가 없어 조회 결과의 product/equipment/workers 를 그대로
 * 생성 API 에 다시 넣는다. 이미 같은 조합이 있으면 백엔드가 409 로 막으므로,
 * 중복은 오류가 아니라 "건너뜀"으로 집계한다. 한 건이 실패해도 나머지는 계속.
 */
export async function copyInspectionOrders(
  orders: InspectionOrder[],
  targetDate: string,
): Promise<CopyOrdersResult> {
  const result: CopyOrdersResult = { created: 0, duplicated: 0, failed: 0 };
  for (const order of orders) {
    try {
      await createInspectionOrder({
        productId: order.product.id,
        equipmentId: order.equipment.id,
        workerIds: orderWorkers(order).map((w) => w.id),
        targetDate,
      });
      result.created += 1;
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 409) {
        result.duplicated += 1;
      } else {
        result.failed += 1;
      }
    }
  }
  return result;
}

export async function deleteInspectionOrder(orderId: number): Promise<void> {
  await http.delete<ApiResponse<Record<string, never>>>(
    `/inspection-order/${orderId}`,
  );
}
