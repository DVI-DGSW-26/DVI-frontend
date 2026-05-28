import type { MyInspection } from "../type/types";

// /inspection/assigned 제거 이후 탭 구성: 전체 / 진행 중 / 완료 / 미완료.
// INCOMPLETE 탭은 status === "INCOMPLETE" || "INCOMPLETE_APPROVED" 둘 다 포함.
export type Tab = "ALL" | "IN_PROGRESS" | "COMPLETED" | "INCOMPLETE";

export const TABS: { key: Tab; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "IN_PROGRESS", label: "진행 중" },
  { key: "COMPLETED", label: "완료" },
  { key: "INCOMPLETE", label: "미완료" },
];

// 누적되는 리스트 정리를 위한 날짜 필터. "TODAY"가 기본 — 하루 지난 완료 건은 숨김.
// 미완료(INCOMPLETE/INCOMPLETE_APPROVED) 는 사용자 요구상 항상 노출.
export type DateFilter = "TODAY" | "WEEK" | "ALL";

export const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: "TODAY", label: "오늘" },
  { key: "WEEK", label: "이번주" },
  { key: "ALL", label: "전체" },
];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? 6 : day - 1; // 월요일 시작
  x.setDate(x.getDate() - diff);
  return x;
}

export function isWithinDateFilter(
  inspection: MyInspection,
  filter: DateFilter,
): boolean {
  if (filter === "ALL") return true;
  // 미완료는 날짜 무시하고 항상 노출 (피드백: "미완료는 남겨야겠지만")
  if (
    inspection.status === "INCOMPLETE" ||
    inspection.status === "INCOMPLETE_APPROVED"
  ) {
    return true;
  }
  // 백엔드가 날짜 필드를 안 보내면 안전하게 통과 — 기존 누적 동작 유지
  const iso =
    inspection.completedAt ?? inspection.updatedAt ?? inspection.createdAt;
  if (!iso) return true;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return true;
  const now = new Date();
  const from =
    filter === "TODAY"
      ? startOfDay(now).getTime()
      : startOfWeek(now).getTime();
  return t >= from;
}

export interface StatusBadge {
  label: string;
  text: string;
  dot: string;
}

export const STATUS_BADGE: Record<string, StatusBadge> = {
  PENDING: { label: "대기", text: "text-[#F59E0B]", dot: "bg-[#F59E0B]" },
  IN_PROGRESS: { label: "진행 중", text: "text-[#3B82F6]", dot: "bg-[#3B82F6]" },
  DRAFT: { label: "진행 중", text: "text-[#3B82F6]", dot: "bg-[#3B82F6]" },
  COMPLETED: { label: "완료", text: "text-[#22C55E]", dot: "bg-[#22C55E]" },
  INCOMPLETE: { label: "검토 대기", text: "text-[#F59E0B]", dot: "bg-[#F59E0B]" },
  INCOMPLETE_APPROVED: {
    label: "미완료 승인됨",
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
  return (
    inspection.status === "COMPLETED" ||
    inspection.status === "INCOMPLETE_APPROVED"
  );
}
