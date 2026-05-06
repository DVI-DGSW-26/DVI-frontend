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
