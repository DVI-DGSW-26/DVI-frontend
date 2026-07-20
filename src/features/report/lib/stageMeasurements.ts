import type {
  ReportMeasurement,
  ReportResultItem,
  ReportStage,
} from "../api/types";

export const STAGE_ORDER: Record<ReportStage, number> = {
  INITIAL: 0,
  MIDDLE: 1,
  FINAL: 2,
};

export const STAGE_LABEL: Record<ReportStage, string> = {
  INITIAL: "초",
  MIDDLE: "중",
  FINAL: "종",
};

/**
 * 보고서 results[] 에 차수별 측정값(measurements)이 실려 왔는지.
 *
 * 통합 보고서 발행분에만 있고 단일 차수 보고서·구 서버에서는 안 온다.
 * false 면 호출부가 기존 단수 필드 기반 표(자주/순회 2단)로 폴백한다.
 */
export function hasStageMeasurements(results: ReportResultItem[]): boolean {
  return results.some((r) => (r.measurements?.length ?? 0) > 0);
}

/** 측정값 표의 차수 열 하나. */
export interface StageColumn {
  /** 열 식별자. 같은 차수가 여러 번 와도 열이 겹치지 않도록 발생 순서를 포함한다. */
  key: string;
  type: string;
  stage: ReportStage;
  /** 표 머리글. 같은 차수가 반복되면 "(2회차)" 를 붙여 구분한다. */
  label: string;
  /** 같은 dim 안에서 이 type 이 몇 번째로 나온 측정인지 (0-base). */
  occurrence: number;
}

function stageRank(stage: ReportStage): number {
  return STAGE_ORDER[stage] ?? 9;
}

/**
 * 보고서 전체의 차수 열을 초 → 중 → 종 순으로 모은다.
 *
 * - dim 마다 측정된 차수가 다를 수 있어(중간 차수 건너뜀 등) **합집합**으로 잡는다.
 *   첫 dim 기준으로 열을 만들면 다른 dim 의 값이 엉뚱한 열에 들어간다.
 * - 반려 후 재검사처럼 **같은 type 이 여러 번** 올 수 있다. type 만으로 묶으면
 *   뒤엣것이 조용히 사라지므로, 발생 순서를 열 식별자에 포함해 별도 열로 남긴다.
 */
export function collectStageColumns(
  results: ReportResultItem[],
): StageColumn[] {
  const columns = new Map<string, StageColumn>();

  for (const r of results) {
    const seen = new Map<string, number>();
    for (const m of r.measurements ?? []) {
      const occurrence = seen.get(m.type) ?? 0;
      seen.set(m.type, occurrence + 1);
      const key = `${m.type}#${occurrence}`;
      if (columns.has(key)) continue;
      const base = `${STAGE_LABEL[m.stage] ?? ""} ${m.typeLabel ?? ""}`.trim();
      columns.set(key, {
        key,
        type: m.type,
        stage: m.stage,
        label: occurrence === 0 ? base : `${base} (${occurrence + 1}회차)`,
        occurrence,
      });
    }
  }

  return [...columns.values()].sort((a, b) => {
    const diff = stageRank(a.stage) - stageRank(b.stage);
    return diff !== 0 ? diff : a.occurrence - b.occurrence;
  });
}

/** 한 dim 에서 특정 차수 열에 해당하는 측정값. 그 dim 에 없으면 undefined. */
export function findMeasurement(
  item: ReportResultItem,
  column: StageColumn,
): ReportMeasurement | undefined {
  let occurrence = 0;
  for (const m of item.measurements ?? []) {
    if (m.type !== column.type) continue;
    if (occurrence === column.occurrence) return m;
    occurrence++;
  }
  return undefined;
}

/**
 * 같은 dimNo 가 여러 번 등장하는지.
 *
 * 백엔드가 measurements 없이 초·중·종을 results[] 에 그냥 이어 붙이면 dimNo 가
 * 반복된다. 이때는 어느 행이 어느 차수인지 표시할 방법이 없어, 화면에서 안내를
 * 띄우고 React key 도 인덱스로 구분해야 한다.
 */
export function hasDuplicateDimNo(results: ReportResultItem[]): boolean {
  const seen = new Set<number>();
  for (const r of results) {
    if (seen.has(r.dimNo)) return true;
    seen.add(r.dimNo);
  }
  return false;
}
