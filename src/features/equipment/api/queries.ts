import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEquipment,
  deleteEquipment,
  getEquipmentList,
  updateEquipment,
} from "./equipmentApi";
import type {
  CreateEquipmentRequest,
  UpdateEquipmentRequest,
} from "./types";

export const equipmentKeys = {
  all: ["equipment-admin"] as const,
  list: () => [...equipmentKeys.all, "list"] as const,
};

export function useEquipmentList() {
  return useQuery({
    queryKey: equipmentKeys.list(),
    queryFn: getEquipmentList,
  });
}

export function useCreateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateEquipmentRequest) => createEquipment(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: equipmentKeys.list() });
      qc.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}

export function useUpdateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      equipmentId,
      body,
    }: {
      equipmentId: number;
      body: UpdateEquipmentRequest;
    }) => updateEquipment(equipmentId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: equipmentKeys.list() });
      qc.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}

export function useDeleteEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (equipmentId: number) => deleteEquipment(equipmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: equipmentKeys.list() });
      qc.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}
