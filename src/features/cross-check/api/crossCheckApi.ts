import { http } from "../../../lib/http";
import type { ApiResponse } from "../../auth/type/types";
import type {
  AssignedInspection,
  CreateCrossCheckRequest,
  CrossCheckDetail,
  CrossCheckSummary,
  DecideCrossCheckRequest,
  DelegationInfo,
  SaveCrossCheckResultRequest,
} from "./types";

export async function getMyCrossChecks(
  includeFinished = false,
): Promise<CrossCheckSummary[]> {
  const { data } = await http.get<ApiResponse<CrossCheckSummary[]>>(
    "/cross-check/my",
    { params: { includeFinished } },
  );
  return data.data ?? [];
}

export async function getAssignedCrossChecks(): Promise<AssignedInspection[]> {
  const { data } = await http.get<ApiResponse<AssignedInspection[]>>(
    "/cross-check/assigned",
  );
  return data.data ?? [];
}

export async function getMyDelegation(): Promise<DelegationInfo | null> {
  const { data } = await http.get<ApiResponse<DelegationInfo | null>>(
    "/delegation/me",
  );
  return data.data ?? null;
}

export async function createCrossCheck(
  body: CreateCrossCheckRequest,
): Promise<CrossCheckDetail> {
  const { data } = await http.post<ApiResponse<CrossCheckDetail>>(
    "/cross-check",
    body,
  );
  return data.data;
}

export async function getCrossCheckDetail(
  crossCheckId: number,
): Promise<CrossCheckDetail> {
  const { data } = await http.get<ApiResponse<CrossCheckDetail>>(
    `/cross-check/${crossCheckId}`,
  );
  return data.data;
}

export async function saveCrossCheckResults(
  crossCheckId: number,
  body: SaveCrossCheckResultRequest,
): Promise<void> {
  await http.patch<ApiResponse<Record<string, never>>>(
    `/cross-check/${crossCheckId}/results`,
    body,
  );
}

export async function decideCrossCheck(
  crossCheckId: number,
  body: DecideCrossCheckRequest,
): Promise<void> {
  await http.post<ApiResponse<Record<string, never>>>(
    `/cross-check/${crossCheckId}/decision`,
    body,
  );
}
