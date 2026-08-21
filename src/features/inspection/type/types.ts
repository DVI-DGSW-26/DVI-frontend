import type { ApiResponse } from "../../auth/type/types";
import type { Shift } from "../../inspection-schedule/api";
import type {
  InspectionValueType,
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
  toleranceUpper: number;
  toleranceLower: number;
  // 검사 항목 종류. PASS_FAIL 항목은 기준값/공차/측정값 없이 OK/NG 만 입력.
  // 누락 응답(구형) 대비 optional — 없으면 NUMBER 로 간주.
  valueType?: InspectionValueType;
  measuredValue: number | null;
  imageUrl: string | null;
  // 작업자가 선택한 OK/NG 판정. 가공(MACHINING) 공정 또는 PASS_FAIL 항목에서 사용.
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
  // 이 검사가 주간인지 야간인지. type 접두어로 추론하지 말고 이 값을 쓸 것.
  shift?: Shift;
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

// 공정은 관리자가 등록·수정하는 DB 데이터라 값을 고정할 수 없다(GET /process).
// 표시명·분기 판단은 features/process 의 useProcessLabel / useProcessInfo 로 한다.
export type InspectionProcess = string;

export interface InspectionSlot {
  // 슬롯 식별자(DAY_1, NIGHT_3 ...). 순서를 매기는 내부 값일 뿐이라
  // 여기서 주/야를 추론하면 안 된다 — 주/야는 아래 shift 로만 판단한다.
  type: string;
  label: string;
  // 초·중·종처럼 고정 시각이 없는 슬롯은 null.
  time: string | null;
  shift?: Shift;
}

// POST /inspection — 배정받은 작업지시(orderId) 안에서 시점(type)을 골라 시작한다.
// 제품·설비는 오더에 이미 들어 있어 보내지 않는다. 배정된 오더가 없으면 검사를
// 시작할 수 없다 — 서버가 더 이상 오더를 자동 생성하지 않는다.
export interface StartInspectionRequest {
  orderId: number;
  type: string;
}

export type StartInspectionResponse = MyInspection;

export type InspectionStartStatus = MyInspectionStatus;

export type InspectionSlotsResponse = ApiResponse<InspectionSlot[]>;
export type StartInspectionApiResponse = ApiResponse<StartInspectionResponse>;

export type StartInspectionErrorCode =
  | "INSPECTION_ORDER_NOT_FOUND"
  | "NOT_ASSIGNED_PRODUCTION"
  | "INSPECTION_ORDER_ALREADY_FINISHED"
  | "INVALID_INSPECTION_TYPE"
  | "DIMS_NOT_REGISTERED"
  | "INSPECTION_ALREADY_EXISTS"
  | "PREVIOUS_INSPECTION_NOT_COMPLETED";

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
// 시작(POST /inspection)과 같이 작업지시 기준이다.
export interface SkipInspectionRequest {
  orderId: number;
  type: string;
  reason?: string;
}

export type SkipInspectionResponse = MyInspection;
export type SkipInspectionApiResponse = ApiResponse<SkipInspectionResponse>;

export type SkipInspectionErrorCode =
  | "INSPECTION_ORDER_NOT_FOUND"
  | "INSPECTION_ORDER_ALREADY_FINISHED"
  | "INSPECTION_ALREADY_EXISTS"
  | "NOT_ASSIGNED_PRODUCTION"
  | "INVALID_INSPECTION_TYPE";

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
  // PASS_FAIL 항목은 측정값 없이 저장하므로 optional. NUMBER 항목은 항상 포함해 보낸다.
  measuredValue?: number;
  // 사진 없이 측정값만 입력하는 경우 생략 (백엔드에서 미수신 시 기존 imageUrl 유지).
  imageUrl?: string;
  // 가공(MACHINING) 공정 또는 PASS_FAIL 항목에서 함께 전송. 그 외엔 미포함.
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
  toleranceUpper: number;
  toleranceLower: number;
  status: StepStatus;
  // 항목 종류 — 결과 표시 분기에 사용. 없으면 NUMBER 로 간주.
  valueType?: InspectionValueType;
  measuredValue?: number;
  imageUrl?: string;
  // 가공 공정 또는 PASS_FAIL 항목 — 작업자가 선택한 OK/NG 판정.
  passFailResult?: PassFailResult;
}

export interface IncompleteRequest {
  reason: string;
}

// 품질 문제(금형 교체 등) 조기 마감 요청. 사유는 선택.
export interface TerminateRequest {
  reason?: string;
}
