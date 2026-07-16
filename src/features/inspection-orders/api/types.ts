import type { ApiResponse } from "../../auth/type/types";

export interface Equipment {
  id: number;
  name: string;
  process: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCustomer {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  customer: ProductCustomer;
  name: string;
  code: string;
  process: string;
  isActive: boolean;
  dimCount: number;
  createdAt: string;
}

// 검사 지시 생성/수정 body. PRODUCTION_MANAGER 가 생산 작업자(productionId)에게 배정.
// (예전 모델의 qualityId 는 제거됨 — 검사 지시엔 순회검사 품질 담당자 배정이 없다.)
export interface CreateInspectionOrderRequest {
  productId: number;
  equipmentId: number;
  productionId: number;
  targetDate: string;
}

export type InspectionOrderStatus =
  | "PENDING"
  | "DRAFT"
  | "INCOMPLETE"
  | "INCOMPLETE_APPROVED"
  | "COMPLETED"
  | string;

export interface InspectionOrderProduct {
  id: number;
  name: string;
  code: string;
  process: string;
  sketchUrl: string;
}

export interface InspectionOrderEquipment {
  id: number;
  name: string;
  process: string;
}

export interface InspectionOrderUserRef {
  id: number;
  name: string;
}

export interface InspectionOrderCustomer {
  id: number;
  name: string;
}

export interface InspectionOrder {
  id: number;
  product: InspectionOrderProduct;
  equipment: InspectionOrderEquipment;
  customer: InspectionOrderCustomer;
  // 배정된 생산 작업자.
  production: InspectionOrderUserRef;
  targetDate: string;
  status: InspectionOrderStatus;
  createdAt: string;
  updatedAt: string;
}

export type EquipmentListResponse = ApiResponse<Equipment[]>;
export type ProductListResponse = ApiResponse<Product[]>;
export type InspectionOrderListResponse = ApiResponse<InspectionOrder[]>;
export type InspectionOrderDetailResponse = ApiResponse<InspectionOrder>;
