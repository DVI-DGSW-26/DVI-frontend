import { AxiosError } from "axios";
import type { TFunction } from "i18next";

// 자주검사 재오픈(POST /inspection/{id}/reopen) 실패 문구. 홈·검사 이력이 같이 쓴다.
export function reopenErrorMessage(
  err: unknown,
  t: TFunction<"myInspection">,
): string {
  if (err instanceof AxiosError) {
    const code = (err.response?.data as { code?: string } | undefined)?.code;
    if (code === "INSPECTION_NOT_REOPENABLE") return t("toast.notReopenable");
    if (code === "INSPECTION_HAS_CROSS_CHECK") return t("toast.hasCrossCheck");
    if (code === "NOT_OWNER") return t("toast.reopenNotOwner");
  }
  return t("toast.reopenFailed");
}
