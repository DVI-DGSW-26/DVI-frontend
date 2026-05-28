import { http } from "../../../lib/http";
import type { ApiResponse } from "../../auth/type/types";
import type {
  MyInspection,
  MyInspectionListResponse,
} from "../type/types";

export interface MyInspectionsOptions {
  /** true 면 COMPLETED/INCOMPLETE_APPROVED 등 종결된 검사까지 포함 — 기본 false. */
  includeFinished?: boolean;
}

export async function getMyInspections(
  opts: MyInspectionsOptions = {},
): Promise<MyInspection[]> {
  const { data } = await http.get<MyInspectionListResponse>("/inspection/my", {
    params: opts.includeFinished ? { includeFinished: true } : undefined,
  });
  return data.data ?? [];
}

// DELETE /inspection/{id} — DRAFT 상태인 본인 검사 한 건을 삭제. 측정값 함께 사라짐.
// 백엔드는 INSPECTION_NOT_DELETABLE / NOT_OWNER 코드를 반환 가능.
export async function deleteInspection(inspectionId: number): Promise<void> {
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
