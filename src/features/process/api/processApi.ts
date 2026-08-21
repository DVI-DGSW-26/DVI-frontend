import { http } from "../../../lib/http";
import type {
  CreateProcessRequest,
  ProcessInfo,
  ProcessListResponse,
  ProcessResponse,
  UpdateProcessRequest,
} from "./types";

export async function getProcesses(
  includeInactive = false,
): Promise<ProcessInfo[]> {
  const { data } = await http.get<ProcessListResponse>("/process", {
    params: includeInactive ? { includeInactive: true } : undefined,
  });
  return data.data ?? [];
}

export async function createProcess(
  body: CreateProcessRequest,
): Promise<ProcessInfo> {
  const { data } = await http.post<ProcessResponse>("/process", body);
  return data.data;
}

export async function updateProcess(
  code: string,
  body: UpdateProcessRequest,
): Promise<ProcessInfo> {
  const { data } = await http.patch<ProcessResponse>(`/process/${code}`, body);
  return data.data;
}
