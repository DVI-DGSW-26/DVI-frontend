import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import {
  useDeleteInspection,
  useMyInspectionList,
  type DeleteInspectionErrorData,
} from "../api";
import { useStartNextInspection } from "../../inspection/api";
import { getNextSlot } from "../../inspection/lib/slotSequence";
import type { StartNextInspectionErrorData } from "../../inspection/type/types";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import type { MyInspection } from "../type/types";
import type { Tab } from "../lib/inspectionStatus";
import TabBar from "./TabBar";
import PullToRefreshIndicator from "./PullToRefreshIndicator";
import EmptyState from "./EmptyState";
import OrderCard from "./OrderCard";
import DeleteInspectionModal from "./DeleteInspectionModal";
import Toast from "../../inspection/ui/Toast";

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
  const [deleteTarget, setDeleteTarget] = useState<MyInspection | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const inspectionsQuery = useMyInspectionList({ includeFinished: true });
  const deleteMutation = useDeleteInspection();
  const startNextMutation = useStartNextInspection();
  const [pendingNextPrevId, setPendingNextPrevId] = useState<number | null>(
    null,
  );

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

  // 같은 (productId, equipmentId, type) 조합이 이미 있는 경우(=다음 시점 이미 시작/SKIPPED) "다음 시점 시작" 노출 안 함.
  const occupiedSlotKeys = useMemo(() => {
    const set = new Set<string>();
    for (const i of myInspections) {
      set.add(`${i.product.id}-${i.equipment.id}-${i.type}`);
    }
    return set;
  }, [myInspections]);

  const getNextTypeFor = (i: MyInspection): string | null => {
    if (i.status !== "COMPLETED") return null;
    const next = getNextSlot(i.product.process, i.type);
    if (!next) return null;
    // 이미 다음 시점이 시작되어 있으면 노출하지 않음.
    if (occupiedSlotKeys.has(`${i.product.id}-${i.equipment.id}-${next}`))
      return null;
    return next;
  };

  const handleStartNext = async (previous: MyInspection) => {
    setPendingNextPrevId(previous.inspectionId);
    try {
      const next = await startNextMutation.mutateAsync(previous.inspectionId);
      navigate(`/inspection/${next.inspectionId}/measure`, {
        state: { inspection: next },
      });
    } catch (err) {
      if (err instanceof AxiosError) {
        const data = err.response?.data as
          | StartNextInspectionErrorData
          | undefined;
        const code = data?.code;
        if (code === "NO_NEXT_SLOT") {
          setToast("마지막 시점입니다.");
        } else if (code === "PREVIOUS_INSPECTION_NOT_COMPLETED") {
          setToast("이전 검사를 먼저 완료해주세요.");
        } else if (code === "INSPECTION_ALREADY_EXISTS") {
          setToast("이미 시작된 시점입니다.");
        } else {
          setToast(data?.message ?? "다음 시점을 시작하지 못했습니다.");
        }
      } else {
        setToast("다음 시점을 시작하지 못했습니다.");
      }
    } finally {
      setPendingNextPrevId(null);
    }
  };

  const handleRequestDelete = (inspection: MyInspection) => {
    setDeleteTarget(inspection);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.inspectionId);
      setDeleteTarget(null);
      setToast("검사가 삭제되었습니다.");
    } catch (err) {
      if (err instanceof AxiosError) {
        const data = err.response?.data as
          | DeleteInspectionErrorData
          | undefined;
        const code = data?.code;
        const status = err.response?.status;
        setDeleteTarget(null);
        if (code === "INSPECTION_NOT_DELETABLE" || status === 400) {
          setToast("이미 처리된 검사는 삭제할 수 없습니다.");
          return;
        }
        if (code === "NOT_OWNER" || status === 403) {
          setToast("본인이 시작한 검사만 삭제할 수 있습니다.");
          return;
        }
      }
      setDeleteTarget(null);
      setToast("검사를 삭제하지 못했습니다.");
    }
  };

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
              <OrderCard
                key={inspection.inspectionId}
                inspection={inspection}
                onRequestDelete={handleRequestDelete}
                nextType={getNextTypeFor(inspection)}
                onStartNext={handleStartNext}
                isStartingNext={
                  startNextMutation.isPending &&
                  pendingNextPrevId === inspection.inspectionId
                }
              />
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

      <DeleteInspectionModal
        open={!!deleteTarget}
        isSubmitting={deleteMutation.isPending}
        onCancel={() => {
          if (deleteMutation.isPending) return;
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
      />

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
