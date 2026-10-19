import type { InspectionOrder } from "../api";
import { orderShiftAt } from "./orderWorkDay";

/**
 * 작업자 홈에 띄울 지시만 남긴다.
 *
 * 끝나는 시각을 모르는 아이템은 관리자가 주·야로 함께 등록한다(POST /inspection-order/
 * day-night) — 같은 날짜·제품·설비로 주간 지시 1건, 야간 지시 1건이 생긴다. 같은 작업자가
 * 양쪽에 다 배정됐으면 둘 다 내려오는데, 지금 시작할 수 있는 건 지금 교대의 지시뿐이다:
 * 06~17시는 주간, 17시~다음날 06시는 야간(야간 지시는 야간 초품부터 따로 시작한다).
 *
 * 짝이 없는 지시는 그대로 둔다. 숨긴 쪽도 지시 목록(/my-orders)에서는 고를 수 있고,
 * 하던 주간 검사는 홈의 진행중·이어서 할 일 카드로 계속 이어진다.
 */
export function visibleOrdersNow(
  orders: InspectionOrder[],
  now: Date,
): InspectionOrder[] {
  const shiftsByKey = new Map<string, Set<string>>();
  const keyOf = (o: InspectionOrder) =>
    `${o.targetDate?.slice(0, 10)}|${o.product.id}|${o.equipment.id}`;
  for (const o of orders) {
    if (!o.shift) continue;
    const key = keyOf(o);
    const set = shiftsByKey.get(key) ?? new Set<string>();
    set.add(o.shift);
    shiftsByKey.set(key, set);
  }

  const current = orderShiftAt(now);
  return orders.filter(
    (o) =>
      !o.shift ||
      (shiftsByKey.get(keyOf(o))?.size ?? 0) < 2 ||
      o.shift === current,
  );
}
