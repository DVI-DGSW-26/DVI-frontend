import type { MyInspection } from "../type/types";

export type Tab = "ALL" | "PENDING" | "IN_PROGRESS" | "COMPLETED";

export const TABS: { key: Tab; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "PENDING", label: "대기" },
  { key: "IN_PROGRESS", label: "진행 중" },
  { key: "COMPLETED", label: "완료" },
];

export interface StatusBadge {
  label: string;
  text: string;
  dot: string;
}

export const STATUS_BADGE: Record<string, StatusBadge> = {
  PENDING: { label: "대기", text: "text-[#F59E0B]", dot: "bg-[#F59E0B]" },
  IN_PROGRESS: { label: "진행 중", text: "text-[#3B82F6]", dot: "bg-[#3B82F6]" },
  COMPLETED: { label: "완료", text: "text-[#22C55E]", dot: "bg-[#22C55E]" },
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
