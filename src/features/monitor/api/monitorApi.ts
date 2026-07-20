import { http } from "../../../lib/http";
import type { ApiResponse } from "../../auth/type/types";
import type { MonitorSnapshot } from "../type/types";

/**
 * GET /monitor/snapshot — SSE 와 동일한 스냅샷을 1회 조회.
 * 초기 로딩용, 그리고 스트림이 막혔을 때 폴링 폴백용.
 */
export async function getMonitorSnapshot(
  signal?: AbortSignal,
): Promise<MonitorSnapshot> {
  const { data } = await http.get<ApiResponse<MonitorSnapshot>>(
    "/monitor/snapshot",
    { signal },
  );
  return data.data;
}
