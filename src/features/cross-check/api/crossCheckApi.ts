import { http } from "../../../lib/http";
import type { ApiResponse } from "../../auth/type/types";
import type { CrossCheckSummary, DelegationInfo } from "./types";

export async function getMyCrossChecks(): Promise<CrossCheckSummary[]> {
  const { data } = await http.get<ApiResponse<CrossCheckSummary[]>>(
    "/cross-check/my",
  );
  return data.data ?? [];
}

export async function getMyDelegation(): Promise<DelegationInfo | null> {
  const { data } = await http.get<ApiResponse<DelegationInfo | null>>(
    "/delegation/me",
  );
  return data.data ?? null;
}
