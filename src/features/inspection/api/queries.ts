import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeInspection,
  getInspectionDetail,
  getInspectionSlots,
  incompleteInspection,
  saveInspectionResults,
  startInspection,
  uploadInspectionImage,
} from "./inspectionApi";
import type {
  IncompleteRequest,
  InspectionProcess,
  SaveResultsRequest,
} from "../type/types";
import { myInspectionKeys } from "../../my-inspection/api";
import { inspectionOrderKeys } from "../../inspection-orders/api";

export const inspectionKeys = {
  all: ["inspection"] as const,
  slots: (process: InspectionProcess) =>
    [...inspectionKeys.all, "slots", process] as const,
  detail: (inspectionId: number) =>
    [...inspectionKeys.all, "detail", inspectionId] as const,
};

export function useInspectionDetail(inspectionId: number | undefined) {
  return useQuery({
    queryKey: inspectionKeys.detail(inspectionId as number),
    queryFn: () => getInspectionDetail(inspectionId as number),
    enabled:
      typeof inspectionId === "number" &&
      Number.isFinite(inspectionId) &&
      inspectionId > 0,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useInspectionSlots(process: InspectionProcess | undefined) {
  return useQuery({
    queryKey: inspectionKeys.slots(process as InspectionProcess),
    queryFn: () => getInspectionSlots(process as InspectionProcess),
    enabled: !!process,
  });
}

export function useStartInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: startInspection,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: myInspectionKeys.list() });
      qc.invalidateQueries({ queryKey: inspectionOrderKeys.list() });
    },
  });
}

export function useUploadInspectionImage() {
  return useMutation({
    mutationFn: (blob: Blob) => uploadInspectionImage(blob),
  });
}

export function useSaveInspectionResults(inspectionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveResultsRequest) =>
      saveInspectionResults(inspectionId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: myInspectionKeys.list() });
    },
  });
}

export function useCompleteInspection(inspectionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => completeInspection(inspectionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: myInspectionKeys.list() });
      qc.invalidateQueries({ queryKey: inspectionOrderKeys.list() });
    },
  });
}

export function useIncompleteInspection(inspectionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: IncompleteRequest) =>
      incompleteInspection(inspectionId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: myInspectionKeys.list() });
      qc.invalidateQueries({ queryKey: inspectionOrderKeys.list() });
    },
  });
}
