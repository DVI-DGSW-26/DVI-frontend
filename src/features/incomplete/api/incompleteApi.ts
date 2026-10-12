import { http } from "../../../lib/http";
import type { ApiResponse } from "../../auth/type/types";
import type { Decision, Incomplete, MissedInspection } from "../type/types";

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

// 끝나지 않은 검사 시점 전부(시작 안 함·미완료·승인 종결·건너뜀). 서버가 작업지시 시점 목록과
// 자주검사 상태로 계산한다. 보고서 발행·조기 마감된 작업지시는 빠진다.
// processes 가 비어 있으면 전체 공정. 공정은 반복 파라미터(?process=A&process=B)로 보낸다.
export async function getMissedInspections(
  processes: string[] = [],
): Promise<MissedInspection[]> {
  const { data } = await http.get<ApiResponse<MissedInspection[]>>(
    "/incomplete/missed",
    {
      params: processes.length ? { process: processes } : undefined,
      paramsSerializer: { indexes: null },
    },
  );
  return data.data ?? [];
}

// 사유 없이 낸 미완료(순회검사자가 사유를 적을 차례) — 건수 표시용. 공정 필터 없이 전체.
export async function getAwaitingReason(): Promise<Incomplete[]> {
  const { data } = await http.get<ApiResponse<Incomplete[]>>(
    "/incomplete/awaiting-reason",
  );
  return data.data ?? [];
}

// 순회검사자가 미완료 사유를 대신 적는다. 이미 사유가 있어도 INCOMPLETE 인 동안은 고칠 수 있다.
export async function patchIncompleteReason(
  inspectionId: number,
  reason: string,
): Promise<void> {
  await http.patch<ApiResponse<Record<string, never>>>(
    `/incomplete/${inspectionId}/reason`,
    { reason },
  );
}
