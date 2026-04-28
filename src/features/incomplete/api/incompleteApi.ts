import { http } from "../../../lib/http";
import type { ApiResponse } from "../../auth/type/types";
import type { Decision, Incomplete } from "../type/types";

export async function getIncomplete(): Promise<Incomplete[]> {
  const { data } = await http.get<ApiResponse<Incomplete[]>>("/incomplete");
  return data.data ?? [];
}

export async function postIncompleteDecision(
  inspectionId: number,
  decision: Decision,
): Promise<void> {
  await http.post<ApiResponse<Record<string, never>>>(
    `/incomplete/${inspectionId}/decision`,
    { decision },
  );
}
