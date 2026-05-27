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

export type CrossCheckStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED";

export type ProcessType =
  | "EXTRUSION"
  | "AL_CUTTING"
  | "ST_CUTTING"
  | "MACHINING"
  | "PRESS";

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

// GET /cross-check/assigned 응답. 아직 순회검사가 시작 안 된 자주검사들.
// CrossCheckSummary 와 달리 crossCheckId / status / 중첩 객체가 없다.
export interface AssignedInspection {
  inspectionId: number;
  productName: string;
  productCode: string;
  process: ProcessType;
  equipmentName: string;
  productionName: string;
  type: CrossCheckType;
  typeLabel: string;
  inspectionTime: string;
  completedAt: string;
}

export interface DelegationInfo {
  delegatorId: number;
  delegatorName: string;
  delegateeId: number;
  delegateeName: string;
}

// 순회검사 측정 결과 한 항목. PATCH /cross-check/{id}/results 응답·요청과
// GET /cross-check/{id} 응답에서 사용한다. measuredValue/imageUrl 는 아직 안 찍었으면 null.
// productionValue/productionImageUrl 은 자주검사 단계에서 작업자가 입력한 측정값/사진 (순회검사 측정 시 참고용).
export interface CrossCheckResultInfo {
  resultId: number;
  dimId: number;
  dimNo: number;
  dimName?: string;
  standardValue: number;
  tolerancePlus: number;
  toleranceMinus: number;
  productionValue: number | null;
  productionImageUrl: string | null;
  measuredValue: number | null;
  imageUrl: string | null;
}

export type AppearanceResult = "OK" | "NG";

// GET /cross-check/{id}, POST /cross-check 응답 body. 측정 항목 + 외관/경도/비고/상태 포함.
export interface CrossCheckDetail {
  crossCheckId: number;
  inspectionId: number;
  type: CrossCheckType;
  typeLabel: string;
  inspectionTime: string;
  product: ProductInfo;
  equipment: EquipmentInfo;
  customer: CustomerInfo;
  production: ProductionInfo;
  results: CrossCheckResultInfo[];
  // 자주검사 단계에서 작업자가 기록한 외관 결과 (참고용).
  productionAppearanceResult: AppearanceResult | null;
  // 순회검사 단계 외관 결과. 승인 시 필수.
  appearanceResult: AppearanceResult | null;
  // 경도값. EXTRUSION 한정, 자유 텍스트, 승인 시 필수.
  hardnessResult: string | null;
  note: string | null;
  status: CrossCheckStatus;
  // status=REJECTED 일 때만 채워짐.
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCrossCheckRequest {
  inspectionId: number;
}

export interface CrossCheckResultItemPayload {
  resultId: number;
  measuredValue: number;
  imageUrl?: string;
}

export interface SaveCrossCheckResultRequest {
  results: CrossCheckResultItemPayload[];
  appearanceResult?: AppearanceResult;
  // EXTRUSION 한정. 승인 시 필수지만 PATCH 단계에서는 선택.
  hardnessResult?: string;
  note?: string;
}

export type CrossCheckDecision = "APPROVE" | "REJECT";

export interface DecideCrossCheckRequest {
  decision: CrossCheckDecision;
  // REJECT 일 때만 필수.
  rejectReason?: string;
}
