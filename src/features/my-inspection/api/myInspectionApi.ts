import { http } from "../../../lib/http";
import type {
  MyInspection,
  MyInspectionListResponse,
} from "../type/types";

export interface MyInspectionsOptions {
  /** true 면 COMPLETED/INCOMPLETE_APPROVED 등 종결된 검사까지 포함 — 기본 false. */
  includeFinished?: boolean;
}

export async function getMyInspections(
  opts: MyInspectionsOptions = {},
): Promise<MyInspection[]> {
  const { data } = await http.get<MyInspectionListResponse>("/inspection/my", {
    params: opts.includeFinished ? { includeFinished: true } : undefined,
  });
  return data.data ?? [];
}
