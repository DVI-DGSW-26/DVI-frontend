import { http } from "../../../lib/http";

// GET /approval/pending-counts — 결재 대기 건수만.
// incomplete: 사유가 채워진 미완료(GET /incomplete 와 같은 기준)
// crossCheck: 순회검사 결재 대기(PENDING_APPROVAL). /cross-check/pending 길이와는 다르다.
export interface ApprovalPendingCounts {
  incomplete: number;
  crossCheck: number;
}

export const approvalKeys = {
  pendingCounts: ["approval", "pending-counts"] as const,
};

export async function getApprovalPendingCounts(): Promise<ApprovalPendingCounts> {
  const { data } = await http.get<{ data: ApprovalPendingCounts }>(
    "/approval/pending-counts",
  );
  return data.data;
}
