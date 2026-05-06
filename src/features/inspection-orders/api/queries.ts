import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getEquipment } from "./equipmentApi";
import { getProducts } from "./productApi";
import {
  createInspectionOrder,
  deleteInspectionOrder,
  getInspectionOrders,
  updateInspectionOrder,
} from "./inspectionOrderApi";
import type { CreateInspectionOrderRequest } from "./types";
import { getUsers } from "./userApi";
import type { Role } from "../../auth/type/types";

export const inspectionOrderKeys = {
  all: ["inspection-orders"] as const,
  list: () => [...inspectionOrderKeys.all, "list"] as const,
};

export const equipmentKeys = {
  all: ["equipment"] as const,
  list: () => [...equipmentKeys.all, "list"] as const,
};

export const productKeys = {
  all: ["products"] as const,
  list: () => [...productKeys.all, "list"] as const,
};

export const userKeys = {
  all: ["users"] as const,
  list: () => [...userKeys.all, "list"] as const,
  byRole: (role: Role) => [...userKeys.all, "by-role", role] as const,
};

export function useEquipmentList() {
  return useQuery({
    queryKey: equipmentKeys.list(),
    queryFn: getEquipment,
  });
}

export function useProductList() {
  return useQuery({
    queryKey: productKeys.list(),
    queryFn: getProducts,
  });
}

export function useUsersByRole(role: Role) {
  return useQuery({
    queryKey: userKeys.byRole(role),
    queryFn: getUsers,
    select: (users) =>
      users.filter((u) => u.role === role && u.status === "ACTIVE"),
  });
}

export function useInspectionOrderList() {
  return useQuery({
    queryKey: inspectionOrderKeys.list(),
    queryFn: getInspectionOrders,
  });
}

export function useCreateInspectionOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createInspectionOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inspectionOrderKeys.list() });
    },
  });
}

export function useUpdateInspectionOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      body,
    }: {
      orderId: number;
      body: Partial<CreateInspectionOrderRequest>;
    }) => updateInspectionOrder(orderId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inspectionOrderKeys.list() });
    },
  });
}

export function useDeleteInspectionOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: number) => deleteInspectionOrder(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inspectionOrderKeys.list() });
    },
  });
}
