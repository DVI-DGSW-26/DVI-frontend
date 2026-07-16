import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getEquipment } from "./equipmentApi";
import { getProducts } from "./productApi";
import {
  createInspectionOrder,
  deleteInspectionOrder,
  getInspectionOrderDetail,
  getInspectionOrders,
  getMyInspectionOrders,
  getProductionInspectionOrders,
  updateInspectionOrder,
} from "./inspectionOrderApi";
import type { CreateInspectionOrderRequest } from "./types";
import { getUsers } from "./userApi";
import type { Role } from "../../auth/type/types";

export const inspectionOrderKeys = {
  all: ["inspection-orders"] as const,
  list: () => [...inspectionOrderKeys.all, "list"] as const,
  my: () => [...inspectionOrderKeys.all, "my"] as const,
  detail: (id: number) => [...inspectionOrderKeys.all, "detail", id] as const,
  byProduction: (productionId: number) =>
    [...inspectionOrderKeys.all, "by-production", productionId] as const,
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
    // 상태(ACTIVE/PENDING 등)와 무관하게 해당 역할 전원 노출 — 미승인 작업자에게도 지시 가능.
    select: (users) => users.filter((u) => u.role === role),
  });
}

export function useInspectionOrderList() {
  return useQuery({
    queryKey: inspectionOrderKeys.list(),
    queryFn: getInspectionOrders,
  });
}

// 현재 로그인한 생산 작업자에게 배정된 검사 지시 목록.
export function useMyInspectionOrders() {
  return useQuery({
    queryKey: inspectionOrderKeys.my(),
    queryFn: getMyInspectionOrders,
  });
}

export function useInspectionOrderDetail(orderId: number | null) {
  return useQuery({
    queryKey: inspectionOrderKeys.detail(orderId ?? -1),
    queryFn: () => getInspectionOrderDetail(orderId as number),
    enabled: orderId !== null && orderId !== undefined,
  });
}

// 특정 생산 작업자에게 배정된 검사 지시 목록 (PRODUCTION_MANAGER 용).
export function useProductionInspectionOrders(productionId: number | null) {
  return useQuery({
    queryKey: inspectionOrderKeys.byProduction(productionId ?? -1),
    queryFn: () => getProductionInspectionOrders(productionId as number),
    enabled: productionId !== null && productionId !== undefined,
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
