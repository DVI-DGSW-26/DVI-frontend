import { AxiosError } from "axios";
import type { SkipInspectionErrorData } from "../type/types";

/**
 * POST /inspection/skip 실패 → 사용자에게 보여줄 문구.
 *
 * 홈(ProductionHomePage)과 시점 선택(ScanPage) 두 화면이 같은 API 를 쓰면서 각자
 * 에러를 처리하다 보니, INSPECTION_ALREADY_EXISTS 를 뺀 나머지가 전부 "건너뛰지
 * 못했습니다." 로 뭉개져 현장에서 원인 파악이 안 됐다. 분기를 여기 한 곳에 모은다.
 */
export function skipErrorMessage(err: unknown): string {
  if (!(err instanceof AxiosError)) return "건너뛰지 못했습니다.";

  const data = err.response?.data as SkipInspectionErrorData | undefined;
  switch (data?.code) {
    case "INSPECTION_ALREADY_EXISTS":
      // 이미 시작/완료/건너뜀 된 시점 — 목록이 오래된 상태일 때 주로 발생.
      return "이미 처리된 시점입니다.";
    case "NOT_ASSIGNED_PRODUCTION":
      return "배정되지 않은 검사라 건너뛸 수 없습니다.";
    case "INVALID_INSPECTION_TYPE":
      return "존재하지 않는 시점입니다. 새로고침 후 다시 시도해주세요.";
    case "PRODUCT_NOT_FOUND":
      return "제품 정보를 찾을 수 없습니다.";
    case "EQUIPMENT_NOT_FOUND":
      return "설비 정보를 찾을 수 없습니다.";
  }

  // 코드가 없거나 목록에 없는 값이면 서버 문구를 그대로 노출 — 원인 파악용.
  if (data?.message) return data.message;
  if (err.response == null) return "네트워크 오류로 건너뛰지 못했습니다.";
  return "건너뛰지 못했습니다.";
}

/** skip 직전 DRAFT 삭제 단계에서 실패한 경우 — skip 자체 실패와 구분해서 안내. */
export const SKIP_DELETE_DRAFT_ERROR =
  "작성 중이던 검사를 정리하지 못해 건너뛰지 못했습니다.";
