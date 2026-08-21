import { useMemo, useState } from "react";
import { AxiosError } from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import {
  useAssignedCrossChecks,
  useCancelCrossCheck,
  useCreateCrossCheck,
  useMyCrossChecks,
} from "../api";
import type { AssignedInspection, CrossCheckSummary } from "../api";
import { elapsedFrom } from "../lib/elapsed";
import {
  useProcessFlag,
  useProcessLabel,
  useProcessList,
  useProcessOptions,
} from "../../process";
import { countUnprocessed, isTakeoverable } from "../lib/assigned";
import { toCancelErrorMessage } from "../lib/cancelError";
import {
  getStage,
  needsHardnessInput,
  STAGE_BADGE,
  STAGE_LABEL,
} from "../lib/stage";
import { formatDate, formatDateTime } from "../../../lib/datetime";
import {
  TODAY_DATE_FILTER,
  isDateFilterActive,
  matchesDateFilter,
  type DateFilterValue,
} from "../lib/dateFilter";
import CrossCheckCard from "./CrossCheckCard";
import DateRangeFilter from "./DateRangeFilter";
import CheckboxMultiSelect from "../../report/ui/CheckboxMultiSelect";
import { useProcessFilter } from "../lib/processFilter";
import CrossCheckHistoryFilter from "./CrossCheckHistoryFilter";
import {
  EMPTY_HISTORY_FILTER,
  isHistoryFilterActive,
  matchesHistoryFilter,
  type HistoryFilter,
} from "../lib/historyFilter";
import Toast from "../../inspection/ui/Toast";

type Tab = "assigned" | "history";

// 승인 모델 변경으로 초·중 차수는 개별 결재 없이 COMPLETED 로 끝난다 — 이 표에서
// 빠뜨리면 끝난 초·중이 폴백에 걸려 "진행 중"으로 계속 남는다(결재 승인해도 안 없어짐).
const STATUS_BADGE: Record<
  string,
  { label: string; bg: string; fg: string }
> = {
  PENDING_APPROVAL: { label: "결재 대기", bg: "#FEF3C7", fg: "#B45309" },
  COMPLETED: { label: "검사 완료", bg: "#ECFEFF", fg: "#0E7490" },
  APPROVED: { label: "승인", bg: "#ECFDF5", fg: "#15803D" },
  REJECTED: { label: "반려", bg: "#FEF2F2", fg: "#B91C1C" },
  DRAFT: { label: "진행 중", bg: "#F3F4F6", fg: "#6B7280" },
};

// 모르는 상태를 특정 배지로 폴백하면(예전엔 DRAFT="진행 중") 틀린 값이 그럴듯하게 보여
// 알아채기 어렵다. 상태 코드를 그대로 드러내 눈에 띄게 한다.
function statusBadge(status: string) {
  return (
    STATUS_BADGE[status] ?? { label: status, bg: "#F3F4F6", fg: "#6B7280" }
  );
}

const CrossCheckPendingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // 품질시스템현황에서 카운트 카드 클릭 시 ?tab=history|assigned 로 진입.
  const initialTab: Tab = searchParams.get("tab") === "history" ? "history" : "assigned";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [toast, setToast] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<number | null>(null);
  const processLabel = useProcessLabel();
  // 섹션 노출 순서 — 서버 공정 목록 순서를 그대로 쓴다.
  const { data: processes } = useProcessList(true);
  const processOrder = useMemo(
    () => (processes ?? []).map((p) => p.code),
    [processes],
  );
  // 진행중(이어하기) 카드에서 "잘못 선택했음" 취소를 누른 대상. 확인 모달용.
  const [cancelTarget, setCancelTarget] = useState<CrossCheckSummary | null>(
    null,
  );
  // 취소 실패 사유는 모달 안에 띄운다 — 토스트는 모달 오버레이 뒤에 가려 안 보인다.
  const [cancelError, setCancelError] = useState<string | null>(null);
  // 탭별 검사 일시 필터 (할당 대기 / 내 결재 이력 따로 유지).
  // 할당 대기는 진입 시 오늘자 검사만 기본 노출.
  const [assignedFilter, setAssignedFilter] =
    useState<DateFilterValue>(TODAY_DATE_FILTER);
  // 내 결재 이력은 통합관리자 보고서와 동일한 다중 필터(검색어/날짜/공정/제품/상태).
  const [historyFilter, setHistoryFilter] =
    useState<HistoryFilter>(EMPTY_HISTORY_FILTER);

  // 공정 필터는 서버에 보내 목록 자체를 좁힌다(빈 배열이면 전체).
  // 선택 상태는 이 기기의 localStorage 에만 남아 새로고침해도 유지된다.
  const [processFilter, setProcessFilter] = useProcessFilter();
  const processOptions = useProcessOptions();
  const processFilterLabel =
    processFilter.length === 0
      ? "전체 공정"
      : processFilter.length === 1
        ? processLabel(processFilter[0])
        : `공정 ${processFilter.length}개`;

  const {
    data: assigned = [],
    isLoading,
    isError,
    refetch: refetchAssigned,
  } = useAssignedCrossChecks(processFilter);
  const {
    data: myCrossChecks = [],
    isLoading: historyLoading,
    isError: historyError,
  } = useMyCrossChecks(true, processFilter);

  const createMut = useCreateCrossCheck();
  const cancelMut = useCancelCrossCheck();

  const sortedAssigned = useMemo(
    () =>
      [...assigned].sort(
        (a, b) =>
          elapsedFrom(b.completedAt).minutes -
          elapsedFrom(a.completedAt).minutes,
      ),
    [assigned],
  );

  // 공정별로 묶는다 — 각 그룹 안에서는 위 대기시간순 정렬 유지.
  // 섹션 순서는 서버 공정 목록 순서를 따르고, 목록에 없는 공정은 뒤에 붙인다.
  // 내 순회검사 id 전체 — 새 배정 목록에서 중복/잔상 노출 제외용.
  // (내 진행 건은 "진행 중(이어하기)", 완료 건은 "내 결재 이력"에서 보임)
  // ※ 백엔드 assigned 가 완료(PENDING_APPROVAL 등)된 건도 IN_PROGRESS 로 계속 반환하는
  //   버그가 있어, 내가 시작한 건(상태 무관)은 새 배정 목록에서 숨긴다.
  const myCrossCheckIds = useMemo(
    () => new Set(myCrossChecks.map((c) => c.crossCheckId)),
    [myCrossChecks],
  );

  const filteredAssigned = useMemo(
    () =>
      sortedAssigned.filter(
        (i) =>
          // inspectionTime 은 표시/스케줄용이라 신뢰도가 낮다(값이 비거나 파싱 불가하면
          // 필터가 전부 통과시켜 "기간별이 안 먹는" 것처럼 보임). 실제 서버 타임스탬프
          // (completedAt=자주검사 완료 시각)를 기준으로 필터링한다.
          matchesDateFilter(
            i.completedAt ?? i.createdAt ?? i.inspectionTime,
            assignedFilter,
          ) &&
          !(
            i.status === "IN_PROGRESS" &&
            i.crossCheckId != null &&
            myCrossCheckIds.has(i.crossCheckId)
          ),
      ),
    [sortedAssigned, assignedFilter, myCrossCheckIds],
  );

  const assignedGroups = useMemo(() => {
    const map = new Map<string, AssignedInspection[]>();
    for (const item of filteredAssigned) {
      const list = map.get(item.process) ?? [];
      list.push(item);
      map.set(item.process, list);
    }
    const ordered = [
      ...processOrder.filter((p) => map.has(p)),
      ...[...map.keys()].filter((p) => !processOrder.includes(p)),
    ];
    return ordered.map((process) => ({
      process,
      items: map.get(process) ?? [],
    }));
  }, [filteredAssigned, processOrder]);

  // 결재 요청 이력: DRAFT 제외 (DRAFT 는 측정 중 — 할당 대기 탭에서 이어하기로 노출)
  const history = useMemo(
    () =>
      myCrossChecks
        .filter((c) => c.status !== "DRAFT")
        .sort(
          (a, b) =>
            new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() -
            new Date(a.updatedAt ?? a.createdAt ?? 0).getTime(),
        ),
    [myCrossChecks],
  );

  const filteredHistory = useMemo(
    () => history.filter((c) => matchesHistoryFilter(c, historyFilter)),
    [history, historyFilter],
  );

  // 진행 중(이어하기) — DRAFT 상태인 본인 cross-check. 측정 페이지 뒤로가기 후에도
  // 할당 대기 탭에서 사라지지 않게 함께 노출.
  const draftInProgress = useMemo(
    () =>
      myCrossChecks
        .filter((c) => c.status === "DRAFT")
        .sort(
          (a, b) =>
            new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() -
            new Date(a.updatedAt ?? a.createdAt ?? 0).getTime(),
        ),
    [myCrossChecks],
  );

  // 상단 요약(구 품질 시스템 현황) — 미처리(배정 대기)/완료/진행중(DRAFT) 누적 집계.
  // 미처리는 아래 목록과 같은 대상을 세야 하므로 filteredAssigned(날짜 필터·본인 진행건
  // 제외 반영) 기준. 여기서 다시 남이 잡고 있는 IN_PROGRESS 를 걷어내 "지금 시작(또는
  // 이어받기) 가능한 건"만 남긴다.
  //
  // "완료" 는 APPROVED 만 세면 안 된다 — 승인 모델 변경으로 초·중 차수는 개별 결재 없이
  // COMPLETED 로 끝나므로 영영 APPROVED 가 되지 않는다. 종 차수만 잡혀 실제로 끝낸
  // 검사의 일부만 집계됐다.
  const statCounts = useMemo(() => {
    let done = 0;
    let draft = 0;
    for (const c of myCrossChecks) {
      if (c.status === "APPROVED" || c.status === "COMPLETED") done++;
      else if (c.status === "DRAFT") draft++;
    }
    return { pending: countUnprocessed(filteredAssigned), done, draft };
  }, [myCrossChecks, filteredAssigned]);

  const handleResumeClick = (cc: CrossCheckSummary) => {
    navigate(`/cross-check/${cc.crossCheckId}/measure`);
  };

  const handleCardClick = async (item: AssignedInspection) => {
    if (createMut.isPending) return;
    // 담당자가 살아있는 진행 중 건은 시작 불가 (카드도 비활성이지만 방어).
    // 취소로 담당이 빠진 건(isTakeoverable)은 같은 inspectionId 로 POST 해서 이어받는다.
    if (item.status === "IN_PROGRESS" && !isTakeoverable(item)) return;
    setStartingId(item.inspectionId);
    try {
      const detail = await createMut.mutateAsync({
        inspectionId: item.inspectionId,
      });
      navigate(`/cross-check/${detail.crossCheckId}/measure`);
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? err.response?.data?.message ??
            "이미 다른 담당자가 진행 중이거나 시작에 실패했습니다."
          : "순회검사 시작에 실패했습니다.";
      setToast(msg);
      // 그새 다른 담당자가 선점했을 수 있으니 목록 새로고침.
      void refetchAssigned();
    } finally {
      setStartingId(null);
    }
  };

  const openCancel = (cc: CrossCheckSummary) => {
    setCancelError(null);
    setCancelTarget(cc);
  };

  const closeCancel = () => {
    if (cancelMut.isPending) return;
    setCancelError(null);
    setCancelTarget(null);
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelError(null);
    try {
      await cancelMut.mutateAsync(cancelTarget.crossCheckId);
      setCancelTarget(null);
    } catch (err) {
      // 실패해도 모달은 열어둔다 — 사유를 읽고 "닫기"로 측정을 이어갈 수 있게.
      setCancelError(toCancelErrorMessage(err));
    }
  };

  const handleHistoryClick = (cc: CrossCheckSummary) => {
    // 상세 = 결재 화면(읽기 위주). 본인 요청 건도 같은 화면에서 결과 확인.
    navigate(`/cross-check-approval/${cc.crossCheckId}`);
  };

  return (
    <div className="flex min-h-full flex-col gap-3 bg-[#F5F5F5] px-4 pb-21 pt-4">
      {/* 요약 통계 — 미처리/완료/진행중. 클릭 시 해당 탭으로 이동. */}
      <section className="grid grid-cols-3 gap-2">
        <SummaryStat
          label="미처리"
          value={statCounts.pending}
          icon="solar:danger-triangle-bold"
          accent="#931B82"
          iconBg="#F3E8F7"
          onClick={() => setTab("assigned")}
        />
        <SummaryStat
          label="완료"
          value={statCounts.done}
          icon="solar:check-circle-bold"
          accent="#22C55E"
          iconBg="#DCFCE7"
          onClick={() => setTab("history")}
        />
        <SummaryStat
          label="진행중"
          value={statCounts.draft}
          icon="solar:pen-bold"
          accent="#3B82F6"
          iconBg="#DBEAFE"
          onClick={() => setTab("assigned")}
        />
      </section>

      <div
        role="tablist"
        aria-label="순회검사 목록"
        className="grid grid-cols-2 gap-1 rounded-xl bg-white p-1 shadow-sm"
      >
        <TabButton
          active={tab === "assigned"}
          onClick={() => setTab("assigned")}
          label="할당 대기"
          count={sortedAssigned.length}
        />
        <TabButton
          active={tab === "history"}
          onClick={() => setTab("history")}
          label="내 결재 이력"
          count={history.length}
        />
      </div>

      {tab === "assigned" && (
        <>
          {draftInProgress.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold text-[#6B7280]">
                진행 중 (이어하기)
              </h2>
              <ul className="flex flex-col gap-3">
                {draftInProgress.map((cc) => (
                  <li key={cc.crossCheckId}>
                    <DraftResumeCard
                      cc={cc}
                      onClick={() => handleResumeClick(cc)}
                      onCancel={() => openCancel(cc)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[#6B7280]">새 배정</h2>
            <span className="inline-block rounded-full bg-[#F3F4F6] px-3 py-1 text-xs font-medium text-[#6B7280]">
              대기시간순
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CheckboxMultiSelect
              label={processFilterLabel}
              options={processOptions}
              value={processFilter}
              onChange={setProcessFilter}
              width="w-36"
            />
            {!isLoading && !isError && sortedAssigned.length > 0 && (
              <DateRangeFilter
                value={assignedFilter}
                onChange={setAssignedFilter}
              />
            )}
          </div>

          {isLoading && (
            <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
              불러오는 중...
            </p>
          )}

          {isError && (
            <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#EF4444]">
              목록을 불러오지 못했습니다.
            </p>
          )}

          {!isLoading && !isError && sortedAssigned.length === 0 && (
            <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
              {processFilter.length > 0
                ? "선택한 공정에 새 배정이 없습니다."
                : "새 배정이 없습니다."}
            </p>
          )}

          {!isLoading &&
            !isError &&
            sortedAssigned.length > 0 &&
            filteredAssigned.length === 0 && (
              <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
                {isDateFilterActive(assignedFilter)
                  ? "선택한 기간에 해당하는 검사가 없습니다."
                  : "새 배정이 없습니다."}
              </p>
            )}

          {!isLoading && !isError && filteredAssigned.length > 0 && (
            <div className="flex flex-col gap-5">
              {assignedGroups.map((group) => (
                <section key={group.process} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#212121]">
                      {processLabel(group.process)}
                    </h3>
                    <span className="inline-block rounded-full bg-[#F3E8F7] px-2 py-0.5 text-xs font-medium text-[#931B82]">
                      {group.items.length}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-3">
                    {group.items.map((item) => (
                      <li key={item.inspectionId}>
                        <CrossCheckCard
                          item={item}
                          onClick={handleCardClick}
                          isStarting={startingId === item.inspectionId}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "history" && (
        <>
          {!historyLoading && !historyError && history.length > 0 && (
            <CrossCheckHistoryFilter items={history} onChange={setHistoryFilter} />
          )}

          {historyLoading && (
            <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
              불러오는 중...
            </p>
          )}

          {historyError && (
            <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#EF4444]">
              이력을 불러오지 못했습니다.
            </p>
          )}

          {!historyLoading && !historyError && history.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-16 text-center">
              <Icon
                icon="solar:document-text-linear"
                width={36}
                height={36}
                className="text-[#A8A8A8]"
              />
              <span className="text-sm font-medium text-[#212121]">
                결재 요청한 내역이 없습니다
              </span>
              <span className="text-xs text-[#6B7280]">
                순회검사 결재 요청을 보내면 여기에 표시됩니다
              </span>
            </div>
          )}

          {!historyLoading &&
            !historyError &&
            history.length > 0 &&
            filteredHistory.length === 0 && (
              <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#A8A8A8]">
                {isHistoryFilterActive(historyFilter)
                  ? "조건에 맞는 이력이 없습니다."
                  : "결재 요청한 내역이 없습니다."}
              </p>
            )}

          {!historyLoading && !historyError && filteredHistory.length > 0 && (
            <ul className="flex flex-col gap-3">
              {filteredHistory.map((cc) => (
                <li key={cc.crossCheckId}>
                  <HistoryCard cc={cc} onClick={() => handleHistoryClick(cc)} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {cancelTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={closeCancel}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl"
          >
            <h3 className="text-base font-semibold text-[#212121]">
              순회검사 취소
            </h3>
            <p className="mt-1 text-xs text-[#6B7280]">
              <span className="font-semibold text-[#212121]">
                {cancelTarget.product.name}
              </span>{" "}
              · 자주검사자{" "}
              <span className="font-semibold text-[#212121]">
                {cancelTarget.production.name}
              </span>{" "}
              건의 담당을 해제합니다. 다른 검사자가 이어받을 수 있으며, 입력한
              측정값은 보존됩니다. (작업자에게 재측정 요청이 가지 않습니다.)
            </p>
            {cancelError && (
              <p className="mt-3 rounded-md bg-[#FEF2F2] px-3 py-2 text-xs font-medium text-[#B91C1C]">
                {cancelError}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={closeCancel}
                disabled={cancelMut.isPending}
                className="h-11 flex-1 rounded-md border border-[#E5E7EB] bg-white text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-60"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={cancelMut.isPending}
                className="h-11 flex-1 rounded-md bg-[#931B82] text-sm font-semibold text-white transition-colors hover:bg-[#6A0F5D] disabled:bg-[#D1D5DB]"
              >
                {cancelMut.isPending ? "취소 중..." : "취소 확정"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
};

function SummaryStat({
  label,
  value,
  icon,
  accent,
  iconBg,
  onClick,
}: {
  label: string;
  value: number;
  icon: string;
  accent: string;
  iconBg: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-2 rounded-2xl bg-white px-3 py-3 text-left shadow-sm transition-transform active:scale-[0.98]"
    >
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: iconBg }}
      >
        <Icon icon={icon} width={18} height={18} color={accent} />
      </span>
      <span className="text-xs text-[#A8A8A8]">{label}</span>
      <span className="text-2xl font-bold text-[#212121]">{value}</span>
    </button>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`h-10 rounded-lg text-sm font-semibold transition-colors ${
        active
          ? "bg-[#931B82] text-white"
          : "bg-transparent text-[#6B7280] hover:bg-[#F3F4F6]"
      }`}
    >
      {label}{" "}
      <span
        className={`ml-1 text-xs ${active ? "text-white/80" : "text-[#9CA3AF]"}`}
      >
        {count}
      </span>
    </button>
  );
}

function DraftResumeCard({
  cc,
  onClick,
  onCancel,
}: {
  cc: CrossCheckSummary;
  onClick: () => void;
  onCancel: () => void;
}) {
  const hardnessTracked = useProcessFlag("hardnessTracked");
  // 카드 전체가 "이어하기" 버튼이므로, 취소 버튼은 중첩(button 안 button)이 되지
  // 않도록 형제 요소로 분리하고 relative 컨테이너 위에 얹는다.
  const stage = getStage(cc.type, cc.product.process);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-2xl border border-[#931B82] bg-[#FDF7FB] px-5 py-4 pr-14 text-left shadow-sm transition-colors hover:bg-[#F3E8FF]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {stage && (
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STAGE_BADGE[stage]}`}
              >
                {STAGE_LABEL[stage]}
              </span>
            )}
            <span className="wrap-break-word text-base font-bold text-[#212121]">
              {cc.product.name}
            </span>
            <span className="rounded-md bg-[#931B82] px-2 py-0.5 text-[10px] font-semibold text-white">
              이어하기
            </span>
            {needsHardnessInput(cc, hardnessTracked(cc.product.process)) && (
              <span className="rounded-md bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#B45309]">
                경도 입력 필요
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <Icon
              icon="solar:user-circle-linear"
              width={16}
              height={16}
              className="text-[#A8A8A8]"
            />
            <span className="truncate text-sm text-[#6B7280]">
              {cc.production.name}
            </span>
          </div>
          <span className="mt-2 block truncate text-xs text-[#A8A8A8]">
            검사 차수: {cc.typeLabel}
          </span>
          <span className="mt-1 block truncate text-xs text-[#A8A8A8]">
            설비: {cc.equipment.name}
          </span>
          <span className="mt-1 block truncate text-xs text-[#A8A8A8]">
            시작일: {formatDate(cc.createdAt)}
          </span>
        </div>
        <Icon
          icon="solar:alt-arrow-right-linear"
          width={20}
          height={20}
          className="shrink-0 text-[#931B82]"
        />
      </button>
      <button
        type="button"
        onClick={onCancel}
        aria-label="순회검사 취소"
        className="absolute right-2 top-2 rounded-md border border-[#E5E7EB] bg-white/90 px-2 py-1 text-[11px] font-semibold text-[#6B7280] shadow-sm transition-colors hover:bg-[#F3F4F6]"
      >
        취소
      </button>
    </div>
  );
}

function HistoryCard({
  cc,
  onClick,
}: {
  cc: CrossCheckSummary;
  onClick: () => void;
}) {
  const processLabel = useProcessLabel();
  const badge = statusBadge(cc.status);
  const stage = getStage(cc.type, cc.product.process);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-stretch gap-4 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-[#931B82] hover:bg-[#FDF7FB]"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {stage && (
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STAGE_BADGE[stage]}`}
            >
              {STAGE_LABEL[stage]}
            </span>
          )}
          <span className="wrap-break-word text-base font-semibold text-[#212121]">
            {cc.product.name}
          </span>
          <span
            className="rounded-md px-2 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: badge.bg, color: badge.fg }}
          >
            {badge.label}
          </span>
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <InfoLine
            label="공정"
            value={processLabel(cc.product.process)}
          />
          <InfoLine label="설비" value={cc.equipment.name} />
          <InfoLine label="검사 차수" value={`${cc.typeLabel} (${cc.type})`} />
          <InfoLine label="시작일" value={formatDate(cc.createdAt)} />
          <InfoLine
            className="col-span-2"
            label="업데이트"
            value={formatDateTime(cc.updatedAt ?? cc.createdAt)}
          />
        </dl>
      </div>
      <div className="flex shrink-0 items-center text-[#931B82]">
        <Icon icon="solar:alt-arrow-right-linear" width={20} height={20} />
      </div>
    </button>
  );
}

function InfoLine({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 text-[#6B7280] ${className ?? ""}`}
    >
      <span className="shrink-0">{label}</span>
      <span className="ml-auto min-w-0 truncate text-right text-[#212121]">
        {value}
      </span>
    </div>
  );
}

export default CrossCheckPendingPage;
