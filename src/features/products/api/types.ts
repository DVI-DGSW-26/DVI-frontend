import type { ApiResponse } from "../../auth/type/types";

export type ProcessType =
  | "EXTRUSION"
  | "AL_CUTTING"
  | "ST_CUTTING"
  | "MACHINING"
  | "PRESS";

export interface ProductCustomerRef {
  id: number;
  name: string;
}

export interface ProductListItem {
  id: number;
  customer: ProductCustomerRef;
  name: string;
  code: string;
  process: ProcessType | string;
  isActive: boolean;
  dimCount: number;
  createdAt: string;
}

// 항목 종류 — NUMBER: 측정값 입력 후 자동 PASS/FAIL.
// PASS_FAIL: 작업자가 OK/NG 직접 선택. 미지정 시 NUMBER (백엔드 기본값).
export type ProductValueType = "NUMBER" | "PASS_FAIL";

export interface ProductDim {
  id: number;
  dimNo: number;
  // 백엔드 응답에 누락될 수 있어 optional. 폼 복원 시 빈 문자열로 fallback.
  dimName?: string;
  // PASS_FAIL 항목엔 의미 없지만 백엔드가 어떤 값으로 내려보낼지 모르므로 그대로 받음.
  standardValue: number;
  tolerancePlus: number;
  toleranceMinus: number;
  valueType?: ProductValueType;
}

export interface ProductDetail {
  id: number;
  customer: ProductCustomerRef;
  name: string;
  code: string;
  process: ProcessType | string;
  isActive: boolean;
  sketchUrl: string | null;
  dims: ProductDim[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductDimInput {
  // 기존 dim 은 id 를 실어 보낸다 → 백엔드가 통째 교체 대신 id 기준 in-place 수정 가능.
  // (검사·보고서가 이미 참조 중인 dim 도 값/이름은 수정되도록.) 신규 항목은 id 없음.
  id?: number;
  dimNo: number;
  dimName: string;
  // PASS_FAIL 항목은 standardValue/공차 불필요 — payload 생성 시 omit.
  standardValue?: number;
  tolerancePlus?: number;
  toleranceMinus?: number;
  valueType?: ProductValueType;
}

export interface CreateProductRequest {
  customerId: number;
  name: string;
  code: string;
  process: ProcessType;
  sketchUrl?: string | null;
  dims: ProductDimInput[];
}

export type UpdateProductRequest = Partial<CreateProductRequest>;

export type ProductListResponse = ApiResponse<ProductListItem[]>;
export type ProductDetailResponse = ApiResponse<ProductDetail>;
