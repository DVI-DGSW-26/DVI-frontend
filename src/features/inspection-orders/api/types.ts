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

// 검사 지시 생성/수정 body. PRODUCTION_MANAGER 가 생산 작업자에게 배정한다.
// workerIds 로 공동 작업자를 인원 제한 없이 지정할 수 있다(1명이어도 배열).
// (예전 모델의 qualityId 는 제거됨 — 검사 지시엔 순회검사 품질 담당자 배정이 없다.)
export interface CreateInspectionOrderRequest {
  productId: number;
  equipmentId: number;
  workerIds: number[];
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
  // 배정된 생산 작업자들. 단독 배정이어도 배열로 내려온다.
  workers: InspectionOrderUserRef[];
  /**
   * @deprecated 서버가 workers 배열로 바꿨다(단일 객체 → 배열).
   * 구버전 응답이 섞여 들어올 때만 쓰이는 폴백 — 화면에서 직접 참조하지 말고
   * orderWorkers() 를 쓸 것.
   */
  production?: InspectionOrderUserRef | null;
  targetDate: string;
  status: InspectionOrderStatus;
  createdAt: string;
  updatedAt: string;
}

export type EquipmentListResponse = ApiResponse<Equipment[]>;
export type ProductListResponse = ApiResponse<Product[]>;
export type InspectionOrderListResponse = ApiResponse<InspectionOrder[]>;
export type InspectionOrderDetailResponse = ApiResponse<InspectionOrder>;
