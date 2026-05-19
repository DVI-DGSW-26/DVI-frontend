import type { ApiResponse } from "../../auth/type/types";
import type {
  MyInspection,
  MyInspectionCustomer,
  MyInspectionEquipment,
  MyInspectionProduct,
  MyInspectionStatus,
} from "../../my-inspection/type/types";

// GET /inspection/{id} 응답의 results 한 항목.
export interface InspectionDetailResult {
  resultId: number;
  dimId: number;
  dimNo: number;
  dimName: string;
  standardValue: number;
  tolerancePlus: number;
  toleranceMinus: number;
  measuredValue: number | null;
  imageUrl: string | null;
}

// GET /inspection/{id} 응답 본체. MyInspection 과는 별개 (dims 없음, results 와 부가 필드 있음).
export interface InspectionDetail {
  inspectionId: number;
  orderId: number;
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
  createdAt: string;
  updatedAt: string;
}

export type InspectionDetailApiResponse = ApiResponse<InspectionDetail>;

export type InspectionProcess =
  | "EXTRUSION"
  | "AL_CUTTING"
  | "ST_CUTTING"
  | "MACHINING";

export interface InspectionSlot {
  type: string;
  label: string;
  time: string;
}

export interface StartInspectionRequest {
  orderId: number;
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
  | "PREVIOUS_INSPECTION_NOT_COMPLETED";

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
}

export type CompleteInspectionErrorCode = "RESULTS_NOT_COMPLETE";

export interface ApiErrorData {
  code?: string;
  message?: string;
}

export type StepStatus = "completed" | "skipped";

export interface StepResult {
  dimNo: number;
  dimName: string;
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
