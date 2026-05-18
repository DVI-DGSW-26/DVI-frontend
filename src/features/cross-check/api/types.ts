export type CrossCheckType =
  | "DAY_1"
  | "DAY_2"
  | "DAY_3"
  | "DAY_4"
  | "DAY_5"
  | "NIGHT_1"
  | "NIGHT_2"
  | "NIGHT_3"
  | "NIGHT_4"
  | "NIGHT_5";

export type CrossCheckStatus = "DRAFT" | "APPROVED" | "REJECTED";

export type ProcessType =
  | "EXTRUSION"
  | "AL_CUTTING"
  | "ST_CUTTING"
  | "MACHINING";

export interface ProductInfo {
  id: number;
  name: string;
  code: string;
  process: ProcessType;
  sketchUrl?: string;
}

export interface EquipmentInfo {
  id: number;
  name: string;
  process: ProcessType;
}

export interface CustomerInfo {
  id: number;
  name: string;
}

export interface ProductionInfo {
  id: number;
  name: string;
}

export interface CrossCheckSummary {
  crossCheckId: number;
  inspectionId: number;
  type: CrossCheckType;
  typeLabel: string;
  inspectionTime: string;
  product: ProductInfo;
  equipment: EquipmentInfo;
  customer: CustomerInfo;
  production: ProductionInfo;
  status: CrossCheckStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface DelegationInfo {
  delegatorId: number;
  delegatorName: string;
  delegateeId: number;
  delegateeName: string;
}
