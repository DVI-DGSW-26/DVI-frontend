// 시압(압출 T/O) 결과보고서 — Swagger "시압 결과보고서 API" 그대로.

// 고정 공정 항목 15개 + 제품 치수 행(DIM). 항목 이름은 서버가 주지 않아
// 화면 문구는 lib/itemCatalog 에서 이 코드로 찾는다.
export type TryoutItemType =
  | "BILLET_PREHEAT_TEMP"
  | "DIE_PREHEAT_TEMP"
  | "CONTAINER_TEMP"
  | "RAM_SPEED"
  | "EXIT_TEMP"
  | "QUENCH_TEMP"
  | "BUTT_LENGTH"
  | "STRETCH_TIME"
  | "RELAX_TIME"
  | "SCRAP_CUT_FRONT"
  | "SCRAP_CUT_REAR"
  | "PRODUCT_CUT_LENGTH"
  | "ETCHING_JOINT_TEST"
  | "ETCHING_CORE_PATTERN"
  | "APPEARANCE"
  | "DIM";

// NUMBER=숫자 입력+서버 자동 판정, PASS_FAIL=OK/NG 직접 선택, PHOTO=사진+OK/NG 직접 선택
export type TryoutValueType = "NUMBER" | "PASS_FAIL" | "PHOTO";

export type TryoutItemResult = "OK" | "NG";

// 진행결과 종합평가. SPECIAL_ACCEPT = 특채
export type TryoutOverallResult = "OK" | "NG" | "SPECIAL_ACCEPT" | "REWORK";

export interface TryoutUser {
  id: number;
  name: string;
}

export interface TryoutItem {
  itemType: TryoutItemType;
  dimNo?: number | null;
  dimName?: string | null;
  valueType: TryoutValueType;
  unit?: string | null;
  standardValue?: number | null;
  // 부호 포함 편차. 비어 있으면 그쪽은 제한 없음.
  toleranceLower?: number | null;
  toleranceUpper?: number | null;
  measuredValue?: number | null;
  imageUrl?: string | null;
  // 판정할 수 없으면 null
  result?: TryoutItemResult | null;
  note?: string | null;
}

export interface TryoutReportPrefill {
  productId: number;
  productCode: string;
  productName: string;
  customerName: string;
  suggestedRoundNo: number;
  conductedOn: string;
  author: TryoutUser;
  // 고정 15행 + 제품 활성 치수 행(치수 번호 순)
  items: TryoutItem[];
}

export interface TryoutReportSummary {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  customerName: string;
  roundNo: number;
  conductedOn: string;
  author: TryoutUser | null;
  manager: TryoutUser | null;
  overallResult: TryoutOverallResult | null;
}

export interface TryoutReportDetail extends TryoutReportSummary {
  attendees: TryoutUser[];
  items: TryoutItem[];
  createdAt: string;
  updatedAt: string;
}

export interface TryoutItemRequest {
  itemType: TryoutItemType;
  dimNo?: number;
  unit?: string;
  standardValue?: number | null;
  toleranceLower?: number | null;
  toleranceUpper?: number | null;
  measuredValue?: number | null;
  imageUrl?: string | null;
  // 숫자 항목은 서버가 판정하므로 보내도 무시된다.
  result?: TryoutItemResult | null;
  note?: string | null;
}

export interface UpdateTryoutReportRequest {
  roundNo: number;
  conductedOn: string;
  managerId?: number | null;
  attendeeIds?: number[];
  overallResult?: TryoutOverallResult | null;
  items: TryoutItemRequest[];
}

export interface CreateTryoutReportRequest extends UpdateTryoutReportRequest {
  productId: number;
}

export interface TryoutReportListParams {
  productId?: number;
  from?: string;
  to?: string;
}

export type TryoutErrorCode =
  | "TRYOUT_ROUND_DUPLICATED" // 409 같은 제품에 같은 차수
  | "TRYOUT_ITEM_INVALID" // 400 없는 치수 번호, 같은 항목 두 번, 하한 > 상한
  | "TRYOUT_REPORT_FORBIDDEN"; // 403 작성자도 관리자도 아님
