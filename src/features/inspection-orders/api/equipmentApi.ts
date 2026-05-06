import { http } from "../../../lib/http";
import type { Equipment, EquipmentListResponse } from "./types";

export async function getEquipment(): Promise<Equipment[]> {
  const { data } = await http.get<EquipmentListResponse>("/equipment");
  return data.data ?? [];
}
