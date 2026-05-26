import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useMyInspectionList } from "../api";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import type { MyInspection } from "../type/types";
import type { Tab } from "../lib/inspectionStatus";
import TabBar from "./TabBar";
import PullToRefreshIndicator from "./PullToRefreshIndicator";
import EmptyState from "./EmptyState";
import OrderCard from "./OrderCard";

// /inspection/my?includeFinished=true 단일 호출. 탭 전환은 클라이언트 필터링.
function filterByTab(inspections: MyInspection[], tab: Tab): MyInspection[] {
  switch (tab) {
    case "IN_PROGRESS":
      return inspections.filter((i) => i.status === "DRAFT");
    case "COMPLETED":
      return inspections.filter((i) => i.status === "COMPLETED");
    case "INCOMPLETE":
      return inspections.filter(
        (i) => i.status === "INCOMPLETE" || i.status === "INCOMPLETE_APPROVED",
      );
    case "ALL":
    default:
      return inspections;
  }
}

export default function MyInspectionPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("ALL");

  const inspectionsQuery = useMyInspectionList({ includeFinished: true });

  const myInspections = useMemo(
    () => inspectionsQuery.data ?? [],
    [inspectionsQuery.data],
  );

  const counts = useMemo<Record<Tab, number>>(
    () => ({
      ALL: myInspections.length,
      IN_PROGRESS: myInspections.filter((i) => i.status === "DRAFT").length,
      COMPLETED: myInspections.filter((i) => i.status === "COMPLETED").length,
      INCOMPLETE: myInspections.filter(
        (i) => i.status === "INCOMPLETE" || i.status === "INCOMPLETE_APPROVED",
      ).length,
    }),
    [myInspections],
  );

  const entries = useMemo(
    () => filterByTab(myInspections, tab),
    [myInspections, tab],
  );

  const { scrollRef, pullY, refreshing, triggerReady, bind } = usePullToRefresh(
    { onRefresh: () => inspectionsQuery.refetch() },
  );

  return (
    <div
      ref={scrollRef}
      {...bind}
      className="relative flex min-h-screen flex-col bg-[#F5F5F5] pb-24"
    >
      <TabBar tab={tab} counts={counts} onChange={setTab} />
      <PullToRefreshIndicator
        pullY={pullY}
        refreshing={refreshing}
        triggerReady={triggerReady}
      />

      <div className="flex-1 px-4 py-4">
        {inspectionsQuery.isLoading ? (
          <EmptyState label="불러오는 중..." />
        ) : inspectionsQuery.isError ? (
          <EmptyState label="목록을 불러오지 못했습니다." error />
        ) : entries.length === 0 ? (
          <EmptyState
            label={
              tab === "ALL"
                ? "검사가 없습니다."
                : "해당 조건의 검사가 없습니다."
            }
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {entries.map((inspection) => (
              <OrderCard key={inspection.inspectionId} inspection={inspection} />
            ))}
          </div>
        )}
      </div>

      {/* 새 검사 시작 — 어떤 탭에서든 노출되는 floating CTA. */}
      <button
        type="button"
        onClick={() => navigate("/start-inspection")}
        aria-label="새 검사 시작"
        className="fixed bottom-24 right-4 z-20 flex h-14 items-center gap-2 rounded-full bg-[#931B82] pl-4 pr-5 text-white shadow-lg ring-1 ring-[#6A0F5D]/40 transition-colors hover:bg-[#6A0F5D]"
      >
        <Icon icon="solar:add-circle-bold" width={22} height={22} />
        <span className="text-sm font-semibold">검사 시작</span>
      </button>
    </div>
  );
}
