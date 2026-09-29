import { kstWorkDayKey, parseServerDate } from "../../../lib/datetime";
import type { MyInspection } from "../type/types";

// /inspection/assigned 제거 이후 탭 구성: 전체 / 진행 중 / 완료 / 미완료.
// INCOMPLETE 탭은 status === "INCOMPLETE" || "INCOMPLETE_APPROVED" 둘 다 포함.
export type Tab = "ALL" | "IN_PROGRESS" | "COMPLETED" | "INCOMPLETE";

// label 은 myInspection 네임스페이스의 i18n 키 — 렌더링하는 쪽에서 t(label) 로 변환.
export const TABS: { key: Tab; label: string }[] = [
  { key: "ALL", label: "tabs.all" },
  { key: "IN_PROGRESS", label: "tabs.inProgress" },
  { key: "COMPLETED", label: "tabs.completed" },
  { key: "INCOMPLETE", label: "tabs.incomplete" },
];

// 누적되는 리스트 정리를 위한 날짜 필터. "TODAY"가 기본 — 하루 지난 완료 건은 숨김.
// 미완료(INCOMPLETE/INCOMPLETE_APPROVED) 는 사용자 요구상 항상 노출.
export type DateFilter = "TODAY" | "WEEK" | "ALL";

// label 은 myInspection 네임스페이스의 i18n 키 — 렌더링하는 쪽에서 t(label) 로 변환.
export const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: "TODAY", label: "dateFilters.today" },
  { key: "WEEK", label: "dateFilters.week" },
  { key: "ALL", label: "dateFilters.all" },
];

// 작업일 키("YYYY-MM-DD")끼리는 사전순 비교가 곧 날짜 비교라, 주 시작만 키로 구하면 된다.
function weekStartKey(todayKey: string): string {
  const d = new Date(`${todayKey}T00:00:00Z`);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1)); // 월요일 시작
  return d.toISOString().slice(0, 10);
}

export function isWithinDateFilter(
  inspection: MyInspection,
  filter: DateFilter,
): boolean {
  if (filter === "ALL") return true;
  // 아직 끝나지 않은 건 날짜 무시하고 항상 노출.
  // - 미완료(피드백: "미완료는 남겨야겠지만")
  // - 진행 중(DRAFT): 어제 시작해 아직 못 끝낸 검사가 작업일 경계 때문에
  //   목록에서 사라지면 작업자가 이어서 할 방법이 없다.
  if (
    inspection.status === "DRAFT" ||
    inspection.status === "INCOMPLETE" ||
    inspection.status === "INCOMPLETE_APPROVED"
  ) {
    return true;
  }
  // 기준은 "언제 끝냈나"가 아니라 "언제 한 작업인가"(작업일)다.
  // completedAt 을 쓰면 20일 검사를 21일에 완료했을 때 오늘 목록에 섞여 들어온다.
  // createdAt 을 우선하고, 카드에 찍히는 날짜(formatWorkDay)와 같은 필드를 봐야 한다.
  const iso =
    inspection.createdAt ?? inspection.updatedAt ?? inspection.completedAt;
  // 백엔드가 날짜 필드를 안 보내면 안전하게 통과 — 기존 누적 동작 유지
  if (!iso) return true;
  // parseServerDate 필수: 백엔드가 오프셋 없는 KST 를 주므로 기기 시간대가 KST 가
  // 아니면 raw new Date 는 어긋난다.
  const key = kstWorkDayKey(parseServerDate(iso));
  if (!key) return true;
  const todayKey = kstWorkDayKey(new Date());
  return key >= (filter === "TODAY" ? todayKey : weekStartKey(todayKey));
}

export interface StatusBadge {
  /** myInspection 네임스페이스의 i18n 키. 미지의 status 면 raw status 문자열이 그대로 담김 —
   *  렌더링하는 쪽에서 t(label, { defaultValue: label }) 로 변환한다. */
  label: string;
  text: string;
  dot: string;
}

export const STATUS_BADGE: Record<string, StatusBadge> = {
  PENDING: { label: "status.pending", text: "text-[#F59E0B]", dot: "bg-[#F59E0B]" },
  IN_PROGRESS: { label: "status.inProgress", text: "text-[#3B82F6]", dot: "bg-[#3B82F6]" },
  DRAFT: { label: "status.inProgress", text: "text-[#3B82F6]", dot: "bg-[#3B82F6]" },
  COMPLETED: { label: "status.completed", text: "text-[#22C55E]", dot: "bg-[#22C55E]" },
  INCOMPLETE: { label: "status.pendingReview", text: "text-[#F59E0B]", dot: "bg-[#F59E0B]" },
  INCOMPLETE_APPROVED: {
    label: "status.incompleteApproved",
    text: "text-[#6B7280]",
    dot: "bg-[#9CA3AF]",
  },
  SKIPPED: {
    label: "status.skipped",
    text: "text-[#6B7280]",
    dot: "bg-[#9CA3AF]",
  },
};

export const FALLBACK_BADGE: StatusBadge = {
  label: "",
  text: "text-[#6B7280]",
  dot: "bg-[#9CA3AF]",
};

export function getStatusBadge(status: string): StatusBadge {
  return STATUS_BADGE[status] ?? { ...FALLBACK_BADGE, label: status };
}

export function isDoneStep(inspection: MyInspection): boolean {
  // 공정과 무관하게 SKIPPED 도 "끝남"으로 인정한다 — 묶음 보고서 여부는 서버가
  // 공정의 bundledReport 로 판단하고, 화면은 그 결과(보고서)만 받는다.
  return (
    inspection.status === "COMPLETED" ||
    inspection.status === "INCOMPLETE_APPROVED" ||
    inspection.status === "SKIPPED"
  );
}
