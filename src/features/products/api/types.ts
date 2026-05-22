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

export interface ProductDim {
  id: number;
  dimNo: number;
  dimName: string;
  standardValue: number;
  tolerancePlus: number;
  toleranceMinus: number;
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
  dimNo: number;
  dimName: string;
  standardValue: number;
  tolerancePlus: number;
  toleranceMinus: number;
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
