import type { ApiResponse } from "../../auth/type/types";

// 공정은 관리자가 등록하는 DB 데이터(GET /process) — 값을 고정하지 않는다.
export type ProcessType = string;

export interface Equipment {
  id: number;
  name: string;
  process: ProcessType | string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEquipmentRequest {
  name: string;
  process: ProcessType;
}

export type UpdateEquipmentRequest = Partial<CreateEquipmentRequest>;

export type EquipmentListResponse = ApiResponse<Equipment[]>;
