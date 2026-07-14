import type { MyInspection } from "../../my-inspection/type/types";

/**
 * 관리자용 자주검사 목록 항목.
 * 작업자 본인만 보는 my-inspection 과 달리, 관리자는 "누가 만든 검사인지"를
 * 함께 봐야 하므로 production(작성자) 정보를 포함한다.
 */
export interface AdminInspection extends MyInspection {
  production?: { id: number; name: string };
}

export interface AdminInspectionFilter {
  /** 상태 필터. 미지정 시 전체. */
  status?: MyInspection["status"];
  /** yyyy-MM-dd. 특정 날짜의 검사만. */
  date?: string;
}
