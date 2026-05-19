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
