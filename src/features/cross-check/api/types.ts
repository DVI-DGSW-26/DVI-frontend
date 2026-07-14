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
  // 압출 종품 경도값 (없으면 null). 결재 대기 목록의 "경도 대기" 표시용.
  hardnessResult?: string | null;
  // 압출 종품인데 경도 미입력 → true. 승인 시 경도 입력 필수.
  hardnessPending?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// GET /cross-check/assigned 응답. 시작 가능(AVAILABLE) 또는 이미 시작된(IN_PROGRESS) 건.
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
  // 검사(자주검사)를 시작한 날짜. 백엔드가 보내주면 목록에 표시, 없으면 숨김.
  createdAt?: string;
  // 선점 상태 — IN_PROGRESS 면 이미 다른(또는 본인) 담당자가 시작한 건.
  status?: "AVAILABLE" | "IN_PROGRESS";
  // 진행 중일 때 담당자 이름.
  ownerName?: string | null;
  // 진행 중일 때 시작된 순회검사 id.
  crossCheckId?: number | null;
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
  // 항목(dim) 단위 건너뜀 여부. skipped 인 항목은 complete 시 measuredValue 검증 면제.
  skipped?: boolean;
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
  // production.name 이 자주검사자(작업자) 이름.
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
  // 건너뜀(skipped=true) 항목은 measuredValue 없이 저장 가능.
  measuredValue?: number;
  imageUrl?: string;
  // 항목 단위 건너뜀. true 면 complete 검증에서 이 항목 measuredValue 검사 면제.
  skipped?: boolean;
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
  // 압출 종품 APPROVE 시 필수. 입력 시 저장 후 발행. (그 외 공정/차수는 무시)
  hardnessResult?: string;
}
