import { http } from "../../../lib/http";
import type { ApiResponse } from "../../auth/type/types";
import type { DashboardStatsResponse, DashboardUser } from "./types";

export async function getDashboardStats(): Promise<DashboardStatsResponse> {
  const { data } = await http.get<ApiResponse<DashboardStatsResponse>>(
    "/admin/dashboard/stats",
  );
  return data.data;
}

export async function getPendingUsers(): Promise<DashboardUser[]> {
  const { data } = await http.get<ApiResponse<DashboardUser[]>>("/user");
  const list = data.data ?? [];
  return list
    .filter((u) => u.status === "PENDING")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
