import { AxiosError } from "axios";
import type { TFunction } from "i18next";
import { MAX_REPORT_IMAGES, type EquipmentReportErrorCode } from "../api/types";

// 신고 실패를 어느 칸 아래에 띄울지 가른다. t 는 equipmentReport 네임스페이스.
export interface ReportError {
  field: "equipment" | "photos" | "general";
  code?: EquipmentReportErrorCode;
  message: string;
}

export function toReportError(err: unknown, t: TFunction<"equipmentReport">): ReportError {
  if (!(err instanceof AxiosError)) {
    return { field: "general", message: t("errors.submitFailed") };
  }
  if (err.response?.status === 403) {
    return { field: "general", message: t("errors.forbidden") };
  }
  const data = err.response?.data as { code?: string; message?: string } | undefined;
  switch (data?.code) {
    case "EQUIPMENT_REQUIRED":
      return { field: "equipment", code: data.code, message: t("errors.equipmentRequired") };
    case "EQUIPMENT_NOT_FOUND":
      return { field: "equipment", code: data.code, message: t("errors.equipmentNotFound") };
    case "TOO_MANY_IMAGES":
      return {
        field: "photos",
        code: data.code,
        message: t("errors.tooManyImages", { max: MAX_REPORT_IMAGES }),
      };
  }
  return { field: "general", message: data?.message ?? t("errors.submitFailed") };
}

export function isNotFound(err: unknown): boolean {
  return err instanceof AxiosError && err.response?.status === 404;
}
