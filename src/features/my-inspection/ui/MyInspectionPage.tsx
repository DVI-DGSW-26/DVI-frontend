import { useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useInspectionOrderList } from "../../inspection-orders/api";
import { useMyInspectionList } from "../api";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import type { Tab } from "../lib/inspectionStatus";
import TabBar from "./TabBar";
import PullToRefreshIndicator from "./PullToRefreshIndicator";
import EmptyState from "./EmptyState";
import OrderCard from "./OrderCard";

export default function MyInspectionPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("ALL");

  const ordersQuery = useInspectionOrderList();
  const inspectionsQuery = useMyInspectionList();

  const isLoading = ordersQuery.isLoading || inspectionsQuery.isLoading;
  const isError = ordersQuery.isError || inspectionsQuery.isError;

  const myOrders = useMemo(() => {
    if (!user) return [];
    return (ordersQuery.data ?? []).filter((o) => o.production.id === user.id);
  }, [ordersQuery.data, user]);

  const inspections = inspectionsQuery.data ?? [];

  const counts = useMemo(() => {
    const c: Record<Tab, number> = {
      ALL: myOrders.length,
      PENDING: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
    };
    for (const o of myOrders) {
      if (o.status === "PENDING") c.PENDING += 1;
      else if (o.status === "IN_PROGRESS") c.IN_PROGRESS += 1;
      else if (o.status === "COMPLETED") c.COMPLETED += 1;
    }
    return c;
  }, [myOrders]);

  const filtered = useMemo(() => {
    if (tab === "ALL") return myOrders;
    return myOrders.filter((o) => o.status === tab);
  }, [myOrders, tab]);

  const { scrollRef, pullY, refreshing, triggerReady, bind } = usePullToRefresh({
    onRefresh: () =>
      Promise.all([ordersQuery.refetch(), inspectionsQuery.refetch()]),
  });

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
        ) : filtered.length === 0 ? (
          <EmptyState
            label={
              tab === "ALL"
                ? "배정된 검사 지시가 없습니다."
                : "해당 조건의 검사 지시가 없습니다."
            }
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                inspections={inspections}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
