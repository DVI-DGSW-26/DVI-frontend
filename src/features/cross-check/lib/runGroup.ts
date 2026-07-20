import type { CrossCheckSummary } from "../api";
import { getStage } from "./stage";

// 초·중·종을 한 생산 run 으로 묶는 키.
//
// `orderId` = 검사 지시(InspectionOrder) ID. Swagger 상 "초·중·종 순회검사를 묶는
// 검사 지시 ID"로, 같은 날 같은 (작업자, 제품, 설비) 조합이면 한 order 에 묶인다.
// 배포 시점 차이로 아직 안 내려오는 서버가 있을 수 있어, 없으면 (제품, 설비)
// 조합으로 폴백한다 — my-inspection 의 "이어서 할 일" 계산이 쓰는 것과 같은
// 근사 키다(nextEligible.ts).
export function resolveRunKey(cc: CrossCheckSummary): string {
  if (cc.orderId != null) return `order:${cc.orderId}`;
  return `pair:${cc.product.id}-${cc.equipment.id}`;
}

// orderId 가 실제로 응답에 실려 왔는지 — 폴백(근사 묶음)으로 돌고 있으면 false.
// 화면에서 "묶음이 추정치"임을 알릴지 판단하는 데 쓴다.
export function hasExplicitRunKey(cc: CrossCheckSummary): boolean {
  return cc.orderId != null;
}

export interface CrossCheckRun {
  key: string;
  /** 초 → 중 → 종 순으로 정렬된 차수들. */
  items: CrossCheckSummary[];
  /** 종(FINAL) 차수. 아직 종이 안 올라왔으면 null. 최종 승인 대상이다. */
  final: CrossCheckSummary | null;
  /** 목록 정렬용 — run 안에서 가장 최근 타임스탬프. */
  latestTs: number;
  /** 그룹핑 키를 백엔드에서 받았는지 (false = 제품·설비 폴백). */
  explicitKey: boolean;
}

function slotNo(cc: CrossCheckSummary): number {
  const m = cc.type.match(/_(\d+)$/);
  return m ? Number(m[1]) : 0;
}

function ts(cc: CrossCheckSummary): number {
  const raw = cc.updatedAt ?? cc.createdAt;
  const t = raw ? Date.parse(raw) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

/**
 * 결재 목록을 생산 run 별로 묶는다. 각 run 은 초·중·종을 차수 순으로 담고,
 * 승인 대상인 종 차수를 따로 가리킨다. run 정렬은 최근 활동 순.
 */
export function groupByRun(list: CrossCheckSummary[]): CrossCheckRun[] {
  const buckets = new Map<string, CrossCheckSummary[]>();
  for (const cc of list) {
    const key = resolveRunKey(cc);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(cc);
    else buckets.set(key, [cc]);
  }

  const runs: CrossCheckRun[] = [];
  for (const [key, items] of buckets) {
    const ordered = [...items].sort((a, b) => slotNo(a) - slotNo(b));
    runs.push({
      key,
      items: ordered,
      final:
        ordered.find(
          (cc) => getStage(cc.type, cc.product.process) === "FINAL",
        ) ?? null,
      latestTs: Math.max(...ordered.map(ts)),
      explicitKey: hasExplicitRunKey(ordered[0]),
    });
  }

  return runs.sort((a, b) => b.latestTs - a.latestTs);
}

/**
 * run 을 대표하는 상태 — 승인 단위가 종 차수 1회이므로 종의 상태를 쓴다.
 * 종이 아직 없으면 진행 중인 차수(마지막 항목) 상태로 근사한다.
 */
export function runStatus(run: CrossCheckRun): string {
  return (run.final ?? run.items[run.items.length - 1]).status;
}
