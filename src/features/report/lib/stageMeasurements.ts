import type { ReportResultItem } from "../api/types";

/**
 * 보고서 results[] 에 차수별 측정값(measurements)이 실려 왔는지.
 *
 * 통합 보고서 발행분에만 있고 단일 차수 보고서·구 서버에서는 안 온다.
 * false 면 호출부가 기존 단수 필드 기반 표(자주/순회 2단)로 폴백한다.
 */
export function hasStageMeasurements(results: ReportResultItem[]): boolean {
  return results.some((r) => (r.measurements?.length ?? 0) > 0);
}
