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

// 공정 필터는 반복 파라미터(?process=A&process=B)로 보낸다. axios 기본 직렬화는
// process[]=A 형태라 백엔드가 못 알아듣는다 — indexes: null 이 반복 형식이다.
// 빈 배열이면 파라미터 자체를 빼서 "전체 공정"으로 요청한다.
const REPEAT_PARAMS = { indexes: null } as const;

function processParam(processes?: string[]) {
  return processes && processes.length > 0 ? { process: processes } : {};
}

export async function getMyCrossChecks(
  includeFinished = false,
  processes?: string[],
): Promise<CrossCheckSummary[]> {
  const { data } = await http.get<ApiResponse<CrossCheckSummary[]>>(
    "/cross-check/my",
    {
      params: { includeFinished, ...processParam(processes) },
      paramsSerializer: REPEAT_PARAMS,
    },
  );
  return data.data ?? [];
}

export async function getAssignedCrossChecks(
  processes?: string[],
): Promise<AssignedInspection[]> {
  const { data } = await http.get<ApiResponse<AssignedInspection[]>>(
    "/cross-check/assigned",
    {
      params: processParam(processes),
      paramsSerializer: REPEAT_PARAMS,
    },
  );
  return data.data ?? [];
}

// QUALITY_ADMIN 이 결재 대기 중인 (PENDING_APPROVAL) 순회검사 목록을 조회.
// 백엔드 엔드포인트 경로는 가정. 실제 경로 다르면 여기 한 줄만 수정.
export async function getPendingCrossChecks(): Promise<CrossCheckSummary[]> {
  const { data } = await http.get<ApiResponse<CrossCheckSummary[]>>(
    "/cross-check/pending",
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

export async function completeCrossCheck(crossCheckId: number): Promise<void> {
  await http.post<ApiResponse<Record<string, never>>>(
    `/cross-check/${crossCheckId}/complete`,
  );
}

// 관리자(ADMIN/QUALITY_ADMIN)가 순회검사 삭제. 허용 상태: DRAFT/PENDING_APPROVAL/REJECTED.
// APPROVED(보고서 발행)는 거부(400 CROSS_CHECK_ALREADY_FINISHED) — 보고서부터 삭제 후 가능.
export async function deleteCrossCheck(crossCheckId: number): Promise<void> {
  await http.delete<ApiResponse<Record<string, never>>>(
    `/cross-check/${crossCheckId}`,
  );
}

// 반려(REJECTED) 된 순회검사를 다시 편집 가능한 상태(DRAFT) 로 복귀.
// 측정값/사진/외관/경도 및 rejectReason 은 그대로 보존되어 사용자가 어디가 문제였는지 확인 가능.
export async function reopenCrossCheck(crossCheckId: number): Promise<void> {
  await http.post<ApiResponse<Record<string, never>>>(
    `/cross-check/${crossCheckId}/reopen`,
  );
}

// 순회검사자(QUALITY)가 측정 없이 바로 반려. 자주검사 NG 등 명확할 때 사용.
// 순회검사 DRAFT→REJECTED, 자주검사 COMPLETED→DRAFT 로 복귀(작업자 재측정), production 알림.
// 바디는 decision/decision 무시 + rejectReason 만 사용하므로 decision 은 형식상 채워 보낸다.
export async function rejectCrossCheck(
  crossCheckId: number,
  rejectReason: string,
): Promise<void> {
  await http.post<ApiResponse<Record<string, never>>>(
    `/cross-check/${crossCheckId}/reject`,
    { decision: "REJECT", rejectReason },
  );
}

// 순회검사자가 자주검사(대상)를 잘못 골라 시작했을 때 "취소".
// 관리자 삭제(DELETE)와 달리 순회검사 레코드를 지우지 않고 담당만 놓아(release)
// 다른 검사자가 이어받을 수 있는 상태로 되돌린다. 입력한 측정값은 보존되며,
// 반려와 달리 자주검사가 작업자에게 재측정으로 튕기지 않는다.
// 서버 응답 메시지: "순회검사를 취소했습니다. 다른 검사자가 이어받을 수 있습니다."
export async function releaseCrossCheck(crossCheckId: number): Promise<void> {
  await http.post<ApiResponse<Record<string, never>>>(
    `/cross-check/${crossCheckId}/release`,
  );
}
