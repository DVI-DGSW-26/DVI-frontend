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
  dimName: string;
  standardValue: number;
  tolerancePlus: number;
  toleranceMinus: number;
}

export interface MyInspection {
  inspectionId: number;
  orderId: number;
  type: string;
  typeLabel: string;
  inspectionTime: string;
  product: MyInspectionProduct;
  equipment: MyInspectionEquipment;
  customer: MyInspectionCustomer;
  dims: MyInspectionDim[];
  status: MyInspectionStatus;
}

export type MyInspectionListResponse = ApiResponse<MyInspection[]>;

// GET /inspection/assigned — 내게 배정된 자주검사 중 아직 시작 안 한 슬롯.
// 슬롯 단위로 펼쳐서 응답. 시퀀스 룰은 시작 시점에 검증되고 목록에는 모두 포함.
export interface AssignedSlot {
  orderId: number;
  productName: string;
  productCode: string;
  process: string;
  equipmentName: string;
  customerName: string;
  targetDate: string;
  type: string;
  typeLabel: string;
  inspectionTime: string;
}

export type AssignedSlotListResponse = ApiResponse<AssignedSlot[]>;
