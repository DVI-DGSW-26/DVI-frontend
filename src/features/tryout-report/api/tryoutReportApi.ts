import { http } from "../../../lib/http";
import type { ApiResponse, User } from "../../auth/type/types";
import type { Product } from "../../inspection-orders/api/types";
import type {
  CreateTryoutReportRequest,
  TryoutReportDetail,
  TryoutReportListParams,
  TryoutReportPrefill,
  TryoutReportSummary,
  UpdateTryoutReportRequest,
} from "./types";

export async function getTryoutReports(
  params: TryoutReportListParams = {},
): Promise<TryoutReportSummary[]> {
  const { data } = await http.get<ApiResponse<TryoutReportSummary[]>>(
    "/tryout-report",
    { params },
  );
  return data.data ?? [];
}

export async function getTryoutReportDetail(
  id: number,
): Promise<TryoutReportDetail> {
  const { data } = await http.get<ApiResponse<TryoutReportDetail>>(
    `/tryout-report/${id}`,
  );
  return data.data;
}

// 품번으로 제품을 고른 직후 — 고객사·품명·추천 차수·오늘 날짜·작성자·항목 행 뼈대.
export async function getTryoutReportPrefill(
  productId: number,
): Promise<TryoutReportPrefill> {
  const { data } = await http.get<ApiResponse<TryoutReportPrefill>>(
    "/tryout-report/prefill",
    { params: { productId } },
  );
  return data.data;
}

export async function createTryoutReport(
  body: CreateTryoutReportRequest,
): Promise<TryoutReportDetail> {
  const { data } = await http.post<ApiResponse<TryoutReportDetail>>(
    "/tryout-report",
    body,
  );
  return data.data;
}

// 화면 전체를 다시 보낸다 — 참석자와 항목 값은 보낸 내용으로 통째로 바뀐다.
export async function updateTryoutReport(
  id: number,
  body: UpdateTryoutReportRequest,
): Promise<TryoutReportDetail> {
  const { data } = await http.put<ApiResponse<TryoutReportDetail>>(
    `/tryout-report/${id}`,
    body,
  );
  return data.data;
}

export async function deleteTryoutReport(id: number): Promise<void> {
  await http.delete<ApiResponse<Record<string, never>>>(`/tryout-report/${id}`);
}

// 시압은 압출 공정 제품만. GET /product 에 검색 조건이 없어 받아서 거른다.
export async function getExtrusionProducts(): Promise<Product[]> {
  const { data } = await http.get<ApiResponse<Product[]>>("/product");
  return (data.data ?? []).filter((p) => p.process === "EXTRUSION");
}

// 책임자·참석자 후보. Swagger 상 GET /user 는 ADMIN 전용이라 다른 역할은 403 일 수 있다.
export async function getTryoutUsers(): Promise<User[]> {
  const { data } = await http.get<ApiResponse<User[]>>("/user");
  return data.data ?? [];
}
