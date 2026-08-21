import type { ApiResponse } from "../../auth/type/types";

/**
 * 공정. 예전에는 프론트에 5개(압출/AL절단/ST절단/가공/프레스)를 박아뒀지만
 * 이제 관리자가 등록·수정하는 DB 데이터라 GET /process 로 받아 쓴다.
 *
 * 화면 분기는 code 비교가 아니라 아래 플래그로 판단할 것:
 *   hardnessTracked          — 경도 입력란 노출 여부 (예전 "EXTRUSION 이면" 조건)
 *   bundledReport            — 초·중·종을 한 보고서로 묶을지 (예전 "압출/프레스면" 조건)
 *   autoCopyNightCrossCheck  — 순회검사자 없는 야간 작업이라 자동 복사할지
 */
export interface ProcessInfo {
  // 불변 식별자. products/equipments/reports 가 이 값을 참조한다.
  code: string;
  // 설비코드·보고서번호(DV-EX-IR-...)에 쓰이는 약칭. 등록 후 불변.
  shortCode: string;
  // 표시명. 이것만 수정 가능.
  label: string;
  bundledReport: boolean;
  hardnessTracked: boolean;
  autoCopyNightCrossCheck: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProcessRequest {
  code: string;
  shortCode: string;
  label: string;
  bundledReport?: boolean;
  hardnessTracked?: boolean;
  autoCopyNightCrossCheck?: boolean;
}

// code/shortCode 는 수정 불가. isActive:false 로 보내면 비활성화(소프트 삭제) —
// 목록·선택지에서만 숨겨지고 기존 참조는 그대로 유지된다.
export type UpdateProcessRequest = Partial<
  Omit<CreateProcessRequest, "code" | "shortCode">
> & {
  isActive?: boolean;
};

export type ProcessListResponse = ApiResponse<ProcessInfo[]>;
export type ProcessResponse = ApiResponse<ProcessInfo>;
