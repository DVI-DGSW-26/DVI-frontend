import { http } from "../../../lib/http";
import type { ApiResponse } from "../../auth/type/types";
import type {
  AssignedInspection,
  CrossCheckSummary,
  DelegationInfo,
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
