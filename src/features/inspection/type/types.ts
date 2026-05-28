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
  // 가공(MACHINING) 공정 전용 — 작업자가 선택한 OK/NG 판정. 다른 공정은 null/undefined.
  passFailResult?: PassFailResult | null;
}

// 가공 공정에서 각 측정 항목에 부여하는 OK/NG 판정. 외관 검사용 AppearanceResult 와는 의미가 다르지만 값 도메인은 동일.
export type PassFailResult = "OK" | "NG";

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

// POST /inspection/{previousId}/next — 직전 검사의 같은 제품/설비로 다음 시점 검사 생성.
export type StartNextInspectionResponse = MyInspection;
export type StartNextInspectionApiResponse =
  ApiResponse<StartNextInspectionResponse>;

export type StartNextInspectionErrorCode =
  | "NO_NEXT_SLOT"
  | "PREVIOUS_INSPECTION_NOT_COMPLETED"
  | "INSPECTION_ALREADY_EXISTS";

export interface StartNextInspectionErrorData {
  code?: StartNextInspectionErrorCode;
  message?: string;
}

// POST /inspection/skip — 해당 시점을 건너뛰어 SKIPPED 상태 Inspection 생성.
export interface SkipInspectionRequest {
  productId: number;
  equipmentId: number;
  type: string;
  reason?: string;
}

export type SkipInspectionResponse = MyInspection;
export type SkipInspectionApiResponse = ApiResponse<SkipInspectionResponse>;

export type SkipInspectionErrorCode =
  | "INSPECTION_ALREADY_EXISTS"
  | "NOT_ASSIGNED_PRODUCTION"
  | "INVALID_INSPECTION_TYPE"
  | "PRODUCT_NOT_FOUND"
  | "EQUIPMENT_NOT_FOUND";

export interface SkipInspectionErrorData {
  code?: SkipInspectionErrorCode;
  message?: string;
}

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
  // 가공(MACHINING) 공정에서만 함께 전송. 다른 공정은 미포함.
  passFailResult?: PassFailResult;
}

export type AppearanceResult = "OK" | "NG";

export interface SaveResultsRequest {
  // 백엔드는 PATCH 시멘틱 — 보내지 않은 필드는 건드리지 않는다.
  // 외관/비고만 부분 업데이트하는 경우엔 results 를 생략한다.
  results?: InspectionResultPayload[];
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
  // 가공 공정 한정 — 작업자가 선택한 OK/NG 판정.
  passFailResult?: PassFailResult;
}

export interface IncompleteRequest {
  reason: string;
}
