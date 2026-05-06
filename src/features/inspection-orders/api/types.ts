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

export interface CreateInspectionOrderRequest {
  productId: number;
  equipmentId: number;
  productionId: number;
  qualityId: number;
  targetDate: string;
}

export type InspectionOrderStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELED"
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
  production: InspectionOrderUserRef;
  quality: InspectionOrderUserRef;
  targetDate: string;
  status: InspectionOrderStatus;
  createdAt: string;
  updatedAt: string;
}

export type EquipmentListResponse = ApiResponse<Equipment[]>;
export type ProductListResponse = ApiResponse<Product[]>;
export type InspectionOrderListResponse = ApiResponse<InspectionOrder[]>;
