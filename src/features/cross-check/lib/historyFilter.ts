import { kstDateKey, parseServerDate } from "../../../lib/datetime";
import type { CrossCheckSummary } from "../api";

// "내 결재 이력" 다중 필터 상태 (검색어/날짜/공정/제품/상태).
// UI 는 CrossCheckHistoryFilter 컴포넌트, 순수 로직은 이 모듈에 둔다.
export interface HistoryFilter {
  keyword: string;
  date: string; // YYYY-MM-DD
  processes: string[];
  products: string[]; // product code
  statuses: string[];
}

export const EMPTY_HISTORY_FILTER: HistoryFilter = {
  keyword: "",
  date: "",
  processes: [],
  products: [],
  statuses: [],
};

export function isHistoryFilterActive(f: HistoryFilter): boolean {
  return (
    f.keyword.trim() !== "" ||
    f.date !== "" ||
    f.processes.length > 0 ||
    f.products.length > 0 ||
    f.statuses.length > 0
  );
}

export function matchesHistoryFilter(
  cc: CrossCheckSummary,
  f: HistoryFilter,
): boolean {
  // inspectionTime 은 신뢰도가 낮아(비거나 부정확) 날짜 필터 기준으로 부적합 —
  // 실제 서버 타임스탬프(createdAt=요청 생성)를 우선 사용. 서버 시각은 UTC 라
  // 단순 문자열 slice 대신 KST 달력 날짜로 환산해 비교한다.
  if (f.date) {
    const src = cc.createdAt ?? cc.updatedAt ?? cc.inspectionTime;
    if (kstDateKey(parseServerDate(src)) !== f.date) return false;
  }
  if (f.processes.length > 0 && !f.processes.includes(cc.product.process))
    return false;
  if (f.products.length > 0 && !f.products.includes(cc.product.code))
    return false;
  if (f.statuses.length > 0 && !f.statuses.includes(cc.status)) return false;
  const kw = f.keyword.trim().toLowerCase();
  if (kw) {
    const haystack = [
      cc.product.name,
      cc.product.code,
      cc.customer.name,
      cc.production.name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(kw)) return false;
  }
  return true;
}
