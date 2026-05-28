import type { ApiResponse } from "../../auth/type/types";

export type MyInspectionStatus =
  | "DRAFT"
  | "COMPLETED"
  | "INCOMPLETE"
  | "INCOMPLETE_APPROVED";

export interface MyInspectionProduct {
  id: number;
  name: string;
  code: string;
  process: string;
  sketchUrl: string;
}

export interface MyInspectionEquipment {
  id: number;
  name: string;
  process: string;
}

export interface MyInspectionCustomer {
  id: number;
  name: string;
}

export interface MyInspectionDim {
  // 백엔드 POST /inspection 응답 기준: dims[].id 가 PATCH 시 resultId 역할.
  // resultId 는 일부 응답에는 없으므로 optional.
  id: number;
  resultId?: number;
  dimNo: number;
  // dimName 응답 누락 가능성 대비 optional.
  dimName?: string;
  standardValue: number;
  tolerancePlus: number;
  toleranceMinus: number;
}

// 신규 명세는 작업자가 검사를 직접 시작하는 흐름. orderId 는 응답에 없을 수 있어 optional.
export interface MyInspection {
  inspectionId: number;
  orderId?: number;
  type: string;
  typeLabel: string;
  inspectionTime: string;
  product: MyInspectionProduct;
  equipment: MyInspectionEquipment;
  customer: MyInspectionCustomer;
  dims: MyInspectionDim[];
  status: MyInspectionStatus;
  // 날짜 필터링용. 백엔드가 보내주면 사용, 없으면 필터 통과.
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

export type MyInspectionListResponse = ApiResponse<MyInspection[]>;
