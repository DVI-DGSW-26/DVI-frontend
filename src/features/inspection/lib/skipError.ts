import { AxiosError } from "axios";
import i18n from "../../../lib/i18n";
import type { SkipInspectionErrorData } from "../type/types";

/**
 * POST /inspection/skip 실패 → 사용자에게 보여줄 문구.
 *
 * 홈(ProductionHomePage)과 시점 선택(ScanPage) 두 화면이 같은 API 를 쓰면서 각자
 * 에러를 처리하다 보니, INSPECTION_ALREADY_EXISTS 를 뺀 나머지가 전부 "건너뛰지
 * 못했습니다." 로 뭉개져 현장에서 원인 파악이 안 됐다. 분기를 여기 한 곳에 모은다.
 */
export function skipErrorMessage(err: unknown): string {
  if (!(err instanceof AxiosError)) return i18n.t("inspection:skipError.failed");

  const data = err.response?.data as SkipInspectionErrorData | undefined;
  switch (data?.code) {
    case "INSPECTION_ALREADY_EXISTS":
      // 이미 시작/완료/건너뜀 된 시점 — 목록이 오래된 상태일 때 주로 발생.
      return i18n.t("inspection:skipError.alreadyProcessed");
    case "NOT_ASSIGNED_PRODUCTION":
      return i18n.t("inspection:skipError.notAssigned");
    case "INVALID_INSPECTION_TYPE":
      return i18n.t("inspection:skipError.invalidType");
    case "INSPECTION_ORDER_NOT_FOUND":
      return i18n.t("inspection:skipError.orderNotFound");
    case "INSPECTION_ORDER_ALREADY_FINISHED":
      return i18n.t("inspection:skipError.orderFinished");
  }

  // 코드가 없거나 목록에 없는 값이면 서버 문구를 그대로 노출 — 원인 파악용.
  if (data?.message) return data.message;
  if (err.response == null) return i18n.t("inspection:skipError.network");
  return i18n.t("inspection:skipError.failed");
}

/** skip 직전 DRAFT 삭제 단계에서 실패한 경우 — skip 자체 실패와 구분해서 안내. */
export function skipDeleteDraftErrorMessage(): string {
  return i18n.t("inspection:skipError.deleteDraftFailed");
}

/**
 * @deprecated 언어 전환을 반영하지 못한다 — skipDeleteDraftErrorMessage() 사용.
 * (ProductionHomePage 등 기존 사용처와의 호환을 위해 남겨둔 값. 모듈 로드 시점 언어로 고정된다.)
 */
export const SKIP_DELETE_DRAFT_ERROR = i18n.t(
  "inspection:skipError.deleteDraftFailed",
);
