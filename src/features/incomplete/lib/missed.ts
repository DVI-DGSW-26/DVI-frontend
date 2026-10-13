import { kstWorkDayKey, parseServerDate } from "../../../lib/datetime";
import type { MissedInspection } from "../type/types";

/**
 * 미검사 사유 화면의 세 묶음.
 * - needsReason: 작업자가 사유 없이 미완료로 낸 건 — 순회검사자가 사유를 적는다
 * - awaitingApproval: 사유가 있고 품질관리자 승인 대기 — 승인 전까지 고칠 수 있다
 * - notStarted: 예정 시각이 지났는데 시작도 안 한 시점 — 서버가 사유 작성을 미완료에만
 *   열어 둬서 지금은 보기만 한다
 * 승인으로 종결(INCOMPLETE_APPROVED)·건너뜀(SKIPPED)은 할 일이 없어 뺀다.
 */
export interface MissedGroups {
  needsReason: MissedInspection[];
  awaitingApproval: MissedInspection[];
  notStarted: MissedInspection[];
  // 기간이 지나 목록에서 뺀 시작 안 한 시점 수(안내용).
  notStartedOlder: number;
}

// 시작 안 한 시점은 최근 이만큼의 작업일만 보인다(오늘 + 어제).
// 서버는 보고서가 안 나간 작업지시면 기간 없이 전부 준다 — 실서버(2026-10-13)에서 6월 지시까지
// 740건이 와서, 정작 사유를 적어야 할 미완료가 그 아래에 묻혔다. 미완료는 기간 없이 다 보인다.
export const NOT_STARTED_WORK_DAYS = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

// 서버 NOT_STARTED 는 예정 시각 전 시점도 포함한다. 시각이 있으면 그 시각이 지났는지,
// 시각이 없는 시점(압출·ST절단 초·중·종)은 검사일이 오늘 작업일(06시 경계)보다 앞인지로 본다.
export function isOverdue(item: MissedInspection, now: Date = new Date()): boolean {
  if (item.scheduledAt) {
    const at = parseServerDate(item.scheduledAt);
    if (!Number.isNaN(at.getTime())) return at.getTime() <= now.getTime();
  }
  return item.targetDate < kstWorkDayKey(now);
}

export function groupMissed(
  items: MissedInspection[],
  now: Date = new Date(),
): MissedGroups {
  const groups: MissedGroups = {
    needsReason: [],
    awaitingApproval: [],
    notStarted: [],
    notStartedOlder: 0,
  };
  const cutoff = kstWorkDayKey(
    new Date(now.getTime() - (NOT_STARTED_WORK_DAYS - 1) * DAY_MS),
  );
  for (const item of items) {
    if (item.kind === "INCOMPLETE") {
      if (item.reason?.trim()) groups.awaitingApproval.push(item);
      else groups.needsReason.push(item);
    } else if (item.kind === "NOT_STARTED" && isOverdue(item, now)) {
      if (item.targetDate >= cutoff) groups.notStarted.push(item);
      else groups.notStartedOlder += 1;
    }
  }
  return groups;
}
