import { http } from "../../../lib/http";
import type { ApiResponse } from "../../auth/type/types";
import type {
  CreateEquipmentRequest,
  Equipment,
  EquipmentListResponse,
  UpdateEquipmentRequest,
} from "./types";

export async function getEquipmentList(): Promise<Equipment[]> {
  const { data } = await http.get<EquipmentListResponse>("/equipment");
  return data.data ?? [];
}

export async function createEquipment(
  body: CreateEquipmentRequest,
): Promise<void> {
  await http.post<ApiResponse<Record<string, never>>>("/equipment", body);
}

export async function updateEquipment(
  equipmentId: number,
  body: UpdateEquipmentRequest,
): Promise<void> {
  await http.patch<ApiResponse<Record<string, never>>>(
    `/equipment/${equipmentId}`,
    body,
  );
}

export async function deleteEquipment(equipmentId: number): Promise<void> {
  await http.delete<ApiResponse<Record<string, never>>>(
    `/equipment/${equipmentId}`,
  );
}
