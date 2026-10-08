import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  createTryoutReport,
  deleteTryoutReport,
  getExtrusionProducts,
  getTryoutReportDetail,
  getTryoutReportPrefill,
  getTryoutReports,
  getTryoutUsers,
  updateTryoutReport,
} from "./tryoutReportApi";
import type {
  CreateTryoutReportRequest,
  TryoutReportListParams,
  TryoutReportSummary,
  UpdateTryoutReportRequest,
} from "./types";

export const tryoutReportKeys = {
  all: ["tryout-reports"] as const,
  list: (params: TryoutReportListParams = {}) =>
    [...tryoutReportKeys.all, "list", params] as const,
  detail: (id: number) => [...tryoutReportKeys.all, "detail", id] as const,
  prefill: (productId: number) =>
    [...tryoutReportKeys.all, "prefill", productId] as const,
  products: () => [...tryoutReportKeys.all, "products"] as const,
  users: () => [...tryoutReportKeys.all, "users"] as const,
};

export function useTryoutReportList(params: TryoutReportListParams = {}) {
  return useQuery({
    queryKey: tryoutReportKeys.list(params),
    queryFn: () => getTryoutReports(params),
    refetchOnMount: "always",
  });
}

export function useTryoutReportDetail(id: number, enabled = true) {
  return useQuery({
    queryKey: tryoutReportKeys.detail(id),
    queryFn: () => getTryoutReportDetail(id),
    enabled,
  });
}

export function useTryoutReportPrefill(productId: number | null) {
  return useQuery({
    queryKey: tryoutReportKeys.prefill(productId ?? 0),
    queryFn: () => getTryoutReportPrefill(productId as number),
    enabled: productId != null,
    // 추천 차수는 다른 사람이 방금 쓴 보고서에 따라 바뀐다 — 고를 때마다 새로 받는다.
    staleTime: 0,
    gcTime: 0,
  });
}

export function useExtrusionProducts() {
  return useQuery({
    queryKey: tryoutReportKeys.products(),
    queryFn: getExtrusionProducts,
  });
}

export function useTryoutUsers() {
  return useQuery({
    queryKey: tryoutReportKeys.users(),
    queryFn: getTryoutUsers,
    // 권한이 없어 403 이면 다시 시도해도 같다.
    retry: (count, err) =>
      !(err instanceof AxiosError && err.response?.status === 403) && count < 2,
  });
}

export function useCreateTryoutReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTryoutReportRequest) => createTryoutReport(body),
    onSuccess: (detail) => {
      qc.setQueryData(tryoutReportKeys.detail(detail.id), detail);
      qc.invalidateQueries({ queryKey: [...tryoutReportKeys.all, "list"] });
    },
  });
}

export function useUpdateTryoutReport(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTryoutReportRequest) =>
      updateTryoutReport(id, body),
    onSuccess: (detail) => {
      qc.setQueryData(tryoutReportKeys.detail(id), detail);
      qc.invalidateQueries({ queryKey: [...tryoutReportKeys.all, "list"] });
    },
  });
}

export function useDeleteTryoutReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTryoutReport(id),
    onSuccess: (_void, deletedId) => {
      // navigate 직후에도 목록에서 바로 사라지도록 캐시에서 먼저 뺀다.
      qc.setQueriesData<TryoutReportSummary[]>(
        { queryKey: [...tryoutReportKeys.all, "list"] },
        (prev) => prev?.filter((r) => r.id !== deletedId),
      );
      qc.removeQueries({ queryKey: tryoutReportKeys.detail(deletedId) });
      qc.invalidateQueries({ queryKey: [...tryoutReportKeys.all, "list"] });
    },
  });
}
