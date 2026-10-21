// 설비 이상 신고. 생산·품질 작업자가 신고하고 생산 관리자·설비 관리자·관리자가 본다.
// 처리 상태는 없다 — 신고가 쌓이는 목록뿐이다.

export interface EquipmentReportUser {
  id: number;
  name: string;
}

interface EquipmentReportBase {
  id: number;
  // 설비가 나중에 지워지면 null. 화면에는 신고 당시 이름(equipmentName)을 쓴다.
  equipmentId: number | null;
  equipmentName: string;
  // 신고 당시 공정 코드. 표시명은 GET /process 와 맞춘다.
  process: string;
  reporter: EquipmentReportUser;
  reportedAt: string;
}

export interface EquipmentReportSummary extends EquipmentReportBase {
  imageCount: number;
}

export interface EquipmentReportDetail extends EquipmentReportBase {
  imageUrls: string[];
}

export interface CreateEquipmentReportRequest {
  equipmentId: number;
  imageUrls: string[];
}

// 조건은 모두 선택. from·to 는 yyyy-MM-dd, 신고일 기준이며 양끝을 포함한다.
export interface EquipmentReportListParams {
  equipmentId?: number;
  process?: string;
  from?: string;
  to?: string;
}

export interface EquipmentReportPage {
  items: EquipmentReportSummary[];
  hasNext: boolean;
  totalElements: number;
}

export type EquipmentReportErrorCode =
  | "EQUIPMENT_REQUIRED"
  | "EQUIPMENT_NOT_FOUND"
  | "TOO_MANY_IMAGES"
  | "EQUIPMENT_REPORT_NOT_FOUND";

/** 한 신고에 붙일 수 있는 사진 수. 넘으면 서버가 TOO_MANY_IMAGES 로 거절한다. */
export const MAX_REPORT_IMAGES = 3;
