import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useAuth } from "../../auth/AuthContext";
import { useMyAssignedInspections, useMyInspectionList } from "../api";
import type { MyInspection } from "../type/types";
import TodayPendingCard from "./TodayPendingCard";

export default function ProductionHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // 홈 화면은 종결된 검사 제외 (트래픽 절약). 탭/현황 페이지에서는 includeFinished=true.
  const inspectionsQuery = useMyInspectionList();
  const assignedQuery = useMyAssignedInspections();

  const inspections = useMemo(
    () => inspectionsQuery.data ?? [],
    [inspectionsQuery.data],
  );

  const assignedSlots = useMemo(
    () => assignedQuery.data ?? [],
    [assignedQuery.data],
  );

  const latestDraft: MyInspection | undefined = useMemo(
    () => inspections.find((i) => i.status === "DRAFT"),
    [inspections],
  );

  const handleResume = (inspection: MyInspection) => {
    navigate(`/inspection/${inspection.inspectionId}/measure`, {
      state: { inspection },
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] pb-20">
      <div className="px-4 pt-4">
        <h1 className="text-lg font-semibold text-[#212121]">
          안녕하세요, {user?.name ?? ""}님
        </h1>

        {latestDraft && (
          <button
            type="button"
            onClick={() => handleResume(latestDraft)}
            className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl bg-[#931B82] p-4 text-left text-white shadow-md ring-1 ring-[#6A0F5D]/30 transition-colors hover:bg-[#6A0F5D]"
          >
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-wide text-[#F3E8FF]">
                이어 작업하기
              </div>
              <div className="mt-1 truncate text-base font-semibold text-white">
                {latestDraft.product.name}
              </div>
              <div className="mt-0.5 truncate text-xs text-[#F3E8FF]/90">
                {latestDraft.type} / {latestDraft.typeLabel}
              </div>
            </div>
            <Icon
              icon="solar:arrow-right-linear"
              width={22}
              height={22}
              className="shrink-0 text-white"
            />
          </button>
        )}
      </div>

      <div className="px-4 pt-4">
        <TodayPendingCard slots={assignedSlots} />
      </div>
    </div>
  );
}
