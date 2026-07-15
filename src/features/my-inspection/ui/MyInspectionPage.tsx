import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import {
  useDeleteInspection,
  useMyInspectionList,
  type DeleteInspectionErrorData,
} from "../api";
import {
  useSlotSequences,
  useStartInspection,
  useStartNextInspection,
} from "../../inspection/api";
import type { StartNextInspectionErrorData } from "../../inspection/type/types";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import type { MyInspection } from "../type/types";
import {
  DATE_FILTERS,
  isWithinDateFilter,
  type DateFilter,
  type Tab,
} from "../lib/inspectionStatus";
import { extractLatestCompletedNext } from "../lib/nextEligible";
import TabBar from "./TabBar";
import PullToRefreshIndicator from "./PullToRefreshIndicator";
import EmptyState from "./EmptyState";
import OrderCard from "./OrderCard";
import LatestCompletedCard from "./LatestCompletedCard";
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
  const [dateFilter, setDateFilter] = useState<DateFilter>("TODAY");

  const inspectionsQuery = useMyInspectionList({ includeFinished: true });
  // 백엔드 실제 슬롯 순서 기반 "다음 시점" 계산기 — 하드코딩 시퀀스와 어긋나도 정확.
  const { getNextSlot } = useSlotSequences();
  const deleteMutation = useDeleteInspection();
  const startNextMutation = useStartNextInspection();
  const [pendingNextPrevId, setPendingNextPrevId] = useState<number | null>(
    null,
  );
  // 완료된 검사를 같은 슬롯으로 "다시 검사" 시작 (새 레코드 생성, 이전 건은 보존).
  const startInspectionMutation = useStartInspection();
  const [pendingRestartId, setPendingRestartId] = useState<number | null>(null);

  const myInspections = useMemo(
    () => inspectionsQuery.data ?? [],
    [inspectionsQuery.data],
  );

  // 날짜 필터를 먼저 적용 — 모든 탭의 카운트도 필터 후 기준.
  const dateFiltered = useMemo(
    () => myInspections.filter((i) => isWithinDateFilter(i, dateFilter)),
    [myInspections, dateFilter],
  );

  const counts = useMemo<Record<Tab, number>>(
    () => ({
      ALL: dateFiltered.length,
      IN_PROGRESS: dateFiltered.filter((i) => i.status === "DRAFT").length,
      COMPLETED: dateFiltered.filter((i) => i.status === "COMPLETED").length,
      INCOMPLETE: dateFiltered.filter(
        (i) => i.status === "INCOMPLETE" || i.status === "INCOMPLETE_APPROVED",
      ).length,
    }),
    [dateFiltered],
  );

  const entries = useMemo(
    () => filterByTab(dateFiltered, tab),
    [dateFiltered, tab],
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

  // "가장 최근 완료" 1건 — 상단 강조 카드로 다음 시점을 바로 시작.
  // 날짜/탭 필터와 무관하게 전체 목록 기준으로 판단(작업 바로가기 성격).
  const latestCompleted = useMemo(
    () => extractLatestCompletedNext(myInspections, getNextSlot),
    [myInspections, getNextSlot],
  );

  const getNextTypeFor = (i: MyInspection): string | null => {
    if (i.status !== "COMPLETED") return null;
    // 상단 강조 카드가 이미 다루는 1건은 카드 내 인라인 버튼 중복 노출을 피한다.
    if (latestCompleted?.previous.inspectionId === i.inspectionId) return null;
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

  const handleRestart = async (inspection: MyInspection) => {
    if (pendingRestartId !== null) return;
    setPendingRestartId(inspection.inspectionId);
    try {
      // 완료돼 있어도 같은 (제품·설비·차수)로 새 검사 생성 — 백엔드가 허용(이전 건 보존).
      const created = await startInspectionMutation.mutateAsync({
        productId: inspection.product.id,
        equipmentId: inspection.equipment.id,
        type: inspection.type,
      });
      navigate(`/inspection/${created.inspectionId}/measure`, {
        state: { inspection: created },
      });
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? ((err.response?.data as { message?: string } | undefined)
              ?.message ?? "다시 검사를 시작하지 못했습니다.")
          : "다시 검사를 시작하지 못했습니다.";
      setToast(msg);
    } finally {
      setPendingRestartId(null);
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
      className="relative flex min-h-dvh flex-col bg-[#F5F5F5] pb-24"
    >
      <div className="sticky top-0 z-10 bg-white">
        <div className="flex items-center gap-1 px-3 pb-1 pt-2">
          {DATE_FILTERS.map((f) => {
            const active = dateFilter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setDateFilter(f.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "bg-[#931B82] text-white"
                    : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
                }`}
              >
                {f.label}
              </button>
            );
          })}
          {dateFilter !== "ALL" && (
            <span className="ml-1 text-[10px] text-[#9CA3AF]">
              미완료는 항상 표시
            </span>
          )}
        </div>
        <TabBar tab={tab} counts={counts} onChange={setTab} />
      </div>
      <PullToRefreshIndicator
        pullY={pullY}
        refreshing={refreshing}
        triggerReady={triggerReady}
      />

      <div className="flex-1 px-4 py-4">
        {latestCompleted && (
          <div className="mb-3">
            <LatestCompletedCard
              previous={latestCompleted.previous}
              nextType={latestCompleted.nextType}
              onStartNext={handleStartNext}
              isStartingNext={
                startNextMutation.isPending &&
                pendingNextPrevId === latestCompleted.previous.inspectionId
              }
            />
          </div>
        )}
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
                onRestart={handleRestart}
                isRestarting={
                  startInspectionMutation.isPending &&
                  pendingRestartId === inspection.inspectionId
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
