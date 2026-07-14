import { http } from "../../../lib/http";
import type { ApiResponse } from "../../auth/type/types";
import type { AdminInspection, AdminInspectionFilter } from "./types";

/**
 * GET /inspection/all — 관리자 전용 전체 자주검사 목록.
 *
 * ⚠️ 백엔드 신규 엔드포인트 필요. 기존 GET /inspection/my 는 "내가 진행한" 검사만
 * 돌려주므로(관리자가 호출하면 빈 목록) 관리자용으로 쓸 수 없다.
 * 계약: ADMIN 권한, 전체 자주검사, 항목별 production(작성자) 포함.
 */
export async function getAllInspections(
  filter: AdminInspectionFilter = {},
): Promise<AdminInspection[]> {
  const { data } = await http.get<ApiResponse<AdminInspection[]>>(
    "/inspection/all",
    {
      params: {
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.date ? { date: filter.date } : {}),
      },
    },
  );
  return data.data ?? [];
}

/**
 * DELETE /inspection/{id} — 관리자 권한으로 임의 자주검사 삭제.
 * 백엔드 권한: 본인(작성자) 또는 ADMIN. DRAFT 상태만 삭제 가능.
 */
export async function deleteInspectionAsAdmin(
  inspectionId: number,
): Promise<void> {
  await http.delete<ApiResponse<Record<string, never>>>(
    `/inspection/${inspectionId}`,
  );
}

export type DeleteInspectionErrorCode =
  | "INSPECTION_NOT_DELETABLE"
  | "NOT_OWNER";

export interface DeleteInspectionErrorData {
  code?: DeleteInspectionErrorCode;
  message?: string;
}
