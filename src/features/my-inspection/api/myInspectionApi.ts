import { http } from "../../../lib/http";
import type { MyInspection, MyInspectionListResponse } from "../type/types";

export async function getMyInspections(): Promise<MyInspection[]> {
  const { data } = await http.get<MyInspectionListResponse>("/inspection/my");
  return data.data ?? [];
}
