import type { ApiResponse } from "../../auth/type/types";
import type {
  MyInspection,
  MyInspectionCustomer,
  MyInspectionEquipment,
  MyInspectionProduct,
  MyInspectionStatus,
} from "../../my-inspection/type/types";

// GET /inspection/{id} 응답의 results 한 항목.
// dimName 은 응답에 포함되지 않을 수 있어 optional — 누락 시 호출부에서 fallback 처리.
export interface InspectionDetailResult {
  resultId: number;
  dimId: number;
  dimNo: number;
  dimName?: string;
  standardValue: number;
  tolerancePlus: number;
  toleranceMinus: number;
  measuredValue: number | null;
  imageUrl: string | null;
}

// GET /inspection/{id} 응답 본체. MyInspection 과는 별개 (dims 없음, results 와 부가 필드 있음).
// orderId 는 신규 흐름(작업자 직접 시작) 응답에는 없을 수 있어 optional.
export interface InspectionDetail {
  inspectionId: number;
  orderId?: number;
  type: string;
  typeLabel: string;
  inspectionTime: string | null;
  product: MyInspectionProduct;
  equipment: MyInspectionEquipment;
  customer: MyInspectionCustomer;
  results: InspectionDetailResult[];
  appearanceResult: AppearanceResult | null;
  status: MyInspectionStatus;
  incompleteReason: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type InspectionDetailApiResponse = ApiResponse<InspectionDetail>;

export type InspectionProcess =
  | "EXTRUSION"
  | "AL_CUTTING"
  | "ST_CUTTING"
  | "MACHINING"
  | "PRESS";

export interface InspectionSlot {
  type: string;
  label: string;
  time: string;
}

// POST /inspection — 작업자가 직접 제품/설비를 선택해서 시작.
// 검사 지시 사전 등록은 더 이상 필수가 아니다 (orderId 제거됨).
export interface StartInspectionRequest {
  productId: number;
  equipmentId: number;
  type: string;
}

export type StartInspectionResponse = MyInspection;

export type InspectionStartStatus = MyInspectionStatus;

export type InspectionSlotsResponse = ApiResponse<InspectionSlot[]>;
export type StartInspectionApiResponse = ApiResponse<StartInspectionResponse>;

export type StartInspectionErrorCode =
  | "NOT_ASSIGNED_PRODUCTION"
  | "INVALID_INSPECTION_TYPE"
  | "INSPECTION_ALREADY_EXISTS"
  | "PREVIOUS_INSPECTION_NOT_COMPLETED"
  | "PRODUCT_NOT_FOUND"
  | "EQUIPMENT_NOT_FOUND";

export interface StartInspectionErrorData {
  code?: StartInspectionErrorCode;
  message?: string;
  data?: { inspectionId?: number };
}

export interface UploadImageResponseData {
  url: string;
}

export type UploadImageApiResponse = ApiResponse<UploadImageResponseData>;

export type UploadImageErrorCode =
  | "EMPTY_FILE"
  | "INVALID_EXTENSION"
  | "UPLOAD_FAILED";

export interface OcrResponseData {
  value: string | null;
}

export type OcrApiResponse = ApiResponse<OcrResponseData>;

export interface InspectionResultPayload {
  resultId: number;
  measuredValue: number;
  imageUrl: string;
}

export type AppearanceResult = "OK" | "NG";

export interface SaveResultsRequest {
  results: InspectionResultPayload[];
  appearanceResult?: AppearanceResult;
  // 설비 이상/특이사항 자유 텍스트. 보고서 비고란에 표시됨. 선택.
  note?: string;
}

export type CompleteInspectionErrorCode =
  | "RESULTS_NOT_COMPLETE"
  | "APPEARANCE_REQUIRED";

export interface ApiErrorData {
  code?: string;
  message?: string;
}

export type StepStatus = "completed" | "skipped";

export interface StepResult {
  dimNo: number;
  // dimName 누락 응답 대비 — optional.
  dimName?: string;
  standardValue: number;
  tolerancePlus: number;
  toleranceMinus: number;
  status: StepStatus;
  measuredValue?: number;
  imageUrl?: string;
}

export interface IncompleteRequest {
  reason: string;
}
