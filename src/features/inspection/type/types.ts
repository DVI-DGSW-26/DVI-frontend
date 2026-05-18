import type { ApiResponse } from "../../auth/type/types";
import type {
  MyInspection,
  MyInspectionStatus,
} from "../../my-inspection/type/types";

export interface InspectionDetailResult {
  resultId: number;
  dimNo: number;
  dimName: string;
  standardValue: number;
  tolerancePlus: number;
  toleranceMinus: number;
  productionValue: number | null;
  productionImageUrl: string | null;
}

export type InspectionDetail = MyInspection & {
  results: InspectionDetailResult[];
};

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
