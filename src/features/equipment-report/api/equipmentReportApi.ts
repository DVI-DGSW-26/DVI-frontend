import { http } from "../../../lib/http";
import type { ApiResponse } from "../../auth/type/types";
import type {
  CreateEquipmentReportRequest,
  EquipmentReportDetail,
  EquipmentReportListParams,
  EquipmentReportPage,
  EquipmentReportSummary,
} from "./types";

export const EQUIPMENT_REPORT_PAGE_SIZE = 20;

interface SpringPage<T> {
  content?: T[];
  last?: boolean;
  totalElements?: number;
}

export async function createEquipmentReport(
  body: CreateEquipmentReportRequest,
): Promise<EquipmentReportDetail> {
  const { data } = await http.post<ApiResponse<EquipmentReportDetail>>(
    "/equipment-report",
    body,
  );
  return data.data;
}

export async function getEquipmentReports(
  params: EquipmentReportListParams,
  page = 0,
  size = EQUIPMENT_REPORT_PAGE_SIZE,
): Promise<EquipmentReportPage> {
  const { data } = await http.get<ApiResponse<SpringPage<EquipmentReportSummary>>>(
    "/equipment-report",
    { params: { ...params, page, size } },
  );
  const p = data.data ?? {};
  const items = p.content ?? [];
  return {
    items,
    hasNext: typeof p.last === "boolean" ? !p.last : items.length >= size,
    totalElements: p.totalElements ?? items.length,
  };
}

export async function getEquipmentReport(id: number): Promise<EquipmentReportDetail> {
  const { data } = await http.get<ApiResponse<EquipmentReportDetail>>(
    `/equipment-report/${id}`,
  );
  return { ...data.data, imageUrls: data.data.imageUrls ?? [] };
}
