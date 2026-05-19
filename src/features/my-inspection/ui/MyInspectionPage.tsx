import { useMemo, useState } from "react";
import { useMyAssignedInspections, useMyInspectionList } from "../api";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import type { Tab } from "../lib/inspectionStatus";
import TabBar from "./TabBar";
import PullToRefreshIndicator from "./PullToRefreshIndicator";
import EmptyState from "./EmptyState";
import OrderCard, { type SlotEntry } from "./OrderCard";

export default function MyInspectionPage() {
  const [tab, setTab] = useState<Tab>("ALL");

  const inspectionsQuery = useMyInspectionList({ includeFinished: true });
  const assignedQuery = useMyAssignedInspections();

  const isLoading = inspectionsQuery.isLoading || assignedQuery.isLoading;
  const isError = inspectionsQuery.isError || assignedQuery.isError;

  const myInspections = useMemo(
    () => inspectionsQuery.data ?? [],
    [inspectionsQuery.data],
  );
  const assignedSlots = useMemo(
    () => assignedQuery.data ?? [],
    [assignedQuery.data],
  );

  const counts = useMemo<Record<Tab, number>>(() => {
    return {
      ALL: assignedSlots.length + myInspections.length,
      PENDING: assignedSlots.length,
      IN_PROGRESS: myInspections.filter((i) => i.status === "DRAFT").length,
      COMPLETED: myInspections.filter((i) => i.status === "COMPLETED").length,
    };
  }, [assignedSlots, myInspections]);

  const entries = useMemo<SlotEntry[]>(() => {
    const assignedEntries: SlotEntry[] = assignedSlots.map((slot) => ({
      kind: "assigned",
      slot,
    }));
    const myEntries: SlotEntry[] = myInspections.map((inspection) => ({
      kind: "my",
      inspection,
    }));
    if (tab === "ALL") return [...assignedEntries, ...myEntries];
    if (tab === "PENDING") return assignedEntries;
    if (tab === "IN_PROGRESS")
      return myEntries.filter(
        (e) => e.kind === "my" && e.inspection.status === "DRAFT",
      );
    if (tab === "COMPLETED")
      return myEntries.filter(
        (e) => e.kind === "my" && e.inspection.status === "COMPLETED",
      );
    return [];
  }, [tab, assignedSlots, myInspections]);

  const { scrollRef, pullY, refreshing, triggerReady, bind } = usePullToRefresh(
    {
      onRefresh: () =>
        Promise.all([assignedQuery.refetch(), inspectionsQuery.refetch()]),
    },
  );

  return (
    <div
      ref={scrollRef}
      {...bind}
      className="flex min-h-screen flex-col bg-[#F5F5F5] pb-20"
    >
      <TabBar tab={tab} counts={counts} onChange={setTab} />
      <PullToRefreshIndicator
        pullY={pullY}
        refreshing={refreshing}
        triggerReady={triggerReady}
      />

      <div className="flex-1 px-4 py-4">
        {isLoading ? (
          <EmptyState label="불러오는 중..." />
        ) : isError ? (
          <EmptyState label="목록을 불러오지 못했습니다." error />
        ) : entries.length === 0 ? (
          <EmptyState
            label={
              tab === "ALL"
                ? "배정된 검사가 없습니다."
                : "해당 조건의 검사가 없습니다."
            }
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {entries.map((entry) => (
              <OrderCard key={entryKey(entry)} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function entryKey(entry: SlotEntry): string {
  return entry.kind === "assigned"
    ? `a-${entry.slot.orderId}-${entry.slot.type}`
    : `m-${entry.inspection.inspectionId}`;
}
