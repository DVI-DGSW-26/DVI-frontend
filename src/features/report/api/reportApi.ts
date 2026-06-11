import { http } from "../../../lib/http";
import type { ApiResponse } from "../../auth/type/types";
import type { ReportDetail, ReportSummary } from "./types";

export async function getReports(): Promise<ReportSummary[]> {
  const { data } = await http.get<ApiResponse<ReportSummary[]>>("/report");
  return data.data ?? [];
}

export async function getReportDetail(reportId: number): Promise<ReportDetail> {
  const { data } = await http.get<ApiResponse<ReportDetail>>(
    `/report/${reportId}`,
  );
  return data.data;
}

// DELETE /report/{reportId} — 통합관리자(ADMIN)가 보고서(검사 1건)를 삭제 (hard delete).
// reports + report_results(측정 스냅샷)만 제거되고, 원본 inspection/cross-check 이력은 유지됨.
export async function deleteReport(reportId: number): Promise<void> {
  await http.delete<ApiResponse<Record<string, never>>>(`/report/${reportId}`);
}

export type DeleteReportErrorCode =
  | "ACCESS_DENIED" // ADMIN 이 아닌 사용자 (403)
  | "REPORT_NOT_FOUND"; // 이미 삭제됐거나 없는 보고서 (404)

export interface DeleteReportErrorData {
  code?: DeleteReportErrorCode;
  message?: string;
}
