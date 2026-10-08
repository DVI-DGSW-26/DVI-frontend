import { AxiosError } from "axios";
import type { TFunction } from "i18next";
import type { TryoutErrorCode } from "../api/types";

// 저장 실패를 어느 칸에 띄울지 가른다. 차수 중복은 차수 칸 바로 아래에 보여야
// 사용자가 무엇을 고칠지 안다. t 는 tryoutReport 네임스페이스.
export interface SaveError {
  field: "roundNo" | "items" | "general";
  message: string;
}

export function toSaveError(err: unknown, t: TFunction<"tryoutReport">): SaveError {
  if (!(err instanceof AxiosError)) {
    return { field: "general", message: err instanceof Error ? err.message : t("errors.saveFailed") };
  }
  const data = err.response?.data as { code?: TryoutErrorCode | string; message?: string } | undefined;
  switch (data?.code) {
    case "TRYOUT_ROUND_DUPLICATED":
      return { field: "roundNo", message: t("errors.roundDuplicated") };
    case "TRYOUT_ITEM_INVALID":
      return { field: "items", message: data.message ?? t("errors.itemInvalid") };
    case "TRYOUT_REPORT_FORBIDDEN":
      return { field: "general", message: t("errors.forbidden") };
  }
  return { field: "general", message: data?.message ?? t("errors.saveFailed") };
}

export function isForbidden(err: unknown): boolean {
  return err instanceof AxiosError && err.response?.status === 403;
}

export function toDeleteErrorMessage(err: unknown, t: TFunction<"tryoutReport">): string {
  if (isForbidden(err)) return t("errors.forbidden");
  const data = err instanceof AxiosError ? (err.response?.data as { message?: string } | undefined) : undefined;
  return data?.message ?? t("deleteModal.failed");
}
