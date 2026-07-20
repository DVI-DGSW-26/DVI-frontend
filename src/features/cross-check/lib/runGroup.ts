import type { CrossCheckSummary } from "../api";
import { getStage } from "./stage";

// 야간 작업이 자정을 넘겨도 한 run 으로 남도록, 작업일 경계를 06:00 으로 둔다.
// 06:00 이전 건은 전날 작업분으로 본다. 폴백 키에서만 쓰는 근사값이다.
const WORK_DAY_START_HOUR = 6;

// 폴백 키에 쓰는 "작업일". createdAt 이 없거나 파싱 불가면 날짜로 나누지 않는다
// (같은 제품·설비끼리는 합쳐 두는 편이 안전).
function workDayKey(cc: CrossCheckSummary): string {
  const raw = cc.createdAt ?? cc.updatedAt;
  if (!raw) return "unknown";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "unknown";
  if (d.getHours() < WORK_DAY_START_HOUR) d.setDate(d.getDate() - 1);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}${mm}${dd}`;
}

// 초·중·종을 한 생산 run 으로 묶는 키.
//
// `orderId` = 검사 지시(InspectionOrder) ID. Swagger 상 "초·중·종 순회검사를 묶는
// 검사 지시 ID"로, 같은 날 같은 (작업자, 제품, 설비) 조합이면 한 order 에 묶인다.
//
// 배포 시점 차이로 아직 안 내려오는 서버가 있어 폴백을 둔다. 폴백에 **작업일을
// 포함**하는 이유: (제품, 설비) 만으로 묶으면 같은 설비에서 같은 제품을 며칠에
// 걸쳐 찍은 서로 다른 run 이 한 덩어리가 되어, 결재자가 초·중·종이 두 벌 섞인
// 카드를 보게 된다. 승인 판단이 걸린 화면이라 과도 병합은 위험하다.
export function resolveRunKey(cc: CrossCheckSummary): string {
  if (cc.orderId != null) return `order:${cc.orderId}`;
  return `pair:${cc.product.id}-${cc.equipment.id}-${workDayKey(cc)}`;
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
