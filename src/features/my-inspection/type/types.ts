import type { ApiResponse } from "../../auth/type/types";
import type { Shift } from "../../inspection-schedule/api";

// 검사 항목 종류 — 제품 등록 시 항목별로 지정.
// NUMBER = 치수(측정값 입력), PASS_FAIL = 사진·측정값 없이 OK/NG 만 선택.
export type InspectionValueType = "NUMBER" | "PASS_FAIL";

export type MyInspectionStatus =
  | "DRAFT"
  | "COMPLETED"
  | "INCOMPLETE"
  | "INCOMPLETE_APPROVED"
  | "SKIPPED";

export interface MyInspectionProduct {
  id: number;
  name: string;
  code: string;
  process: string;
  sketchUrl: string;
}

export interface MyInspectionEquipment {
  id: number;
  name: string;
  process: string;
}

export interface MyInspectionCustomer {
  id: number;
  name: string;
}

export interface MyInspectionDim {
  // 백엔드 POST /inspection 응답 기준: dims[].id 가 PATCH 시 resultId 역할.
  // resultId 는 일부 응답에는 없으므로 optional.
  id: number;
  resultId?: number;
  dimNo: number;
  // dimName 응답 누락 가능성 대비 optional.
  dimName?: string;
  standardValue: number;
  // 부호 포함 편차. 최대 허용값 = standardValue + toleranceUpper,
  // 최소 허용값 = standardValue + toleranceLower (보통 upper >= 0, lower <= 0).
  // 도면 표기를 그대로 옮긴다 — "86 -0.25/-0.4" 면 upper=-0.25, lower=-0.4.
  toleranceUpper: number;
  toleranceLower: number;
  // 검사 항목 종류. PASS_FAIL 이면 측정값 없이 OK/NG 만 입력. 누락 시 NUMBER 로 간주.
  valueType?: InspectionValueType;
}

// 신규 명세는 작업자가 검사를 직접 시작하는 흐름. orderId 는 응답에 없을 수 있어 optional.
export interface MyInspection {
  inspectionId: number;
  orderId?: number;
  type: string;
  typeLabel: string;
  // 주/야 표시는 이 값으로만 한다 (type 은 슬롯 순서용 내부 식별자).
  shift?: Shift;
  inspectionTime: string;
  product: MyInspectionProduct;
  equipment: MyInspectionEquipment;
  customer: MyInspectionCustomer;
  dims: MyInspectionDim[];
  status: MyInspectionStatus;
  // 연결된 순회검사가 시작/존재하면 true. true 면 자주 reopen 불가 (백엔드가 거부).
  // 자주검사자 홈의 "수정 가능한 검사" 섹션에서 거르기 위함.
  hasCrossCheck?: boolean;
  // 날짜 필터링용. 백엔드가 보내주면 사용, 없으면 필터 통과.
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

export type MyInspectionListResponse = ApiResponse<MyInspection[]>;
