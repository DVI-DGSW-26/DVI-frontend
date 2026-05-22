import type { ApiResponse } from "../../auth/type/types";

export type ProcessType =
  | "EXTRUSION"
  | "AL_CUTTING"
  | "ST_CUTTING"
  | "MACHINING"
  | "PRESS";

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
