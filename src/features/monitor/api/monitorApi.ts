import { http } from "../../../lib/http";
import type { ApiResponse } from "../../auth/type/types";
import type {
  MonitorQualityBoard,
  MonitorScheduleBoard,
  MonitorSnapshot,
} from "../type/types";

// 세 보드 모두 SSE(GET /monitor/stream)로 오는 것과 같은 데이터를 1회 조회하는
// REST 폴백이다. 초기 로딩(스트림이 캐시를 아직 못 만든 앱 기동 직후 최대 5초)과
// 스트림이 막힌 환경의 폴링에 쓴다.

/** GET /monitor/snapshot — 페이지1 현황판. */
export async function getMonitorSnapshot(
  signal?: AbortSignal,
): Promise<MonitorSnapshot> {
  const { data } = await http.get<ApiResponse<MonitorSnapshot>>(
    "/monitor/snapshot",
    { signal },
  );
  return data.data;
}

/** GET /monitor/quality — 페이지3 품질·불량 보드. */
export async function getMonitorQuality(
  signal?: AbortSignal,
): Promise<MonitorQualityBoard> {
  const { data } = await http.get<ApiResponse<MonitorQualityBoard>>(
    "/monitor/quality",
    { signal },
  );
  return data.data;
}

/** GET /monitor/schedule — 페이지4 진행·지연 보드. */
export async function getMonitorSchedule(
  signal?: AbortSignal,
): Promise<MonitorScheduleBoard> {
  const { data } = await http.get<ApiResponse<MonitorScheduleBoard>>(
    "/monitor/schedule",
    { signal },
  );
  return data.data;
}
