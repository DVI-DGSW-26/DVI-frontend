// api/index 가 아니라 types 를 직접 참조한다 — api 쪽에서 이 파일을 쓰므로
// 배럴(api/index)을 거치면 순환 import 가 된다.
import type { InspectionOrder, InspectionOrderUserRef } from "../api/types";

/**
 * 검사지시에 배정된 작업자 목록.
 *
 * 서버 응답이 단일 production 객체에서 workers 배열로 바뀌었다. 화면에서는
 * 항상 이 함수를 거쳐 배열로 다룬다 — 구버전 응답(production)이 섞여 들어와도
 * 이름이 빈 칸으로 새지 않게 폴백한다.
 */
export function orderWorkers(
  order: Pick<InspectionOrder, "workers" | "production">,
): InspectionOrderUserRef[] {
  if (order.workers?.length) return order.workers;
  return order.production ? [order.production] : [];
}

/** 목록/표에 찍을 이름 문자열. 배정이 없으면 "-". */
export function workerNames(
  order: Pick<InspectionOrder, "workers" | "production">,
): string {
  const names = orderWorkers(order)
    .map((w) => w.name)
    .filter(Boolean);
  return names.length > 0 ? names.join(", ") : "-";
}
